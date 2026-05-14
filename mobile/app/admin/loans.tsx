import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPut } from '@/lib/api';

interface AdminLoan {
  id: number; amount: string; status: string; purpose: string;
  interest_rate: string; duration_days: number; created_at: string;
  full_name: string; email: string; phone: string;
  asset_type: string; asset_brand: string;
  repayment_date: string; amount_repaid: string;
}

const STATUS_FILTERS = ['all', 'pending', 'active', 'repaid', 'defaulted', 'rejected'];
const STATUS_COLOR: Record<string, { text: string; bg: string }> = {
  pending:  { text: '#B86A00', bg: '#FFF3E0' },
  active:   { text: '#006875', bg: '#E0F5F7' },
  repaid:   { text: '#3B7D4A', bg: '#E8F5E9' },
  defaulted:{ text: '#BA1A1A', bg: '#FFDAD6' },
  rejected: { text: '#6B7080', bg: '#F0F2F8' },
};

export default function AdminLoansScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const { data: loans = [], isLoading, refetch } = useQuery<AdminLoan[]>({
    queryKey: ['/api/admin/loans'],
    queryFn: () => apiGet('/api/admin/loans'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiPut(`/api/admin/loans/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      Alert.alert('Approved', 'Loan has been approved and disbursed.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPut(`/api/admin/loans/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleApprove(loan: AdminLoan) {
    Alert.alert(
      'Approve Loan',
      `Approve GHS ${parseFloat(loan.amount).toFixed(2)} loan for ${loan.full_name}?\n\nPurpose: ${loan.purpose}\nCollateral: ${[loan.asset_brand, loan.asset_type].filter(Boolean).join(' ')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve & Disburse', onPress: () => approveMutation.mutate(loan.id) },
      ]
    );
  }

  function handleReject(loan: AdminLoan) {
    Alert.prompt
      ? Alert.prompt(
          'Reject Loan',
          `Reason for rejecting ${loan.full_name}'s loan application:`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reject', style: 'destructive', onPress: (reason) => rejectMutation.mutate({ id: loan.id, reason: reason || 'Application could not be approved at this time.' }) },
          ],
          'plain-text',
          'Insufficient collateral value'
        )
      : Alert.alert(
          'Reject Loan',
          `Reject ${loan.full_name}'s loan of GHS ${parseFloat(loan.amount).toFixed(2)}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ id: loan.id, reason: 'Application could not be approved at this time.' }) },
          ]
        );
  }

  const filtered = loans.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter;
    const matchSearch = !search || l.full_name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: '#001A7A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Loan Management</Text>
          <Text style={styles.headerSub}>{filtered.length} of {loans.length} loans</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name or email..."
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

      {/* Status filter */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        renderItem={({ item }) => {
          const count = item === 'all' ? loans.length : loans.filter(l => l.status === item).length;
          return (
            <TouchableOpacity
              onPress={() => setFilter(item)}
              style={[styles.filterChip, {
                backgroundColor: filter === item ? '#003EC7' : colors.surface,
                borderColor: filter === item ? '#003EC7' : colors.border,
              }]}
            >
              <Text style={[styles.filterText, { color: filter === item ? '#fff' : colors.foregroundSecondary }]}>
                {item.charAt(0).toUpperCase() + item.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Loans list */}
      <FlatList
        data={filtered}
        keyExtractor={l => String(l.id)}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="wallet-outline" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No {filter === 'all' ? '' : filter} loans found</Text>
          </View>
        )}
        renderItem={({ item: loan }) => {
          const sc = STATUS_COLOR[loan.status] ?? STATUS_COLOR.rejected;
          return (
            <View style={[styles.loanCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.loanTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.loanAmount, { color: colors.foreground }]}>GHS {parseFloat(loan.amount).toFixed(2)}</Text>
                  <Text style={[styles.loanName, { color: colors.foregroundSecondary }]}>{loan.full_name}</Text>
                  <Text style={[styles.loanEmail, { color: colors.muted }]}>{loan.email}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{loan.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={[styles.infoGrid, { borderTopColor: colors.border }]}>
                <InfoItem icon="bookmark-outline" label="Purpose" value={loan.purpose} colors={colors} />
                <InfoItem icon="time-outline" label="Duration" value={`${loan.duration_days} days`} colors={colors} />
                <InfoItem icon="trending-up-outline" label="Interest" value={`${loan.interest_rate}%`} colors={colors} />
                {loan.asset_type && <InfoItem icon="shield-outline" label="Collateral" value={[loan.asset_brand, loan.asset_type].filter(Boolean).join(' ')} colors={colors} />}
                <InfoItem icon="calendar-outline" label="Applied" value={new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} colors={colors} />
                {loan.phone && <InfoItem icon="call-outline" label="Phone" value={loan.phone} colors={colors} />}
              </View>

              {loan.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: colors.error }]}
                    onPress={() => handleReject(loan)}
                    disabled={rejectMutation.isPending}
                  >
                    <Ionicons name="close-outline" size={16} color={colors.error} />
                    <Text style={[styles.rejectBtnText, { color: colors.error }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(loan)}
                    disabled={approveMutation.isPending}
                  >
                    <Ionicons name="checkmark-outline" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve & Disburse</Text>
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

function InfoItem({ icon, label, value, colors }: any) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <View>
        <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
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
  loanCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  loanTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  loanAmount: { fontSize: 20, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  loanName: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  loanEmail: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTopWidth: 1 },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, width: '46%' },
  infoLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular' },
  infoValue: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5 },
  rejectBtnText: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: '#003EC7' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  empty: { borderRadius: 16, padding: 40, alignItems: 'center', gap: 10, borderWidth: 1 },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
});
