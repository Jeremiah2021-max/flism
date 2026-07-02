import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { apiGet, apiPost } from '@/lib/api';

interface DisbursementAccount {
  has_momo: boolean; momo_number: string; momo_provider: string; momo_registered: boolean;
  has_bank: boolean; bank_name: string; account_number: string; account_name: string;
}
interface Bank { code: string; name: string; }

const PROVIDER_META: Record<string, { color: string; logo: string }> = {
  'MTN MoMo':         { color: '#FFC107', logo: 'M' },
  'Vodafone Cash':    { color: '#E53935', logo: 'V' },
  'AirtelTigo Money': { color: '#FF6F00', logo: 'A' },
};

export default function DisbursementSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [tab, setTab] = useState<'momo' | 'bank'>('momo');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const momoNumber = (user as any)?.momo_number || '';
  const momoProvider = (user as any)?.momo_provider || 'MTN MoMo';
  const providerMeta = PROVIDER_META[momoProvider] || PROVIDER_META['MTN MoMo'];

  const { data: account } = useQuery<DisbursementAccount>({
    queryKey: ['/api/bank/account'],
    queryFn: () => apiGet<DisbursementAccount>('/api/bank/account'),
  });

  const { data: banks = [], isLoading: loadingBanks } = useQuery<Bank[]>({
    queryKey: ['/api/bank/banks'],
    queryFn: () => apiGet<Bank[]>('/api/bank/banks'),
    enabled: tab === 'bank',
  });

  const momoMutation = useMutation({
    mutationFn: () => apiPost('/api/bank/momo-recipient', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/account'] });
      Alert.alert('Wallet Registered ✓', `Your ${momoProvider} wallet (${momoNumber}) is now set up to receive loan disbursements.`, [{ text: 'Great!', onPress: () => router.back() }]);
    },
    onError: (e: any) => Alert.alert('Registration Failed', e.message || 'Please try again.'),
  });

  const resolveMutation = useMutation({
    mutationFn: (data: { account_number: string; bank_code: string }) => apiPost('/api/bank/resolve', data),
    onSuccess: (data: any) => { setAccountName((data as any).account_name); setIsResolving(false); },
    onError: (e: any) => { Alert.alert('Resolution Failed', e.message); setIsResolving(false); },
  });

  const saveBankMutation = useMutation({
    mutationFn: (data: any) => apiPost('/api/bank/account', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/account'] });
      Alert.alert('Bank Account Saved', 'Your bank account has been saved as a disbursement backup.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleResolveAccount() {
    if (!accountNumber || !bankCode) return;
    setIsResolving(true);
    resolveMutation.mutate({ account_number: accountNumber, bank_code: bankCode });
  }

  function handleSaveBank() {
    if (!accountName || !bankCode || !accountNumber) { Alert.alert('Missing info', 'Please resolve your account name first.'); return; }
    saveBankMutation.mutate({ bank_name: bankName, bank_code: bankCode, account_number: accountNumber, account_name: accountName });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disbursement Setup</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primaryContainer} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            When your loan is approved, funds are automatically sent to your disbursement account — no waiting.
          </Text>
        </View>

        {/* Status chips */}
        <View style={styles.statusRow}>
          {[
            { label: `MoMo ${account?.momo_registered ? 'Active' : 'Not set'}`, active: !!account?.momo_registered, icon: account?.momo_registered ? 'checkmark-circle' : 'phone-portrait-outline', activeColor: '#3B7D4A', activeBg: '#E8F5E9', activeBorder: '#A5D6A7' },
            { label: `Bank ${account?.has_bank ? 'Saved' : 'Not set'}`, active: !!account?.has_bank, icon: account?.has_bank ? 'checkmark-circle' : 'card-outline', activeColor: '#1565C0', activeBg: '#E3F2FD', activeBorder: '#90CAF9' },
          ].map((chip, i) => (
            <View key={i} style={[styles.statusChip, { backgroundColor: chip.active ? chip.activeBg : colors.surfaceContainer, borderColor: chip.active ? chip.activeBorder : colors.border }]}>
              <Ionicons name={chip.icon as any} size={14} color={chip.active ? chip.activeColor : colors.muted} />
              <Text style={[styles.statusChipText, { color: chip.active ? chip.activeColor : colors.muted }]}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          {(['momo', 'bank'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && { backgroundColor: colors.primaryContainer }]} onPress={() => setTab(t)}>
              <Ionicons name={t === 'momo' ? 'phone-portrait-outline' : 'card-outline'} size={14} color={tab === t ? '#fff' : colors.muted} />
              <Text style={[styles.tabText, { color: tab === t ? '#fff' : colors.muted }]}>{t === 'momo' ? 'MoMo Wallet' : 'Bank Account'}</Text>
              {t === 'momo' && <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>Primary</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── MoMo Tab ── */}
        {tab === 'momo' && (
          !momoNumber ? (
            <View style={[styles.warnCard, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
              <Ionicons name="warning-outline" size={20} color="#E65100" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.warnTitle, { color: '#E65100' }]}>No MoMo number on file</Text>
                <Text style={[styles.warnText, { color: '#BF360C' }]}>Complete your KYC first to add your Mobile Money number.</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={[styles.momoCard, { backgroundColor: colors.surface, borderColor: account?.momo_registered ? '#A5D6A7' : colors.border }]}>
                <View style={[styles.providerBadge, { backgroundColor: providerMeta.color + '22' }]}>
                  <View style={[styles.providerDot, { backgroundColor: providerMeta.color }]}>
                    <Text style={styles.providerLetter}>{providerMeta.logo}</Text>
                  </View>
                  <View>
                    <Text style={[styles.providerName, { color: colors.foreground }]}>{momoProvider}</Text>
                    <Text style={[styles.momoNum, { color: colors.muted }]}>{momoNumber}</Text>
                  </View>
                </View>
                {account?.momo_registered && (
                  <View style={styles.activeBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#3B7D4A" />
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              {account?.momo_registered ? (
                <View style={[styles.successCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#3B7D4A" />
                  <Text style={[styles.successText, { color: '#2E7D32' }]}>
                    Your {momoProvider} wallet is registered with Paystack. Approved loans will be sent here automatically.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.howCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.howTitle, { color: colors.foreground }]}>How it works</Text>
                    {['Your wallet is registered with Paystack (a one-time step)', 'When a loan is approved, funds arrive in minutes', 'No need to share banking details'].map((step, i) => (
                      <View key={i} style={styles.howStep}>
                        <View style={[styles.howDot, { backgroundColor: colors.primaryContainer }]}>
                          <Text style={styles.howDotNum}>{i + 1}</Text>
                        </View>
                        <Text style={[styles.howStepText, { color: colors.muted }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                  <Button title={`Register ${momoProvider} for Disbursements`} onPress={() => momoMutation.mutate()} loading={momoMutation.isPending} size="lg" />
                </>
              )}
            </>
          )
        )}

        {/* ── Bank Tab ── */}
        {tab === 'bank' && (
          <>
            <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
              <Text style={[styles.infoText, { color: colors.muted }]}>Bank account is used as a fallback if MoMo disbursement is unavailable.</Text>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>SELECT BANK</Text>
              {loadingBanks ? <ActivityIndicator color={colors.primaryContainer} /> : (
                <ScrollView style={[styles.bankList, { borderColor: colors.border }]} nestedScrollEnabled>
                  {banks.map(bank => (
                    <TouchableOpacity key={bank.code} onPress={() => { setBankCode(bank.code); setBankName(bank.name); setAccountName(''); }}
                      style={[styles.bankItem, { borderColor: bankCode === bank.code ? colors.primaryContainer : colors.border, backgroundColor: bankCode === bank.code ? colors.surfaceContainer : colors.surface }]}>
                      <Text style={[styles.bankName, { color: colors.foreground }]}>{bank.name}</Text>
                      {bankCode === bank.code && <Ionicons name="checkmark-circle" size={20} color={colors.primaryContainer} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>ACCOUNT NUMBER</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="card-outline" size={18} color={colors.muted} />
                <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="10-digit account number" placeholderTextColor={colors.muted} value={accountNumber} onChangeText={v => { setAccountNumber(v); setAccountName(''); }} keyboardType="number-pad" maxLength={10} />
              </View>
            </View>

            <TouchableOpacity onPress={handleResolveAccount} disabled={isResolving || !accountNumber || !bankCode}
              style={[styles.resolveBtn, { backgroundColor: isResolving || !accountNumber || !bankCode ? colors.border : colors.primaryContainer, opacity: isResolving || !accountNumber || !bankCode ? 0.6 : 1 }]}>
              {isResolving ? <ActivityIndicator size="small" color="#fff" /> : (<><Ionicons name="search-outline" size={18} color="#fff" /><Text style={styles.resolveBtnText}>Resolve Account Name</Text></>)}
            </TouchableOpacity>

            {accountName ? (
              <View style={[styles.resolvedCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
                <Ionicons name="person-circle-outline" size={20} color="#3B7D4A" />
                <Text style={[styles.resolvedName, { color: '#2E7D32' }]}>{accountName}</Text>
              </View>
            ) : null}

            <Button title="Save Bank Account" onPress={handleSaveBank} loading={saveBankMutation.isPending} disabled={!accountName} size="lg" />
          </>
        )}

        <View style={[styles.secureRow, { borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={[styles.secureText, { color: colors.muted }]}>Account details are stored securely with Paystack — Flism never stores raw banking credentials.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', flex: 1, textAlign: 'center' },
  infoCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  statusChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  tabRow: { flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1, gap: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  recommendedBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  recommendedText: { fontSize: 9, color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
  momoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1.5 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  providerDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  providerLetter: { fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  providerName: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  momoNum: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#3B7D4A' },
  warnCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  warnTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 2 },
  warnText: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  successCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  successText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 },
  howCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  howTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  howDotNum: { fontSize: 11, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  howStepText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.5 },
  bankList: { maxHeight: 200, borderWidth: 1, borderRadius: 12, padding: 6 },
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 5 },
  bankName: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  input: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  resolveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
  resolvedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  resolvedName: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  secureText: { flex: 1, fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 16 },
});
