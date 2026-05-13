import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const kycMutation = useMutation({
    mutationFn: () => apiPost('/api/users/kyc', {}),
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['/api/trust'] });
      Alert.alert('KYC Verified!', 'Your identity has been verified. Your trust score has increased.');
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
        }
      }
    ]);
  }

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'ST';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, margin: 20, marginBottom: 0 }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.full_name}</Text>
          <Text style={[styles.profileEmail, { color: colors.muted }]}>{user?.email}</Text>
          <View style={styles.verifiedRow}>
            <Ionicons
              name={user?.is_verified ? 'checkmark-circle' : 'alert-circle-outline'}
              size={14}
              color={user?.is_verified ? '#006875' : colors.warning}
            />
            <Text style={[styles.verifiedText, { color: user?.is_verified ? '#006875' : colors.warning }]}>
              {user?.is_verified ? 'Identity Verified' : 'Not yet verified'}
            </Text>
          </View>
        </View>
      </View>

      {/* Trust & limits banner */}
      <View style={[styles.trustBanner, { backgroundColor: colors.primaryContainer, margin: 20, marginBottom: 0 }]}>
        <View style={styles.trustItem}>
          <Text style={styles.trustLabel}>Trust Score</Text>
          <Text style={styles.trustValue}>{user?.trust_score ?? 0}</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Text style={styles.trustLabel}>Loan Limit</Text>
          <Text style={styles.trustValue}>GHS {parseFloat(user?.loan_limit ?? '300').toFixed(0)}</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Text style={styles.trustLabel}>University</Text>
          <Text style={styles.trustValue} numberOfLines={1}>{user?.university?.split(' ').slice(0, 2).join(' ') ?? 'UG'}</Text>
        </View>
      </View>

      <View style={styles.sections}>
        {/* Account section */}
        <SectionGroup title="Account" colors={colors}>
          <MenuItem icon="person-outline" label="Full Name" value={user?.full_name} colors={colors} />
          <MenuItem icon="call-outline" label="Phone" value={user?.phone || 'Not set'} colors={colors} />
          <MenuItem icon="card-outline" label="Student ID" value={user?.student_id || 'Not set'} colors={colors} />
          <MenuItem icon="school-outline" label="University" value={user?.university} colors={colors} />
        </SectionGroup>

        {/* KYC section */}
        <SectionGroup title="Verification" colors={colors}>
          {!user?.is_kyc_complete ? (
            <TouchableOpacity
              style={[styles.kycCta, { backgroundColor: colors.primaryContainer }]}
              onPress={() => Alert.alert(
                'Complete KYC',
                'This will verify your identity and increase your trust score by 50 points.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Verify Now', onPress: () => kycMutation.mutate() }
                ]
              )}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.kycCtaText}>
                {kycMutation.isPending ? 'Verifying...' : 'Complete KYC Verification'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={[styles.kycDone, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#3B7D4A" />
              <Text style={[styles.kycDoneText, { color: '#3B7D4A' }]}>KYC Completed — Identity Verified</Text>
            </View>
          )}
        </SectionGroup>

        {/* Support section */}
        <SectionGroup title="Support" colors={colors}>
          <MenuAction icon="help-circle-outline" label="Help Center" colors={colors} onPress={() => Alert.alert('Help', 'Contact support@flism.gh or call 0800-FLISM')} />
          <MenuAction icon="document-text-outline" label="Terms & Conditions" colors={colors} onPress={() => Alert.alert('Terms', 'Student Loan Terms apply. Interest from 2–5% p.a.')} />
          <MenuAction icon="shield-outline" label="Privacy Policy" colors={colors} onPress={() => Alert.alert('Privacy', 'Your data is protected under Ghana data laws.')} />
        </SectionGroup>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOut, { borderColor: colors.error }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  profileCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  profileEmail: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verifiedText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  trustBanner: { borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  trustItem: { alignItems: 'center' },
  trustLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  trustValue: { fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2, maxWidth: 80 },
  trustDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  sections: { padding: 20, gap: 20 },
  sectionGroup: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.5, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  menuLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', width: 100 },
  menuValue: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'right' },
  kycCta: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  kycCtaText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  kycDone: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  kycDoneText: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  signOutText: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
});
