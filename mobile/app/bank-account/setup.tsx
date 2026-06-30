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
import { Button } from '@/components/Button';
import { apiGet, apiPost } from '@/lib/api';

interface Bank {
  code: string;
  name: string;
}

export default function BankAccountSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const { data: banks = [], isLoading: loadingBanks } = useQuery<Bank[]>({
    queryKey: ['/api/bank/banks'],
    queryFn: () => apiGet<Bank[]>('/api/bank/banks'),
  });

  const resolveMutation = useMutation({
    mutationFn: (data: { account_number: string; bank_code: string }) =>
      apiPost('/api/bank/resolve', data),
    onSuccess: (data) => {
      setAccountName(data.account_name);
      setIsResolving(false);
    },
    onError: (err: any) => {
      Alert.alert('Resolution Failed', err.message || 'Could not resolve account name');
      setIsResolving(false);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiPost('/api/bank/account', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      Alert.alert(
        'Bank Account Saved',
        'Your bank account has been saved successfully. Loan disbursements will be sent to this account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const handleResolveAccount = () => {
    if (!accountNumber.trim() || !bankCode) {
      Alert.alert('Required', 'Please enter account number and select a bank');
      return;
    }
    if (accountNumber.length !== 10) {
      Alert.alert('Invalid', 'Account number must be 10 digits');
      return;
    }
    setIsResolving(true);
    resolveMutation.mutate({ account_number: accountNumber, bank_code: bankCode });
  };

  const handleSave = () => {
    if (!bankName || !bankCode || !accountNumber || !accountName) {
      Alert.alert('Incomplete', 'Please complete all fields');
      return;
    }
    saveMutation.mutate({
      bank_name: bankName,
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
    });
  };

  const selectedBank = banks.find((b: Bank) => b.code === bankCode);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Account Setup</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }]}>
          <Ionicons name="information-circle-outline" size={20} color="#1976D2" />
          <Text style={[styles.infoText, { color: '#1976D2' }]}>
            Add your bank account to receive loan disbursements directly.
          </Text>
        </View>

        {/* Bank Selection */}
        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SELECT BANK</Text>
          {loadingBanks ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primaryContainer} />
            </View>
          ) : (
            <View style={[styles.inputWrap, { borderColor: bankCode ? colors.primaryContainer : colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="business-outline" size={18} color={colors.muted} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Search or select bank"
                placeholderTextColor={colors.muted}
                value={bankName}
                editable={false}
              />
              {bankName && (
                <TouchableOpacity onPress={() => { setBankCode(''); setBankName(''); }}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {!loadingBanks && banks.length > 0 && (
            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
              {banks.slice(0, 20).map((bank: Bank) => (
                <TouchableOpacity
                  key={bank.code}
                  onPress={() => { setBankCode(bank.code); setBankName(bank.name); }}
                  style={[
                    styles.bankItem,
                    { backgroundColor: bankCode === bank.code ? colors.surfaceVariant : colors.surface }
                  ]}
                >
                  <Text style={[styles.bankName, { color: colors.foreground }]}>{bank.name}</Text>
                  {bankCode === bank.code && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primaryContainer} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Account Number */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>ACCOUNT NUMBER</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="card-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="10-digit account number"
              placeholderTextColor={colors.muted}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* Resolve Button */}
        <TouchableOpacity
          onPress={handleResolveAccount}
          disabled={isResolving || !accountNumber || !bankCode}
          style={[
            styles.resolveBtn,
            {
              backgroundColor: isResolving || !accountNumber || !bankCode ? colors.border : colors.primaryContainer,
              opacity: isResolving || !accountNumber || !bankCode ? 0.6 : 1,
            }
          ]}
        >
          {isResolving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="search-outline" size={18} color="#fff" />
              <Text style={styles.resolveBtnText}>Resolve Account Name</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Account Name (Read-only after resolution) */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>ACCOUNT NAME</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="person-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: 'transparent' }]}
              placeholder="Account name will appear here"
              placeholderTextColor={colors.muted}
              value={accountName}
              onChangeText={setAccountName}
              editable={false}
            />
          </View>
        </View>

        <Button
          title="Save Bank Account"
          onPress={handleSave}
          loading={saveMutation.isPending}
          disabled={!accountName}
          size="lg"
          style={{ marginTop: 8 }}
        />

        <View style={[styles.secureRow, { borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={[styles.secureText, { color: colors.muted }]}>
            Your bank account details are encrypted and stored securely with Paystack.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  infoCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  bankItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6,
  },
  bankName: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12,
  },
  resolveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
  secureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  secureText: { flex: 1, fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 16 },
});
