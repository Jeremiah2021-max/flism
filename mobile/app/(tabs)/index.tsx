import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

interface Loan {
  id: number; amount: string; status: string; purpose: string;
  repayment_date: string; interest_rate: string; amount_repaid: string;
  asset_type: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const loansQuery = useQuery({ queryKey: ['/api/loans'], queryFn: () => apiGet<Loan[]>('/api/loans') });
  const notifQuery = useQuery({ queryKey: ['/api/notifications'], queryFn: () => apiGet<any>('/api/notifications') });

  function onRefresh() {
    loansQuery.refetch();
    notifQuery.refetch();
    refreshUser();
  }

  const activeLoans = loansQuery.data?.filter(l => l.status === 'active' || l.status === 'pending') ?? [];
  const totalBorrowed = activeLoans.reduce((s, l) => s + parseFloat(l.amount), 0);
  const unreadCount = notifQuery.data?.unread_count ?? 0;
  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
  const loanLimit = parseFloat(user?.loan_limit ?? '300');
  const trustScore = user?.trust_score ?? 0;

  const quickActions = [
    { icon: 'cash-outline' as const, label: 'Apply Loan', route: '/loan/request', color: '#0052FF', bg: '#EEF2FF' },
    { icon: 'shield-checkmark-outline' as const, label: 'Add Asset', route: '/asset/submit', color: '#006875', bg: '#E0F5F7' },
    { icon: 'receipt-outline' as const, label: 'Repayments', route: '/repayments', color: '#7B4F00', bg: '#FFF3E0' },
    { icon: 'notifications-outline' as const, label: 'Alerts', route: '/notifications', color: '#5C1A8A', bg: '#F3E8FF' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loansQuery.isFetching} onRefresh={onRefresh} tintColor={colors.primaryContainer} />}
    >
      {/* Top header */}
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
            <Text style={styles.subGreeting}>Manage your finances</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)']}
            style={styles.balanceGrad}
          >
            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.balanceLabel}>Loan Limit Available</Text>
                <Text style={styles.balanceAmount}>GHS {loanLimit.toFixed(2)}</Text>
              </View>
              <View style={styles.scoreChip}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.scoreChipText}>{trustScore}</Text>
              </View>
            </View>
            <View style={styles.balanceMeta}>
              <View>
                <Text style={styles.metaLabel}>Active Loans</Text>
                <Text style={styles.metaValue}>{activeLoans.length}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View>
                <Text style={styles.metaLabel}>Borrowed</Text>
                <Text style={styles.metaValue}>GHS {totalBorrowed.toFixed(0)}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View>
                <Text style={styles.metaLabel}>Status</Text>
                <Text style={[styles.metaValue, { color: user?.is_verified ? '#4ADE80' : '#FCA5A5' }]}>
                  {user?.is_verified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[styles.quickItem, { backgroundColor: a.bg }]}
                activeOpacity={0.75}
                onPress={() => router.push(a.route as any)}
              >
                <View style={[styles.quickIconBg, { backgroundColor: a.color + '20' }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* KYC Banner */}
        {!user?.is_kyc_complete && (
          <TouchableOpacity
            style={[styles.kycBanner, { backgroundColor: colors.warningContainer }]}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kycTitle, { color: colors.warning }]}>Complete your KYC</Text>
              <Text style={[styles.kycSub, { color: colors.foregroundSecondary }]}>Verify your identity to unlock higher loan limits</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.warning} />
          </TouchableOpacity>
        )}

        {/* Active Loans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Loans</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/loans')}>
              <Text style={[styles.seeAll, { color: colors.primaryContainer }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {loansQuery.isLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Loading...</Text>
            </View>
          ) : activeLoans.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="cash-remove" size={32} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No active loans</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Apply for your first loan to get started</Text>
            </View>
          ) : (
            activeLoans.slice(0, 3).map(loan => (
              <LoanCard key={loan.id} loan={loan} colors={colors} onPress={() => router.push(`/loan/${loan.id}` as any)} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function LoanCard({ loan, colors, onPress }: { loan: Loan; colors: any; onPress: () => void }) {
  const amount = parseFloat(loan.amount);
  const repaid = parseFloat(loan.amount_repaid || '0');
  const total = amount * (1 + parseFloat(loan.interest_rate) / 100);
  const progress = total > 0 ? Math.min(repaid / total, 1) : 0;
  const statusColor = loan.status === 'active' ? '#006875' : loan.status === 'pending' ? '#B86A00' : '#6B7080';
  const dueDate = loan.repayment_date ? new Date(loan.repayment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <TouchableOpacity style={[styles.loanCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.loanCardTop}>
        <View>
          <Text style={[styles.loanAmount, { color: colors.foreground }]}>GHS {amount.toFixed(2)}</Text>
          <Text style={[styles.loanPurpose, { color: colors.muted }]}>{loan.purpose}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{loan.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.primaryContainer }]} />
      </View>
      <View style={styles.loanMeta}>
        <Text style={[styles.loanMetaText, { color: colors.muted }]}>GHS {repaid.toFixed(2)} paid of GHS {total.toFixed(2)}</Text>
        <Text style={[styles.loanMetaText, { color: colors.muted }]}>Due {dueDate}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  subGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#FF3B30', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  balanceCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  balanceGrad: { padding: 20 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_500Medium', marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 },
  scoreChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  scoreChipText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  balanceMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'PlusJakartaSans_400Regular' },
  metaValue: { fontSize: 14, color: '#fff', fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginTop: 2 },
  metaDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  body: { paddingHorizontal: 20, marginTop: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  seeAll: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickItem: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8 },
  quickIconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center' },
  kycBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginBottom: 20 },
  kycTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  kycSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  loanCard: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  loanCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  loanAmount: { fontSize: 20, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  loanPurpose: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: '#EEF2FF', overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  loanMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  loanMetaText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 8, borderWidth: 1 },
  emptyTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
});
