import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPut } from '@/lib/api';

interface Stats {
  users: { total: string; verified: string };
  loans: { total: string; active: string; pending: string; defaulted: string; total_disbursed: string };
  assets: { total: string; pending: string };
  repaid: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifColor(type: string) {
  if (type === 'success') return { bg: '#E8F5E9', border: '#4CAF50', icon: 'checkmark-circle' as const, color: '#2E7D32' };
  if (type === 'warning') return { bg: '#FFF3E0', border: '#FFB74D', icon: 'alert-circle' as const, color: '#B86A00' };
  if (type === 'error') return { bg: '#FFDAD6', border: '#FF7070', icon: 'close-circle' as const, color: '#BA1A1A' };
  return { bg: '#E8F0FF', border: '#90A8F4', icon: 'notifications' as const, color: '#0052FF' };
}

export default function DashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const { data: stats, isLoading, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ['/api/admin/stats'],
    queryFn: () => apiGet('/api/admin/stats'),
  });

  const { data: notifData, refetch: refetchNotifs } = useQuery<{ notifications: Notification[]; unread_count: number }>({
    queryKey: ['/api/notifications'],
    queryFn: () => apiGet('/api/notifications'),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiPut(`/api/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiPut('/api/notifications/read-all', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  function refetchAll() { refetchStats(); refetchNotifs(); }

  const notifications = notifData?.notifications ?? [];
  const unreadCount = notifData?.unread_count ?? 0;

  const sections = [
    { icon: 'wallet-outline' as const, label: 'Manage Loans', desc: `${stats?.loans.pending ?? '—'} pending approval`, badge: parseInt(stats?.loans.pending ?? '0'), color: '#0052FF', bg: '#EEF2FF', route: '/loans' },
    { icon: 'shield-checkmark-outline' as const, label: 'Manage Assets', desc: `${stats?.assets.pending ?? '—'} pending review`, badge: parseInt(stats?.assets.pending ?? '0'), color: '#006875', bg: '#E0F5F7', route: '/assets' },
    { icon: 'people-outline' as const, label: 'All Users', desc: `${stats?.users.total ?? '—'} registered students`, badge: 0, color: '#5C1A8A', bg: '#F3E8FF', route: '/users' },
    { icon: 'megaphone-outline' as const, label: 'Broadcast', desc: 'Send notifications to students', badge: 0, color: '#B86A00', bg: '#FFF3E0', route: '/broadcast' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchAll} tintColor="#fff" />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#FFD700" />
              <Text style={styles.adminBadgeText}>ADMIN PANEL</Text>
            </View>
            <Text style={styles.headerTitle}>Flism Admin</Text>
            <Text style={styles.headerSub}>Welcome, {user?.full_name?.split(' ')[0]}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <View style={styles.unreadBubble}>
                <Text style={styles.unreadBubbleText}>{unreadCount}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => Alert.alert('Sign Out', 'Sign out of admin panel?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
              ])}
            >
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={stats?.users.total ?? '—'} sub={`${stats?.users.verified ?? '—'} KYC verified`} icon="people" color="#4ADE80" />
          <StatCard label="Active Loans" value={stats?.loans.active ?? '—'} sub={`${stats?.loans.pending ?? '—'} pending`} icon="wallet" color="#60A5FA" />
          <StatCard label="Disbursed" value={`GHS ${parseFloat(stats?.loans.total_disbursed ?? '0').toLocaleString()}`} sub="total lending" icon="cash" color="#FCD34D" />
          <StatCard label="Repaid" value={`GHS ${parseFloat(stats?.repaid ?? '0').toLocaleString()}`} sub="collected" icon="checkmark-circle" color="#A78BFA" />
        </View>
      </LinearGradient>

      <View style={styles.body}>
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

        <View style={styles.notifHeader}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ACTIVITY FEED</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={() => markAllReadMutation.mutate()} style={[styles.markAllBtn, { borderColor: colors.border }]}>
              <Text style={[styles.markAllText, { color: colors.primaryContainer }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={[styles.emptyNotif, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="notifications-off-outline" size={28} color={colors.muted} />
            <Text style={[styles.emptyNotifText, { color: colors.muted }]}>No activity yet</Text>
            <Text style={[styles.emptyNotifSub, { color: colors.muted }]}>Student actions will appear here in real time</Text>
          </View>
        ) : (
          <View style={[styles.notifCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {notifications.slice(0, 20).map((n, idx) => {
              const { bg, border, icon, color } = notifColor(n.type);
              return (
                <TouchableOpacity
                  key={n.id}
                  onPress={() => !n.is_read && markReadMutation.mutate(n.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.notifRow,
                    { borderBottomColor: colors.border },
                    idx === notifications.slice(0, 20).length - 1 && { borderBottomWidth: 0 },
                    !n.is_read && { backgroundColor: bg + '55' },
                  ]}
                >
                  <View style={[styles.notifIconWrap, { backgroundColor: bg, borderColor: border }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.notifTitle, { color: colors.foreground }]} numberOfLines={1}>{n.title}</Text>
                      {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primaryContainer }]} />}
                    </View>
                    <Text style={[styles.notifMsg, { color: colors.foregroundSecondary }]} numberOfLines={2}>{n.message}</Text>
                    <Text style={[styles.notifTime, { color: colors.muted }]}>{timeAgo(n.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 4 }]}>PORTFOLIO</Text>
        <View style={[styles.portfolioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <PortfolioRow label="Total Loans Issued" value={stats?.loans.total ?? '—'} colors={colors} />
          <PortfolioRow label="Currently Active" value={stats?.loans.active ?? '—'} valueColor="#006875" colors={colors} />
          <PortfolioRow label="Pending Approval" value={stats?.loans.pending ?? '—'} valueColor="#B86A00" colors={colors} />
          <PortfolioRow label="Defaulted" value={stats?.loans.defaulted ?? '—'} valueColor="#BA1A1A" colors={colors} />
          <PortfolioRow label="Total Assets Held" value={stats?.assets.total ?? '—'} colors={colors} />
          <PortfolioRow label="KYC Verified Users" value={`${stats?.users.verified ?? '—'} / ${stats?.users.total ?? '—'}`} colors={colors} />
        </View>
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
  unreadBubble: { backgroundColor: '#FF3B30', minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadBubbleText: { color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
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
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  markAllText: { fontSize: 11, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  emptyNotif: { borderRadius: 14, borderWidth: 1, alignItems: 'center', padding: 28, gap: 8 },
  emptyNotifText: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  emptyNotifSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  notifCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  notifRow: { flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: 1, alignItems: 'flex-start' },
  notifIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 2 },
  notifTitle: { fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  notifMsg: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 17 },
  notifTime: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  portfolioCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  portfolioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  portfolioLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  portfolioValue: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
});
