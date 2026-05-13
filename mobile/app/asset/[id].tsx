import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/Button';

interface AssetDetail {
  id: number; type: string; brand: string; model: string; description: string;
  serial_number: string; estimated_value: string; loan_value: string;
  status: string; condition: string; created_at: string;
  active_loan_id: number | null; loan_amount: string; loan_status: string;
}

const STATUS_INFO: Record<string, { color: string; bg: string; label: string; desc: string }> = {
  pending:  { color: '#B86A00', bg: '#FFF3E0', label: 'Pending Verification', desc: 'Our team is reviewing your asset. This usually takes 24 hours.' },
  approved: { color: '#006875', bg: '#E0F5F7', label: 'Approved', desc: 'Your asset is verified and ready to use as collateral.' },
  rejected: { color: '#BA1A1A', bg: '#FFDAD6', label: 'Rejected', desc: 'Your asset was not approved. Please submit a different asset.' },
  seized:   { color: '#6B7080', bg: '#F0F2F8', label: 'Seized', desc: 'This asset has been seized due to loan default.' },
};

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const { data: asset, isLoading } = useQuery({
    queryKey: ['/api/assets', id],
    queryFn: () => apiGet<AssetDetail>(`/api/assets/${id}`),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiPost(`/api/assets/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      Alert.alert('Asset Approved!', 'For demo purposes, your asset has been approved. In production, this would be done by our verification team.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  if (isLoading || !asset) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading asset details...</Text>
      </View>
    );
  }

  const s = STATUS_INFO[asset.status] ?? STATUS_INFO.pending;
  const date = new Date(asset.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Asset Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="cube-outline" size={36} color="#fff" />
          </View>
          <Text style={styles.heroType}>{asset.brand ? `${asset.brand} ${asset.type}` : asset.type}</Text>
          {asset.model && <Text style={styles.heroModel}>{asset.model}</Text>}
          <View style={[styles.heroBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.heroBadgeText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: s.bg, borderColor: s.color + '40' }]}>
          <Ionicons name="information-circle-outline" size={18} color={s.color} />
          <Text style={[styles.statusDesc, { color: s.color }]}>{s.desc}</Text>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Asset Information</Text>
          <DetailRow label="Type" value={asset.type} colors={colors} />
          {asset.brand && <DetailRow label="Brand" value={asset.brand} colors={colors} />}
          {asset.model && <DetailRow label="Model" value={asset.model} colors={colors} />}
          <DetailRow label="Serial / IMEI" value={asset.serial_number || 'Not provided'} colors={colors} />
          <DetailRow label="Condition" value={asset.condition || 'Good'} colors={colors} />
          <DetailRow label="Submitted" value={date} colors={colors} />
        </View>

        {/* Financial */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Financial Details</Text>
          <DetailRow label="Estimated Value" value={`GHS ${parseFloat(asset.estimated_value).toFixed(2)}`} colors={colors} />
          <DetailRow label="Loan Value (55%)" value={`GHS ${parseFloat(asset.loan_value || '0').toFixed(2)}`} colors={colors} highlight />
        </View>

        {/* Active loan info */}
        {asset.active_loan_id && (
          <View style={[styles.card, { backgroundColor: colors.warningContainer, borderColor: '#FFB74D' }]}>
            <Text style={[styles.cardTitle, { color: colors.warning }]}>Active Loan</Text>
            <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: colors.warning }}>
              This asset is currently securing a loan of GHS {parseFloat(asset.loan_amount || '0').toFixed(2)}.
            </Text>
            <TouchableOpacity onPress={() => router.push(`/loan/${asset.active_loan_id}` as any)} style={[styles.viewLoanBtn, { borderColor: colors.warning }]}>
              <Text style={[styles.viewLoanText, { color: colors.warning }]}>View Loan</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.warning} />
            </TouchableOpacity>
          </View>
        )}

        {/* Approve for demo */}
        {asset.status === 'pending' && (
          <Button
            title={approveMutation.isPending ? 'Processing...' : 'Simulate Approval (Demo)'}
            onPress={() => Alert.alert('Demo Action', 'In production, assets are approved by our verification team. This simulates that approval.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Approve', onPress: () => approveMutation.mutate() }
            ])}
            loading={approveMutation.isPending}
            variant="secondary"
            size="lg"
          />
        )}

        {asset.status === 'approved' && !asset.active_loan_id && (
          <Button
            title="Use as Collateral"
            onPress={() => router.push('/loan/request')}
            size="lg"
          />
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, colors, highlight }: any) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: highlight ? colors.primaryContainer : colors.foreground, fontWeight: highlight ? '700' : '500' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  body: { padding: 20, gap: 16 },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroType: { fontSize: 22, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center' },
  heroModel: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'PlusJakartaSans_400Regular' },
  heroBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, marginTop: 4 },
  heroBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  statusCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  statusDesc: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 },
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  detailValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', textAlign: 'right', flex: 1, maxWidth: '60%' as any },
  viewLoanBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6, borderBottomWidth: 1 },
  viewLoanText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
