import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

interface Loan {
  id: number; amount: string; status: string; purpose: string;
  repayment_date: string; interest_rate: string; amount_repaid: string;
  duration_days: number; created_at: string; asset_type: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:  { color: '#B86A00', bg: '#FFF3E0', label: 'Pending' },
  active:   { color: '#006875', bg: '#E0F5F7', label: 'Active' },
  repaid:   { color: '#3B7D4A', bg: '#E8F5E9', label: 'Repaid' },
  defaulted:{ color: '#BA1A1A', bg: '#FFDAD6', label: 'Defaulted' },
  rejected: { color: '#6B7080', bg: '#F0F2F8', label: 'Rejected' },
};

export default function LoansScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: loans, isLoading, refetch } = useQuery({
    queryKey: ['/api/loans'],
    queryFn: () => apiGet<Loan[]>('/api/loans'),
  });

  const active = loans?.filter(l => ['active', 'pending'].includes(l.status)) ?? [];
  const past = loans?.filter(l => !['active', 'pending'].includes(l.status)) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Loans</Text>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => router.push('/loan/request')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.applyBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...(active), ...(past)]}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
        scrollEnabled={!!(loans && loans.length > 0)}
        ListHeaderComponent={() => (
          <>
            {active.length > 0 && <SectionHeader title="Active" count={active.length} color={colors} />}
          </>
        )}
        ListEmptyComponent={() =>
          isLoading ? null : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="cash-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No loans yet</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Submit collateral and apply for your first loan.</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primaryContainer }]} onPress={() => router.push('/loan/request')}>
                <Text style={styles.emptyBtnText}>Apply for a Loan</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const showPastHeader = index === active.length && past.length > 0;
          return (
            <>
              {showPastHeader && <SectionHeader title="History" count={past.length} color={colors} />}
              <LoanItem loan={item} colors={colors} onPress={() => router.push(`/loan/${item.id}` as any)} />
            </>
          );
        }}
      />
    </View>
  );
}

function SectionHeader({ title, count, color }: any) {
  return (
    <View style={{ marginBottom: 8, marginTop: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: color.muted, fontFamily: 'PlusJakartaSans_700Bold' }}>
        {title.toUpperCase()}  ·  {count}
      </Text>
    </View>
  );
}

function LoanItem({ loan, colors, onPress }: { loan: Loan; colors: any; onPress: () => void }) {
  const s = STATUS_CONFIG[loan.status] ?? STATUS_CONFIG.pending;
  const amount = parseFloat(loan.amount);
  const repaid = parseFloat(loan.amount_repaid || '0');
  const total = amount * (1 + parseFloat(loan.interest_rate) / 100);
  const progress = total > 0 ? Math.min(repaid / total, 1) : 0;
  const date = new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.loanIcon, { backgroundColor: colors.surfaceContainer }]}>
            <Ionicons name="cash-outline" size={20} color={colors.primaryContainer} />
          </View>
          <View>
            <Text style={[styles.loanAmount, { color: colors.foreground }]}>GHS {amount.toFixed(2)}</Text>
            <Text style={[styles.loanPurpose, { color: colors.muted }]}>{loan.purpose}</Text>
          </View>
        </View>
        <View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.muted }]}>{date}</Text>
        </View>
      </View>

      {(loan.status === 'active' || loan.status === 'pending') && (
        <>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.primaryContainer }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              GHS {repaid.toFixed(2)} / GHS {total.toFixed(2)}
            </Text>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              {Math.round(progress * 100)}% repaid
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loanIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  loanAmount: { fontSize: 17, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  loanPurpose: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2, maxWidth: 140 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  dateText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 4, textAlign: 'right' },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  emptyState: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 10, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
});
