import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPost } from '@/lib/api';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32', Silver: '#A8A8A8', Gold: '#FFD700', Platinum: '#00C6E0',
};

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const { data: guarantors = [] } = useQuery<any[]>({
    queryKey: ['/api/guarantors'],
    queryFn: () => apiGet('/api/guarantors'),
  });

  const { data: trust } = useQuery<any>({
    queryKey: ['/api/trust'],
    queryFn: () => apiGet('/api/trust'),
  });

  const kycMutation = useMutation({
    mutationFn: () => apiPost('/api/users/kyc', {}),
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['/api/trust'] });
      Alert.alert('KYC Verified!', 'Your identity has been verified. Trust score increased.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await logout();
          queryClient.clear();
          router.replace('/(auth)');
        },
      },
    ]);
  }

  const initials = user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'ST';
  const tier = trust?.tier ?? 'Bronze';
  const tierColor = TIER_COLORS[tier] ?? '#CD7F32';
  const kycStep = user?.kyc_step ?? 0;
  const kycStepsTotal = 4;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header gradient */}
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.headerGrad, { paddingTop: topPad + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { borderColor: tierColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.tierRow}>
            <Ionicons name="ribbon" size={13} color={tierColor} />
            <Text style={[styles.tierText, { color: tierColor }]}>{tier} Tier</Text>
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>{user?.trust_score ?? 0} pts</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatItem label="Loan Limit" value={`GHS ${parseFloat(user?.loan_limit ?? '300').toFixed(0)}`} />
          <View style={styles.statsDivider} />
          <StatItem label="University" value={user?.university?.split(' ').slice(0, 2).join(' ') ?? 'UG'} />
          <View style={styles.statsDivider} />
          <StatItem label="Guarantors" value={String(guarantors.length)} />
        </View>
      </LinearGradient>

      <View style={styles.sections}>

        {/* KYC Progress */}
        <SectionGroup title="Verification Progress" colors={colors}>
          <View style={{ padding: 14, gap: 12 }}>
            <KYCStep
              num={1} label="Identity Verification" desc="Ghana Card & address"
              done={kycStep >= 1} colors={colors}
              onPress={() => router.push('/kyc')}
            />
            <KYCStep
              num={2} label="Student Verification" desc="Department & year of study"
              done={!!user?.is_student_verified} colors={colors}
              onPress={() => router.push('/kyc')}
            />
            <KYCStep
              num={3} label="Mobile Money" desc="Link your MoMo account"
              done={!!(user?.momo_number)} colors={colors}
              onPress={() => router.push('/kyc')}
            />
            <KYCStep
              num={4} label="Final Verification" desc="Review & submit for approval"
              done={!!user?.is_kyc_complete} colors={colors}
              onPress={() => user?.is_kyc_complete ? null : router.push('/kyc')}
            />
            {!user?.is_kyc_complete && (
              <TouchableOpacity
                style={[styles.kycCta, { backgroundColor: colors.primaryContainer }]}
                onPress={() => router.push('/kyc')}
                activeOpacity={0.85}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                <Text style={styles.kycCtaText}>
                  {kycStep === 0 ? 'Start KYC Verification' : `Continue KYC (Step ${kycStep + 1} of 4)`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" />
              </TouchableOpacity>
            )}
            {user?.is_kyc_complete && (
              <View style={[styles.kycDone, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#3B7D4A" />
                <Text style={[styles.kycDoneText, { color: '#3B7D4A' }]}>KYC Fully Verified — +50 Trust Points Awarded</Text>
              </View>
            )}
          </View>
        </SectionGroup>

        {/* Account info */}
        <SectionGroup title="Account" colors={colors}>
          <MenuItem icon="person-outline" label="Full Name" value={user?.full_name} colors={colors} />
          <MenuItem icon="call-outline" label="Phone" value={user?.phone || 'Not set'} colors={colors} />
          <MenuItem icon="card-outline" label="Student ID" value={user?.student_id || 'Not set'} colors={colors} />
          <MenuItem icon="school-outline" label="University" value={user?.university} colors={colors} />
          {user?.department && <MenuItem icon="book-outline" label="Department" value={user.department} colors={colors} />}
          {user?.year_of_study && <MenuItem icon="layers-outline" label="Year" value={user.year_of_study} colors={colors} />}
        </SectionGroup>

        {/* Mobile Money */}
        <SectionGroup title="Mobile Money" colors={colors}>
          {user?.momo_number ? (
            <>
              <MenuItem icon="phone-portrait-outline" label="Provider" value={user.momo_provider ?? 'MTN MoMo'} colors={colors} />
              <MenuItem icon="call-outline" label="Number" value={user.momo_number} colors={colors} />
              <MenuAction icon="create-outline" label="Update MoMo details" colors={colors} onPress={() => router.push('/kyc')} />
            </>
          ) : (
            <TouchableOpacity
              style={[styles.kycCta, { backgroundColor: '#FFF3E0', margin: 10 }]}
              onPress={() => router.push('/kyc')}
              activeOpacity={0.8}
            >
              <Ionicons name="phone-portrait-outline" size={18} color="#B86A00" />
              <Text style={[styles.kycCtaText, { color: '#B86A00', flex: 1 }]}>Link Mobile Money account</Text>
              <Ionicons name="chevron-forward" size={16} color="#B86A00" />
            </TouchableOpacity>
          )}
        </SectionGroup>

        {/* Guarantors */}
        <SectionGroup title="Guarantors" colors={colors}>
          <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
            <View style={styles.guarantorHeader}>
              <Text style={[styles.guarantorCount, { color: colors.foreground }]}>
                {guarantors.length} / 3 guarantors added
              </Text>
              <TouchableOpacity
                style={[styles.guarantorBtn, { backgroundColor: colors.primaryContainer + '18' }]}
                onPress={() => router.push('/guarantor/add')}
              >
                <Ionicons name="people-outline" size={14} color={colors.primaryContainer} />
                <Text style={[styles.guarantorBtnText, { color: colors.primaryContainer }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            {guarantors.length === 0 ? (
              <Text style={[styles.guarantorEmpty, { color: colors.muted }]}>
                No guarantors added yet. Each guarantor earns +10 trust points.
              </Text>
            ) : (
              <View style={{ gap: 8, marginTop: 8 }}>
                {guarantors.slice(0, 2).map((g: any) => (
                  <View key={g.id} style={[styles.guarantorRow, { borderColor: colors.border }]}>
                    <View style={[styles.gAvatar, { backgroundColor: colors.primaryContainer }]}>
                      <Text style={styles.gAvatarText}>{g.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gName, { color: colors.foreground }]}>{g.name}</Text>
                      <Text style={[styles.gSub, { color: colors.muted }]}>{g.relationship}</Text>
                    </View>
                    <View style={[styles.gStatus, { backgroundColor: g.is_verified ? '#E8F5E9' : '#FFF3E0' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: g.is_verified ? '#3B7D4A' : '#B86A00' }}>
                        {g.is_verified ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                ))}
                {guarantors.length > 2 && (
                  <Text style={[styles.guarantorEmpty, { color: colors.muted }]}>+{guarantors.length - 2} more</Text>
                )}
              </View>
            )}
          </View>
          <View style={{ height: 10 }} />
        </SectionGroup>

        {/* Admin Panel — only visible to admins */}
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={[styles.adminEntryCard, { backgroundColor: '#001A7A', borderColor: '#0052FF' }]}
            onPress={() => router.push('/admin')}
            activeOpacity={0.85}
          >
            <View style={styles.adminEntryLeft}>
              <View style={styles.adminEntryIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#FFD700" />
              </View>
              <View>
                <Text style={styles.adminEntryTitle}>Admin Dashboard</Text>
                <Text style={styles.adminEntrySub}>Manage loans, assets & users</Text>
              </View>
            </View>
            <View style={styles.adminEntryBadge}>
              <Text style={styles.adminEntryBadgeText}>ADMIN</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}

        {/* Support */}
        <SectionGroup title="Support & Legal" colors={colors}>
          <MenuAction icon="help-circle-outline" label="Help Center" colors={colors} onPress={() => Alert.alert('Help', 'Contact support@flism.gh or call 0800-FLISM')} />
          <MenuAction icon="document-text-outline" label="Terms & Conditions" colors={colors} onPress={() => Alert.alert('Terms', 'Student Loan Terms apply. Interest from 2–5% p.a.')} />
          <MenuAction icon="shield-outline" label="Privacy Policy" colors={colors} onPress={() => Alert.alert('Privacy', 'Your data is protected under Ghana data laws.')} />
        </SectionGroup>

        <TouchableOpacity style={[styles.signOut, { borderColor: colors.error }]} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.muted }]}>Flism v2.0 · Built for Ghanaian Students</Text>
      </View>
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontFamily: 'PlusJakartaSans_400Regular' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function KYCStep({ num, label, desc, done, colors, onPress }: any) {
  return (
    <TouchableOpacity style={styles.kycStepRow} onPress={onPress} activeOpacity={0.7} disabled={done}>
      <View style={[styles.kycStepNum, { backgroundColor: done ? '#3B7D4A' : colors.primaryContainer + '20', borderColor: done ? '#3B7D4A' : colors.border }]}>
        {done
          ? <Ionicons name="checkmark" size={13} color="#fff" />
          : <Text style={[styles.kycStepNumText, { color: colors.primaryContainer }]}>{num}</Text>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.kycStepLabel, { color: done ? '#3B7D4A' : colors.foreground }]}>{label}</Text>
        <Text style={[styles.kycStepDesc, { color: colors.muted }]}>{desc}</Text>
      </View>
      {!done && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </TouchableOpacity>
  );
}

function SectionGroup({ title, children, colors }: any) {
  return (
    <View style={styles.sectionGroup}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function MenuItem({ icon, label, value, colors }: any) {
  return (
    <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={[styles.menuLabel, { color: colors.foregroundSecondary }]}>{label}</Text>
      <Text style={[styles.menuValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function MenuAction({ icon, label, colors, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={[styles.menuLabel, { color: colors.foreground, flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 20 },
  avatarSection: { alignItems: 'center', gap: 6, marginBottom: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'PlusJakartaSans_400Regular' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tierText: { fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  scorePill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  scoreText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14,
  },
  statsDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  sections: { padding: 20, gap: 20 },
  sectionGroup: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.5, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  menuLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', width: 100 },
  menuValue: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'right' },
  kycStepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kycStepNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  kycStepNumText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  kycStepLabel: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  kycStepDesc: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  kycCta: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  kycCtaText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  kycDone: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  kycDoneText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 },
  guarantorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  guarantorCount: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  guarantorBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  guarantorBtnText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  guarantorEmpty: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18, paddingVertical: 8 },
  guarantorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1 },
  gAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  gAvatarText: { color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  gName: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  gSub: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  gStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  signOutText: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  adminEntryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  adminEntryLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminEntryIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  adminEntryTitle: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  adminEntrySub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  adminEntryBadge: { backgroundColor: 'rgba(255,215,0,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  adminEntryBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.8 },
});
