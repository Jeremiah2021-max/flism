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
    const total = parseFloat(l.amount) * (1 + parseFloat(l.interest_rate) / 100);
    const paid = parseFloat(l.amount_repaid || '0');
    return s + Math.max(total - paid, 0);
  }, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Repayments</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Summary */}
      {totalOwed > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: colors.primaryContainer }]}>
          <Text style={styles.summaryLabel}>Total Outstanding</Text>
          <Text style={styles.summaryValue}>GHS {totalOwed.toFixed(2)}</Text>
          <Text style={styles.summaryNote}>{activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''}</Text>
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
        renderItem={({ item }) => <RepaymentCard loan={item} colors={colors} onPress={() => router.push(`/loan/${item.id}` as any)} />}
      />
    </View>
  );
}

function RepaymentCard({ loan, colors, onPress }: { loan: Loan; colors: any; onPress: () => void }) {
  const amount = parseFloat(loan.amount);
  const rate = parseFloat(loan.interest_rate);
  const total = amount * (1 + rate / 100);
  const repaid = parseFloat(loan.amount_repaid || '0');
  const remaining = Math.max(total - repaid, 0);
  const progress = total > 0 ? Math.min(repaid / total, 1) : 0;
  const dueDate = loan.repayment_date ? new Date(loan.repayment_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && loan.status === 'active';
  const dueDateStr = dueDate ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: isOverdue ? colors.error + '50' : colors.cardBorder }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.icon, { backgroundColor: loan.status === 'repaid' ? '#E8F5E9' : colors.surfaceContainer }]}>
            <Ionicons name={loan.status === 'repaid' ? 'checkmark-circle' : 'time-outline'} size={20} color={loan.status === 'repaid' ? '#3B7D4A' : colors.primaryContainer} />
          </View>
          <View>
            <Text style={[styles.loanPurpose, { color: colors.foreground }]}>{loan.purpose}</Text>
            <Text style={[styles.loanAmount, { color: colors.muted }]}>GHS {amount.toFixed(2)} loan</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.remaining, { color: remaining > 0 ? (isOverdue ? colors.error : colors.primaryContainer) : '#3B7D4A' }]}>
            {remaining > 0 ? `GHS ${remaining.toFixed(2)} due` : 'Fully repaid'}
          </Text>
          {isOverdue && <Text style={[styles.overdue, { color: colors.error }]}>OVERDUE</Text>}
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: progress >= 1 ? '#3B7D4A' : colors.primaryContainer }]} />
      </View>

      <View style={styles.cardBottom}>
        <Text style={[styles.progressText, { color: colors.muted }]}>
          {Math.round(progress * 100)}% repaid · GHS {repaid.toFixed(2)} of GHS {total.toFixed(2)}
        </Text>
        {dueDateStr && (
          <Text style={[styles.dueText, { color: isOverdue ? colors.error : colors.muted }]}>Due {dueDateStr}</Text>
        )}
      </View>
    </TouchableOpacity>
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
  summaryNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  loanPurpose: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  loanAmount: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  remaining: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  overdue: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  progressBar: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2.5 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  dueText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
  empty: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 8, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
});
