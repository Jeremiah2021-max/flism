import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';

interface Stats {
  users: { total: string; verified: string };
  loans: { total: string; active: string; pending: string; defaulted: string; total_disbursed: string };
  assets: { total: string; pending: string };
  repaid: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const { data: stats, isLoading, refetch } = useQuery<Stats>({
    queryKey: ['/api/admin/stats'],
    queryFn: () => apiGet('/api/admin/stats'),
  });

  const sections = [
    {
      icon: 'wallet-outline' as const,
      label: 'Manage Loans',
      desc: `${stats?.loans.pending ?? '—'} pending approval`,
      badge: parseInt(stats?.loans.pending ?? '0'),
      color: '#0052FF',
      bg: '#EEF2FF',
      route: '/admin/loans',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      label: 'Manage Assets',
      desc: `${stats?.assets.pending ?? '—'} pending review`,
      badge: parseInt(stats?.assets.pending ?? '0'),
      color: '#006875',
      bg: '#E0F5F7',
      route: '/admin/assets',
    },
    {
      icon: 'people-outline' as const,
      label: 'All Users',
      desc: `${stats?.users.total ?? '—'} registered students`,
      badge: 0,
      color: '#5C1A8A',
      bg: '#F3E8FF',
      route: '/admin/users',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#fff" />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#FFD700" />
              <Text style={styles.adminBadgeText}>ADMIN PANEL</Text>
            </View>
            <Text style={styles.headerTitle}>Flism Dashboard</Text>
            <Text style={styles.headerSub}>Welcome, {user?.full_name?.split(' ')[0]}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => Alert.alert('Sign Out', 'Sign out of admin panel?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)'); } },
            ])}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={stats?.users.total ?? '—'} sub={`${stats?.users.verified ?? '—'} KYC verified`} icon="people" color="#4ADE80" />
          <StatCard label="Active Loans" value={stats?.loans.active ?? '—'} sub={`${stats?.loans.pending ?? '—'} pending`} icon="wallet" color="#60A5FA" />
          <StatCard label="Disbursed" value={`GHS ${parseFloat(stats?.loans.total_disbursed ?? '0').toLocaleString()}`} sub="total lending" icon="cash" color="#FCD34D" />
          <StatCard label="Repaid" value={`GHS ${parseFloat(stats?.repaid ?? '0').toLocaleString()}`} sub="collected" icon="checkmark-circle" color="#A78BFA" />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Alert banners */}
        {(parseInt(stats?.loans.pending ?? '0') > 0 || parseInt(stats?.assets.pending ?? '0') > 0) && (
          <View style={[styles.alertCard, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
            <Ionicons name="alert-circle" size={20} color="#B86A00" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: '#B86A00' }]}>Action Required</Text>
              <Text style={[styles.alertSub, { color: '#7A4500' }]}>
                {[
                  parseInt(stats?.loans.pending ?? '0') > 0 ? `${stats?.loans.pending} loan${parseInt(stats?.loans.pending ?? '0') > 1 ? 's' : ''} awaiting approval` : '',
                  parseInt(stats?.assets.pending ?? '0') > 0 ? `${stats?.assets.pending} asset${parseInt(stats?.assets.pending ?? '0') > 1 ? 's' : ''} awaiting review` : '',
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        )}

        {parseInt(stats?.loans.defaulted ?? '0') > 0 && (
          <View style={[styles.alertCard, { backgroundColor: '#FFDAD6', borderColor: '#FF7070' }]}>
            <Ionicons name="warning" size={20} color="#BA1A1A" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: '#BA1A1A' }]}>{stats?.loans.defaulted} Defaulted Loans</Text>
              <Text style={[styles.alertSub, { color: '#7A1010' }]}>Review and take action on defaulted loans</Text>
            </View>
          </View>
        )}

        {/* Navigation sections */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>MANAGEMENT</Text>
        {sections.map(s => (
          <TouchableOpacity
            key={s.label}
            style={[styles.navCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(s.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.navIcon, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon} size={22} color={s.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navLabel, { color: colors.foreground }]}>{s.label}</Text>
              <Text style={[styles.navDesc, { color: colors.muted }]}>{s.desc}</Text>
            </View>
            {s.badge > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{s.badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        ))}

        {/* Portfolio overview */}
        <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 8 }]}>PORTFOLIO</Text>
        <View style={[styles.portfolioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <PortfolioRow label="Total Loans Issued" value={stats?.loans.total ?? '—'} colors={colors} />
          <PortfolioRow label="Currently Active" value={stats?.loans.active ?? '—'} valueColor="#006875" colors={colors} />
          <PortfolioRow label="Pending Approval" value={stats?.loans.pending ?? '—'} valueColor="#B86A00" colors={colors} />
          <PortfolioRow label="Defaulted" value={stats?.loans.defaulted ?? '—'} valueColor="#BA1A1A" colors={colors} />
          <PortfolioRow label="Total Assets Held" value={stats?.assets.total ?? '—'} colors={colors} />
          <PortfolioRow label="KYC Verified Users" value={`${stats?.users.verified ?? '—'} / ${stats?.users.total ?? '—'}`} colors={colors} />
        </View>

        <TouchableOpacity
          style={[styles.backToApp, { borderColor: colors.border }]}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back-outline" size={16} color={colors.muted} />
          <Text style={[styles.backToAppText, { color: colors.muted }]}>Back to Student App</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, sub, icon, color }: any) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function PortfolioRow({ label, value, valueColor, colors }: any) {
  return (
    <View style={[styles.portfolioRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.portfolioLabel, { color: colors.foregroundSecondary }]}>{label}</Text>
      <Text style={[styles.portfolioValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', marginBottom: 6 },
  adminBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, gap: 3 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 6 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'PlusJakartaSans_600SemiBold' },
  statSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'PlusJakartaSans_400Regular' },
  body: { padding: 20, gap: 12 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  alertTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  alertSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.8 },
  navCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  navIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  navDesc: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  navBadge: { backgroundColor: '#FF3B30', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  portfolioCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  portfolioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  portfolioLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  portfolioValue: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  backToApp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  backToAppText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
});
