import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPut } from '@/lib/api';

interface AdminUser {
  id: number; email: string; full_name: string; phone: string;
  university: string; trust_score: number; loan_limit: string;
  is_verified: boolean; is_kyc_complete: boolean; role: string; created_at: string;
}

const TIER_COLOR: Record<string, string> = {
  Bronze: '#CD7F32', Silver: '#A8A8A8', Gold: '#FFD700', Platinum: '#00C6E0',
};

function getTier(score: number) {
  if (score >= 400) return 'Platinum';
  if (score >= 250) return 'Gold';
  if (score >= 100) return 'Silver';
  return 'Bronze';
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading, refetch } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiGet('/api/admin/users'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => apiPut(`/api/admin/users/${id}/verify`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      Alert.alert('Verified', 'User has been manually verified.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'verified', label: 'Verified' },
    { key: 'unverified', label: 'Unverified' },
    { key: 'admin', label: 'Admins' },
  ];

  const filtered = users.filter(u => {
    const matchFilter =
      filter === 'all' ? true :
      filter === 'verified' ? u.is_kyc_complete :
      filter === 'unverified' ? !u.is_kyc_complete :
      filter === 'admin' ? u.role === 'admin' : true;
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.university?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: '#001A7A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSub}>{filtered.length} of {users.length} users</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name, email, university..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        data={filterOptions}
        keyExtractor={i => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        renderItem={({ item }) => {
          const count =
            item.key === 'all' ? users.length :
            item.key === 'verified' ? users.filter(u => u.is_kyc_complete).length :
            item.key === 'unverified' ? users.filter(u => !u.is_kyc_complete).length :
            users.filter(u => u.role === 'admin').length;
          return (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, {
                backgroundColor: filter === item.key ? '#003EC7' : colors.surface,
                borderColor: filter === item.key ? '#003EC7' : colors.border,
              }]}
            >
              <Text style={[styles.filterText, { color: filter === item.key ? '#fff' : colors.foregroundSecondary }]}>
                {item.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={u => String(u.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No users found</Text>
          </View>
        )}
        renderItem={({ item: user }) => {
          const tier = getTier(user.trust_score);
          const tierColor = TIER_COLOR[tier];
          const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: '#003EC7' }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: colors.foreground }]}>{user.full_name}</Text>
                    {user.role === 'admin' && (
                      <View style={styles.adminBadge}>
                        <Ionicons name="shield-checkmark" size={10} color="#FFD700" />
                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.userEmail, { color: colors.muted }]}>{user.email}</Text>
                  <Text style={[styles.userUni, { color: colors.muted }]}>{user.university}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.kycBadge, { backgroundColor: user.is_kyc_complete ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Ionicons
                      name={user.is_kyc_complete ? 'checkmark-circle' : 'time-outline'}
                      size={10}
                      color={user.is_kyc_complete ? '#3B7D4A' : '#B86A00'}
                    />
                    <Text style={[styles.kycText, { color: user.is_kyc_complete ? '#3B7D4A' : '#B86A00' }]}>
                      {user.is_kyc_complete ? 'KYC Done' : 'Pending'}
                    </Text>
                  </View>
                  <View style={styles.tierRow}>
                    <Ionicons name="ribbon" size={10} color={tierColor} />
                    <Text style={[styles.tierText, { color: tierColor }]}>{tier}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                <MiniStat label="Trust Score" value={String(user.trust_score)} colors={colors} />
                <MiniStat label="Loan Limit" value={`GHS ${parseFloat(user.loan_limit).toFixed(0)}`} colors={colors} />
                <MiniStat label="Joined" value={new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} colors={colors} />
              </View>

              {!user.is_verified && user.role !== 'admin' && (
                <TouchableOpacity
                  style={[styles.verifyBtn, { borderColor: '#006875' }]}
                  onPress={() => Alert.alert('Verify User', `Manually verify ${user.full_name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Verify', onPress: () => verifyMutation.mutate(user.id) },
                  ])}
                >
                  <Ionicons name="shield-checkmark-outline" size={14} color="#006875" />
                  <Text style={styles.verifyBtnText}>Manually Verify User</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function MiniStat({ label, value, colors }: any) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'PlusJakartaSans_400Regular' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  filterText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  userCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1A1A2E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  adminBadgeText: { color: '#FFD700', fontSize: 9, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  userEmail: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  userUni: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  kycText: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tierText: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  miniStatValue: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  miniStatLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  verifyBtnText: { color: '#006875', fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  empty: { borderRadius: 16, padding: 40, alignItems: 'center', gap: 10, borderWidth: 1 },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
});
