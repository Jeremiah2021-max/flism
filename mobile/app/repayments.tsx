import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

interface Loan {
  id: number;
  amount: string;
  status: string;
  purpose: string;
  repayment_date: string;
  interest_rate: string;
  penalty_rate: string;
  amount_repaid: string;
  days_overdue: number;
  penalty_amount: number;
  interest_amount: number;
  total_due: number;
}

export default function RepaymentsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: loans, isLoading, refetch } = useQuery({
    queryKey: ['/api/loans'],
    queryFn: () => apiGet<Loan[]>('/api/loans'),
  });

  const activeLoans = loans?.filter(l => l.status === 'active' || l.status === 'pending') ?? [];
  const totalOwed = activeLoans.reduce((s, l) => {
    const paid = parseFloat(l.amount_repaid || '0');
    return s + Math.max((l.total_due ?? 0) - paid, 0);
  }, 0);
  const totalPenalties = activeLoans.reduce((s, l) => s + (l.penalty_amount ?? 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Repayments</Text>
        <View style={{ width: 36 }} />
      </View>

      {totalOwed > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: colors.primaryContainer }]}>
          <Text style={styles.summaryLabel}>Total Outstanding</Text>
          <Text style={styles.summaryValue}>GHS {totalOwed.toFixed(2)}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryNote}>{activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''}</Text>
            {totalPenalties > 0 && (
              <View style={styles.penaltyBadge}>
                <Ionicons name="warning-outline" size={11} color="#fff" />
                <Text style={styles.penaltyBadgeText}>GHS {totalPenalties.toFixed(2)} in penalties</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={loans ?? []}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
        scrollEnabled={!!(loans && loans.length > 0)}
        ListEmptyComponent={() =>
          !isLoading ? (
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="receipt-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No repayments</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Apply for a loan to see repayment details here.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RepaymentCard loan={item} colors={colors} onPress={() => router.push(`/loan/${item.id}` as any)} />
        )}
      />
    </View>
  );
}

function RepaymentCard({ loan, colors, onPress }: { loan: Loan; colors: any; onPress: () => void }) {
  const principal = parseFloat(loan.amount);
  const totalDue = loan.total_due ?? (principal * (1 + parseFloat(loan.interest_rate) / 100));
  const repaid = parseFloat(loan.amount_repaid || '0');
  const remaining = Math.max(totalDue - repaid, 0);
  const progress = totalDue > 0 ? Math.min(repaid / totalDue, 1) : 0;
  const dueDate = loan.repayment_date ? new Date(loan.repayment_date) : null;
  const daysOverdue = loan.days_overdue ?? 0;
  const penaltyAmount = loan.penalty_amount ?? 0;
  const interestAmount = loan.interest_amount ?? 0;
  const isOverdue = daysOverdue > 0 && loan.status === 'active';
  const dueDateStr = dueDate
    ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: isOverdue ? colors.error + '60' : colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.icon, {
            backgroundColor: loan.status === 'repaid' ? '#E8F5E9' : isOverdue ? colors.error + '18' : colors.surfaceContainer,
          }]}>
            <Ionicons
              name={loan.status === 'repaid' ? 'checkmark-circle' : isOverdue ? 'alert-circle-outline' : 'time-outline'}
              size={20}
              color={loan.status === 'repaid' ? '#3B7D4A' : isOverdue ? colors.error : colors.primaryContainer}
            />
          </View>
          <View>
            <Text style={[styles.loanPurpose, { color: colors.foreground }]}>{loan.purpose}</Text>
            <Text style={[styles.loanAmount, { color: colors.muted }]}>GHS {principal.toFixed(2)} principal</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.remaining, {
            color: remaining > 0 ? (isOverdue ? colors.error : colors.primaryContainer) : '#3B7D4A',
          }]}>
            {remaining > 0 ? `GHS ${remaining.toFixed(2)} due` : 'Fully repaid'}
          </Text>
          {isOverdue && (
            <Text style={[styles.overdueTag, { color: colors.error }]}>
              {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
            </Text>
          )}
        </View>
      </View>

      {isOverdue && penaltyAmount > 0 && (
        <View style={[styles.penaltyRow, { backgroundColor: colors.error + '0F', borderColor: colors.error + '30' }]}>
          <Ionicons name="trending-up-outline" size={13} color={colors.error} />
          <Text style={[styles.penaltyText, { color: colors.error }]}>
            Late penalty: GHS {penaltyAmount.toFixed(2)}
            <Text style={[styles.penaltyRate, { color: colors.error + 'BB' }]}>
              {' '}({loan.penalty_rate ?? '0.50'}%/day × {daysOverdue} day{daysOverdue !== 1 ? 's' : ''})
            </Text>
          </Text>
        </View>
      )}

      {loan.status !== 'repaid' && (
        <View style={[styles.breakdownRow, { borderTopColor: colors.border }]}>
          <BreakdownItem label="Principal" value={`GHS ${principal.toFixed(2)}`} color={colors.muted} />
          <BreakdownItem label="Interest" value={`GHS ${interestAmount.toFixed(2)}`} color={colors.muted} />
          {penaltyAmount > 0 && (
            <BreakdownItem label="Penalty" value={`GHS ${penaltyAmount.toFixed(2)}`} color={colors.error} />
          )}
          <BreakdownItem label="Total" value={`GHS ${totalDue.toFixed(2)}`} color={colors.foreground} bold />
        </View>
      )}

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, {
          width: `${progress * 100}%` as any,
          backgroundColor: progress >= 1 ? '#3B7D4A' : isOverdue ? colors.error : colors.primaryContainer,
        }]} />
      </View>

      <View style={styles.cardBottom}>
        <Text style={[styles.progressText, { color: colors.muted }]}>
          {Math.round(progress * 100)}% repaid · GHS {repaid.toFixed(2)} of GHS {totalDue.toFixed(2)}
        </Text>
        {dueDateStr && (
          <Text style={[styles.dueText, { color: isOverdue ? colors.error : colors.muted }]}>
            Due {dueDateStr}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function BreakdownItem({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View style={styles.breakdownItem}>
      <Text style={[styles.breakdownLabel, { color }]}>{label}</Text>
      <Text style={[styles.breakdownValue, { color, fontFamily: bold ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  summaryCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  summaryNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'PlusJakartaSans_400Regular' },
  penaltyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  penaltyBadgeText: { fontSize: 10, color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  loanPurpose: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  loanAmount: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  remaining: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  overdueTag: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  penaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  penaltyText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 },
  penaltyRate: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, gap: 4 },
  breakdownItem: { alignItems: 'center', flex: 1 },
  breakdownLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 2 },
  breakdownValue: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  progressBar: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2.5 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  dueText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
  empty: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 8, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
});
