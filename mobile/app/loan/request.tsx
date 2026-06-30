import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { apiPost, apiGet } from '@/lib/api';
import { Button } from '@/components/Button';
import * as Haptics from 'expo-haptics';

interface Asset { id: number; type: string; brand: string; estimated_value: string; loan_value: string; status: string; }

const PURPOSES = ['Tuition Fees', 'Accommodation', 'Books & Supplies', 'Food & Groceries', 'Transport', 'Emergency', 'Business Startup', 'Other'];
const DURATIONS = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
];

export default function RequestLoanScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [duration, setDuration] = useState(30);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  const { data: assets } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: () => apiGet<Asset[]>('/api/assets'),
  });
  const approvedAssets = assets?.filter(a => a.status === 'approved') ?? [];

  const loanLimit = parseFloat(user?.loan_limit ?? '300');
  const amountNum = parseFloat(amount) || 0;
  const selectedAsset = assets?.find(a => a.id === selectedAssetId);
  const interest = amountNum > 0 ? amountNum * 0.05 : 0;
  const totalRepay = amountNum + interest;

  const [showSuccess, setShowSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => apiPost('/api/loans', {
      amount: amountNum,
      purpose: purpose === 'Other' ? customPurpose : purpose,
      asset_id: selectedAssetId,
      duration_days: duration,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  function validateStep1() {
    if (!amountNum || amountNum < 50) {
      Alert.alert('Invalid amount', 'Minimum loan amount is GHS 50'); return false;
    }
    if (amountNum > loanLimit) {
      Alert.alert('Exceeds limit', `Your loan limit is GHS ${loanLimit}`); return false;
    }
    if (!purpose) {
      Alert.alert('Select purpose', 'Please select a loan purpose'); return false;
    }
    if (purpose === 'Other' && !customPurpose.trim()) {
      Alert.alert('Enter purpose', 'Please describe your loan purpose'); return false;
    }
    return true;
  }

  const quickAmounts = [50, 100, 200, Math.min(300, loanLimit)].filter(a => a <= loanLimit);

  if (showSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={[styles.successHero, { paddingTop: topPad + 20 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successAmount}>GHS {amountNum.toFixed(2)}</Text>
          <Text style={styles.successRef}>Loan ID: FL-{Date.now().toString().slice(-6)}</Text>
        </LinearGradient>
        <View style={{ padding: 24, gap: 16 }}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={20} color={colors.primaryContainer} />
            <Text style={[styles.confirmText, { color: colors.foreground }]}>
              Your application is under review. You will be notified within 24 hours.
            </Text>
          </View>
          <View style={[styles.confirmCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#3B7D4A" />
            <Text style={[styles.confirmText, { color: '#3B7D4A' }]}>
              Purpose: {purpose === 'Other' ? customPurpose : purpose} · Duration: {duration} days
            </Text>
          </View>
          {selectedAsset && (
            <View style={[styles.confirmCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="shield-outline" size={20} color={colors.primaryContainer} />
              <Text style={[styles.confirmText, { color: colors.foreground }]}>
                Collateral: {selectedAsset.brand ? `${selectedAsset.brand} ${selectedAsset.type}` : selectedAsset.type}
              </Text>
            </View>
          )}
          <Button title="Back to Loans" onPress={() => router.replace('/(tabs)/loans')} size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => step > 1 ? setStep((step - 1) as any) : router.back()} style={styles.backBtn}>
          <Ionicons name={step === 1 ? 'close' : 'arrow-back'} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Request Loan</Text>
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, { backgroundColor: step >= s ? colors.primaryContainer : colors.border, width: step === s ? 20 : 8 }]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomPad + 20 }]} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>How much do you need?</Text>
            <Text style={[styles.stepSub, { color: colors.muted }]}>Available limit: GHS {loanLimit.toFixed(2)}</Text>

            {/* Amount input */}
            <View style={[styles.amountInput, { borderColor: amountNum > loanLimit ? colors.error : colors.primaryContainer, backgroundColor: colors.surface }]}>
              <Text style={[styles.currency, { color: colors.primaryContainer }]}>GHS</Text>
              <TextInput
                style={[styles.amountText, { color: colors.foreground }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Quick amounts */}
            <View style={styles.quickAmounts}>
              {quickAmounts.map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickBtn, { backgroundColor: amount === String(q) ? colors.primaryContainer : colors.surfaceVariant, borderColor: colors.border }]}
                  onPress={() => setAmount(String(q))}
                >
                  <Text style={[styles.quickBtnText, { color: amount === String(q) ? '#fff' : colors.foreground }]}>GHS {q}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Purpose */}
            <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Purpose</Text>
            <View style={styles.purposeGrid}>
              {PURPOSES.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.purposeChip, { backgroundColor: purpose === p ? colors.primaryContainer : colors.surfaceVariant, borderColor: purpose === p ? colors.primaryContainer : colors.border }]}
                  onPress={() => setPurpose(p)}
                >
                  <Text style={[styles.purposeText, { color: purpose === p ? '#fff' : colors.foreground }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {purpose === 'Other' && (
              <TextInput
                style={[styles.customPurpose, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="Describe your purpose..."
                placeholderTextColor={colors.muted}
                value={customPurpose}
                onChangeText={setCustomPurpose}
                multiline
              />
            )}

            {/* Duration */}
            <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Repayment Period</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map(d => (
                <TouchableOpacity
                  key={d.days}
                  style={[styles.durationBtn, { backgroundColor: duration === d.days ? colors.primaryContainer : colors.surfaceVariant, borderColor: duration === d.days ? colors.primaryContainer : colors.border }]}
                  onPress={() => setDuration(d.days)}
                >
                  <Text style={[styles.durationText, { color: duration === d.days ? '#fff' : colors.foreground }]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Continue" onPress={() => validateStep1() && setStep(2)} size="lg" style={{ marginTop: 20 }} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Select Collateral</Text>
            <Text style={[styles.stepSub, { color: colors.muted }]}>
              Attach an approved asset as collateral (optional for small loans)
            </Text>

            <TouchableOpacity
              style={[styles.noAssetBtn, { borderColor: selectedAssetId === null ? colors.primaryContainer : colors.border, backgroundColor: selectedAssetId === null ? colors.surfaceContainer : colors.surface }]}
              onPress={() => setSelectedAssetId(null)}
            >
              <Ionicons name={selectedAssetId === null ? 'radio-button-on' : 'radio-button-off'} size={18} color={selectedAssetId === null ? colors.primaryContainer : colors.muted} />
              <View>
                <Text style={[styles.assetName, { color: colors.foreground }]}>No collateral</Text>
                <Text style={[styles.assetDetail, { color: colors.muted }]}>For amounts up to GHS {Math.min(300, loanLimit)}</Text>
              </View>
            </TouchableOpacity>

            {approvedAssets.length === 0 && (
              <View style={[styles.noAssetsBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
                <Text style={[styles.noAssetsText, { color: colors.muted }]}>
                  No approved assets. Submit an asset in the Vault tab to use as collateral.
                </Text>
              </View>
            )}

            {approvedAssets.map(asset => (
              <TouchableOpacity
                key={asset.id}
                style={[styles.assetOption, { borderColor: selectedAssetId === asset.id ? colors.primaryContainer : colors.border, backgroundColor: selectedAssetId === asset.id ? colors.surfaceContainer : colors.surface }]}
                onPress={() => setSelectedAssetId(asset.id)}
              >
                <Ionicons name={selectedAssetId === asset.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={selectedAssetId === asset.id ? colors.primaryContainer : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetName, { color: colors.foreground }]}>{asset.brand ? `${asset.brand} ${asset.type}` : asset.type}</Text>
                  <Text style={[styles.assetDetail, { color: colors.muted }]}>Value: GHS {parseFloat(asset.estimated_value).toFixed(0)} · Loan up to GHS {parseFloat(asset.loan_value).toFixed(0)}</Text>
                </View>
                <View style={[styles.approvedBadge, { backgroundColor: '#E0F5F7' }]}>
                  <Text style={[styles.approvedText, { color: '#006875' }]}>Approved</Text>
                </View>
              </TouchableOpacity>
            ))}

            <Button title="Review Application" onPress={() => setStep(3)} size="lg" style={{ marginTop: 20 }} />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Review & Confirm</Text>
            <Text style={[styles.stepSub, { color: colors.muted }]}>Please review your loan details before submitting</Text>

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SummaryRow label="Loan Amount" value={`GHS ${amountNum.toFixed(2)}`} bold colors={colors} />
              <SummaryRow label="Purpose" value={purpose === 'Other' ? customPurpose : purpose} colors={colors} />
              <SummaryRow label="Duration" value={`${duration} days`} colors={colors} />
              <SummaryRow label="Interest (5%)" value={`GHS ${interest.toFixed(2)}`} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SummaryRow label="Total Repayable" value={`GHS ${totalRepay.toFixed(2)}`} bold highlight colors={colors} />
              <SummaryRow label="Collateral" value={selectedAsset ? `${selectedAsset.brand ?? ''} ${selectedAsset.type}`.trim() : 'None'} colors={colors} />
            </View>

            <View style={[styles.warningBox, { backgroundColor: colors.warningContainer, borderColor: '#FFB74D' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Failure to repay on time may result in asset seizure and a negative impact on your trust score.
              </Text>
            </View>

            <Button
              title={mutation.isPending ? 'Submitting...' : 'Submit Application'}
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              size="lg"
              style={{ marginTop: 12 }}
            />
            <Button title="Go Back" onPress={() => setStep(2)} variant="ghost" size="lg" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value, bold, highlight, colors }: any) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: highlight ? colors.primaryContainer : colors.foreground, fontWeight: bold ? '700' : '500', fontSize: bold ? 16 : 14 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  stepIndicator: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  stepDot: { height: 8, borderRadius: 4 },
  body: { padding: 20, gap: 14 },
  stepTitle: { fontSize: 22, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.3 },
  stepSub: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 6 },
  amountInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16,
  },
  currency: { fontSize: 22, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  amountText: { flex: 1, fontSize: 36, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  quickAmounts: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  purposeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  purposeText: { fontSize: 13, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium' },
  customPurpose: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', minHeight: 80, textAlignVertical: 'top' },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  durationText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  noAssetBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  assetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  assetName: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  assetDetail: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  approvedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  approvedText: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  noAssetsBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  noAssetsText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular' },
  summaryCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  summaryValue: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  divider: { height: 1 },
  warningBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  warningText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  successHero: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center', gap: 8 },
  successIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  successAmount: { fontSize: 36, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 },
  successRef: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  confirmCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  confirmText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 20 },
});
