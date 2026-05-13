import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/Button';

interface LoanDetail {
  id: number; amount: string; status: string; purpose: string;
  repayment_date: string; interest_rate: string; penalty_rate: string; amount_repaid: string;
  duration_days: number; created_at: string; asset_type: string;
  asset_description: string; asset_value: string; brand: string; model: string;
  days_overdue: number; penalty_amount: number; interest_amount: number; total_due: number;
  repayments: { id: number; amount: string; status: string; due_date: string; paid_at: string }[];
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const { data: loan, isLoading } = useQuery({
    queryKey: ['/api/loans', id],
    queryFn: () => apiGet<LoanDetail>(`/api/loans/${id}`),
  });

  const repayMutation = useMutation({
    mutationFn: (amount: number) => apiPost(`/api/loans/${id}/repay`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trust'] });
      Alert.alert('Payment Recorded', 'Your repayment has been processed.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  if (isLoading || !loan) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading loan details...</Text>
      </View>
    );
  }

  const amount = parseFloat(loan.amount);
  const repaid = parseFloat(loan.amount_repaid || '0');
  const rate = parseFloat(loan.interest_rate);
  const penaltyAmount = loan.penalty_amount ?? 0;
  const interestAmount = loan.interest_amount ?? (amount * rate / 100);
  const totalDue = loan.total_due ?? (amount + interestAmount);
  const daysOverdue = loan.days_overdue ?? 0;
  const isOverdue = daysOverdue > 0 && loan.status === 'active';
  const remaining = Math.max(totalDue - repaid, 0);
  const progress = totalDue > 0 ? Math.min(repaid / totalDue, 1) : 0;

  const statusColor = loan.status === 'active' ? '#006875' : loan.status === 'pending' ? '#B86A00' : loan.status === 'repaid' ? '#3B7D4A' : '#BA1A1A';
  const dueDate = loan.repayment_date ? new Date(loan.repayment_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

  function handleRepay() {
    const penaltyNote = penaltyAmount > 0 ? `\nIncludes GHS ${penaltyAmount.toFixed(2)} late penalty.` : '';
    Alert.alert('Make Payment', `Remaining balance: GHS ${remaining.toFixed(2)}${penaltyNote}`, [
      { text: 'Pay GHS 50', onPress: () => repayMutation.mutate(50) },
      { text: `Pay full (GHS ${remaining.toFixed(2)})`, onPress: () => repayMutation.mutate(remaining) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Loan Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Amount hero */}
        <View style={[styles.amountCard, { backgroundColor: colors.primaryContainer }]}>
          <Text style={styles.amountLabel}>Loan Amount</Text>
          <Text style={styles.amountValue}>GHS {amount.toFixed(2)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.statusText}>{loan.status.toUpperCase()}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round(progress * 100)}% repaid · GHS {repaid.toFixed(2)} of GHS {totalDue.toFixed(2)}</Text>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Loan Information</Text>
          <DetailRow label="Purpose" value={loan.purpose} colors={colors} />
          <DetailRow label="Duration" value={`${loan.duration_days} days`} colors={colors} />
          <DetailRow label="Principal" value={`GHS ${amount.toFixed(2)}`} colors={colors} />
          <DetailRow label="Interest" value={`GHS ${interestAmount.toFixed(2)} (${rate}% flat)`} colors={colors} />
          {penaltyAmount > 0 && (
            <DetailRow
              label={`Late Penalty (${daysOverdue}d)`}
              value={`GHS ${penaltyAmount.toFixed(2)}`}
              colors={colors}
              error
            />
          )}
          <DetailRow label="Due Date" value={dueDate} colors={colors} />
          <DetailRow label="Total Due" value={`GHS ${totalDue.toFixed(2)}`} colors={colors} highlight />
          <DetailRow label="Outstanding" value={`GHS ${remaining.toFixed(2)}`} colors={colors} highlight />
        </View>

        {/* Collateral */}
        {loan.asset_type && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Collateral</Text>
            <DetailRow label="Asset" value={`${loan.brand ?? ''} ${loan.asset_type}`.trim()} colors={colors} />
            <DetailRow label="Asset Value" value={`GHS ${parseFloat(loan.asset_value || '0').toFixed(2)}`} colors={colors} />
          </View>
        )}

        {/* Repayment history */}
        {loan.repayments?.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Repayment Schedule</Text>
            {loan.repayments.map(r => (
              <View key={r.id} style={[styles.repayRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.repayAmount, { color: colors.foreground }]}>GHS {parseFloat(r.amount).toFixed(2)}</Text>
                  <Text style={[styles.repayDate, { color: colors.muted }]}>Due: {new Date(r.due_date).toLocaleDateString('en-GB')}</Text>
                </View>
                <View style={[styles.repayStatus, { backgroundColor: r.status === 'paid' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', color: r.status === 'paid' ? '#3B7D4A' : '#B86A00' }}>
                    {r.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Repay button */}
        {(loan.status === 'active' || loan.status === 'pending') && remaining > 0 && (
          <Button
            title={repayMutation.isPending ? 'Processing...' : `Make Payment`}
            onPress={handleRepay}
            loading={repayMutation.isPending}
            size="lg"
            style={{ marginTop: 8 }}
          />
        )}

        {loan.status === 'repaid' && (
          <View style={[styles.repaidBanner, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#3B7D4A" />
            <Text style={[styles.repaidText, { color: '#3B7D4A' }]}>Loan fully repaid! Your trust score has been boosted.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, colors, highlight, error }: any) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: error ? colors.error : colors.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, {
        color: error ? colors.error : highlight ? colors.primaryContainer : colors.foreground,
        fontWeight: (highlight || error) ? '700' : '500',
      }]}>{value}</Text>
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
  amountCard: { borderRadius: 20, padding: 20, gap: 8 },
  amountLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  amountValue: { fontSize: 40, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  detailValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', textAlign: 'right', flex: 1, maxWidth: '60%' as any },
  repayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  repayAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  repayDate: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  repayStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  repaidBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 14, borderWidth: 1 },
  repaidText: { flex: 1, fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
