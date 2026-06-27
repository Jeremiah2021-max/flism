import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPut } from '@/lib/api';

interface AdminAsset {
  id: number; type: string; brand: string; model: string; serial_number: string;
  estimated_value: string; loan_value: string; status: string; condition: string;
  description: string; created_at: string;
  full_name: string; email: string; phone: string; university: string;
}

const STATUS_COLOR: Record<string, { text: string; bg: string }> = {
  pending:  { text: '#B86A00', bg: '#FFF3E0' },
  approved: { text: '#006875', bg: '#E0F5F7' },
  rejected: { text: '#BA1A1A', bg: '#FFDAD6' },
  seized:   { text: '#6B7080', bg: '#F0F2F8' },
};

const ASSET_ICONS: Record<string, string> = {
  smartphone: 'phone-portrait-outline',
  laptop: 'laptop-outline',
  tablet: 'tablet-landscape-outline',
  camera: 'camera-outline',
  motorbike: 'bicycle-outline',
  default: 'cube-outline',
};

export default function AssetsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const { data: assets = [], isLoading, refetch } = useQuery<AdminAsset[]>({
    queryKey: ['/api/admin/assets'],
    queryFn: () => apiGet('/api/admin/assets'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiPut(`/api/admin/assets/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      Alert.alert('Approved', 'Asset verified. Student trust score +15 pts.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPut(`/api/admin/assets/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleApprove(asset: AdminAsset) {
    Alert.alert(
      'Verify Asset',
      `Approve ${asset.brand ? asset.brand + ' ' : ''}${asset.type} submitted by ${asset.full_name}?\n\nEstimated value: GHS ${parseFloat(asset.estimated_value).toFixed(2)}\nLoan value: GHS ${parseFloat(asset.loan_value).toFixed(2)}\nCondition: ${asset.condition}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify Asset', onPress: () => approveMutation.mutate(asset.id) },
      ]
    );
  }

  function handleReject(asset: AdminAsset) {
    Alert.alert(
      'Reject Asset',
      `Reject asset submitted by ${asset.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ id: asset.id, reason: 'Asset could not be verified. Please resubmit with clearer photos.' }) },
      ]
    );
  }

  const statusFilters = ['pending', 'approved', 'rejected', 'all'];

  const filtered = assets.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.type?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: '#001A7A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Asset Management</Text>
          <Text style={styles.headerSub}>{filtered.length} of {assets.length} assets</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name or asset type..."
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
        data={statusFilters}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        renderItem={({ item }) => {
          const count = item === 'all' ? assets.length : assets.filter(a => a.status === item).length;
          return (
            <TouchableOpacity
              onPress={() => setFilter(item)}
              style={[styles.filterChip, { backgroundColor: filter === item ? '#003EC7' : colors.surface, borderColor: filter === item ? '#003EC7' : colors.border }]}
            >
              <Text style={[styles.filterText, { color: filter === item ? '#fff' : colors.foregroundSecondary }]}>
                {item.charAt(0).toUpperCase() + item.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={a => String(a.id)}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="shield-outline" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No {filter === 'all' ? '' : filter} assets found</Text>
          </View>
        )}
        renderItem={({ item: asset }) => {
          const sc = STATUS_COLOR[asset.status] ?? STATUS_COLOR.rejected;
          const assetIcon = (ASSET_ICONS[asset.type?.toLowerCase()] ?? ASSET_ICONS.default) as any;
          return (
            <View style={[styles.assetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.assetTop}>
                <View style={[styles.assetIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <Ionicons name={assetIcon} size={24} color={colors.primaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetName, { color: colors.foreground }]}>
                    {[asset.brand, asset.model, asset.type].filter(Boolean).join(' ')}
                  </Text>
                  <Text style={[styles.assetOwner, { color: colors.foregroundSecondary }]}>{asset.full_name}</Text>
                  <Text style={[styles.assetEmail, { color: colors.muted }]}>{asset.university}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{asset.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={[styles.valueRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[styles.valueLabel, { color: colors.muted }]}>Est. Value</Text>
                  <Text style={[styles.valueAmount, { color: colors.foreground }]}>GHS {parseFloat(asset.estimated_value).toFixed(0)}</Text>
                </View>
                <View style={[styles.valueDivider, { backgroundColor: colors.border }]} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[styles.valueLabel, { color: colors.muted }]}>Loan Value</Text>
                  <Text style={[styles.valueAmount, { color: colors.primaryContainer }]}>GHS {parseFloat(asset.loan_value).toFixed(0)}</Text>
                </View>
                <View style={[styles.valueDivider, { backgroundColor: colors.border }]} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[styles.valueLabel, { color: colors.muted }]}>Condition</Text>
                  <Text style={[styles.valueAmount, { color: colors.foreground }]}>{asset.condition}</Text>
                </View>
              </View>

              {asset.serial_number ? (
                <Text style={[styles.serialText, { color: colors.muted }]}>S/N: {asset.serial_number}</Text>
              ) : null}
              <Text style={[styles.dateText, { color: colors.muted }]}>
                Submitted {new Date(asset.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>

              {asset.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.rejectBtn, { borderColor: colors.error }]} onPress={() => handleReject(asset)} disabled={rejectMutation.isPending}>
                    <Ionicons name="close-outline" size={16} color={colors.error} />
                    <Text style={[styles.rejectBtnText, { color: colors.error }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(asset)} disabled={approveMutation.isPending}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Verify Asset</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
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
  assetCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  assetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  assetIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  assetName: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  assetOwner: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  assetEmail: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  valueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  valueLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 3 },
  valueAmount: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  valueDivider: { width: 1, height: 32 },
  serialText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  dateText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5 },
  rejectBtnText: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: '#003EC7' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  empty: { borderRadius: 16, padding: 40, alignItems: 'center', gap: 10, borderWidth: 1 },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
});
