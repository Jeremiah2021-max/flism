import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

interface TrustData {
  score: number; tier: string; next_tier_score: number;
  loan_limit: string; is_verified: boolean; is_kyc_complete: boolean;
  stats: { total_loans: number; repaid_loans: number; defaulted_loans: number; approved_assets: number };
  factors: { name: string; points: number; max: number }[];
}

const TIER_COLORS: Record<string, { grad: [string, string]; color: string }> = {
  Bronze:   { grad: ['#8B4513', '#CD7F32'], color: '#CD7F32' },
  Silver:   { grad: ['#708090', '#C0C0C0'], color: '#A8A8A8' },
  Gold:     { grad: ['#B8860B', '#FFD700'], color: '#FFD700' },
  Platinum: { grad: ['#003EC7', '#00C6E0'], color: '#00C6E0' },
};

export default function TrustScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/trust'],
    queryFn: () => apiGet<TrustData>('/api/trust'),
  });

  const tierConfig = TIER_COLORS[data?.tier ?? 'Bronze'];
  const scoreProgress = data ? data.score / data.next_tier_score : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
    >
      {/* Hero */}
      <LinearGradient
        colors={tierConfig?.grad ?? ['#003EC7', '#0052FF']}
        style={[styles.hero, { paddingTop: topPad + 24 }]}
      >
        <Text style={styles.heroLabel}>Trust Score</Text>
        <Text style={styles.heroScore}>{data?.score ?? '—'}</Text>
        <View style={styles.tierBadge}>
          <Ionicons name="star" size={14} color={tierConfig?.color ?? '#fff'} />
          <Text style={styles.tierText}>{data?.tier ?? 'Bronze'} Tier</Text>
        </View>

        <View style={[styles.progressTrack]}>
          <View style={[styles.progressFill, { width: `${Math.min(scoreProgress * 100, 100)}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>
          {data?.score ?? 0} / {data?.next_tier_score ?? 200} to next tier
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Stats */}
        <View style={[styles.statsGrid]}>
          {[
            { label: 'Total Loans', value: data?.stats.total_loans ?? 0, icon: 'cash-outline', color: colors.primaryContainer },
            { label: 'Repaid', value: data?.stats.repaid_loans ?? 0, icon: 'checkmark-circle-outline', color: '#006875' },
            { label: 'Defaults', value: data?.stats.defaulted_loans ?? 0, icon: 'close-circle-outline', color: colors.error },
            { label: 'Assets', value: data?.stats.approved_assets ?? 0, icon: 'shield-checkmark-outline', color: '#7B4F00' },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Verification status */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Verification Status</Text>
          <StatusRow label="KYC Completed" done={!!data?.is_kyc_complete} colors={colors} points={50} />
          <StatusRow label="Identity Verified" done={!!data?.is_verified} colors={colors} points={30} />
          <StatusRow label="Student ID Verified" done={false} colors={colors} points={20} />
        </View>

        {/* Score factors */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Score Breakdown</Text>
          {(data?.factors ?? []).map(f => (
            <View key={f.name} style={styles.factorRow}>
              <View style={styles.factorLabel}>
                <Text style={[styles.factorName, { color: colors.foreground }]}>{f.name}</Text>
                <Text style={[styles.factorPoints, { color: colors.primaryContainer }]}>{f.points}/{f.max} pts</Text>
              </View>
              <View style={[styles.factorBar, { backgroundColor: colors.border }]}>
                <View style={[styles.factorFill, { width: `${(f.points / f.max) * 100}%` as any, backgroundColor: f.points === f.max ? '#006875' : colors.primaryContainer }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Tier benefits */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Tier Benefits</Text>
          {[
            { tier: 'Bronze (0–199)', benefit: 'Loans up to GHS 300, 5% interest' },
            { tier: 'Silver (200–299)', benefit: 'Loans up to GHS 600, 4.5% interest' },
            { tier: 'Gold (300–399)', benefit: 'Loans up to GHS 1,500, 3.5% interest' },
            { tier: 'Platinum (400–500)', benefit: 'Loans up to GHS 5,000, 2% interest' },
          ].map(b => (
            <View key={b.tier} style={[styles.benefitRow, { borderLeftColor: data?.tier && b.tier.startsWith(data.tier) ? colors.primaryContainer : colors.border }]}>
              <Text style={[styles.benefitTier, { color: data?.tier && b.tier.startsWith(data.tier) ? colors.primaryContainer : colors.foreground }]}>{b.tier}</Text>
              <Text style={[styles.benefitDesc, { color: colors.muted }]}>{b.benefit}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function StatusRow({ label, done, colors, points }: any) {
  return (
    <View style={styles.statusRow}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? '#006875' : colors.muted} />
      <Text style={[styles.statusLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.statusPoints, { color: done ? '#006875' : colors.muted }]}>
        {done ? `+${points} pts` : `${points} pts available`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: 24, alignItems: 'center', paddingBottom: 36 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_500Medium', marginBottom: 8 },
  heroScore: { fontSize: 72, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 80 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginBottom: 20 },
  tierText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  progressTrack: { width: '80%', height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'PlusJakartaSans_400Regular' },
  body: { padding: 20, gap: 16 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
  statValue: { fontSize: 22, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  statLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium', textAlign: 'center' },
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusLabel: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  statusPoints: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  factorRow: { gap: 6 },
  factorLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  factorName: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
  factorPoints: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  factorBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: 3 },
  benefitRow: { paddingLeft: 12, borderLeftWidth: 3, gap: 2 },
  benefitTier: { fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  benefitDesc: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
});
