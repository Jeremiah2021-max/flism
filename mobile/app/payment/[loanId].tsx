import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { apiGet, apiPost } from '@/lib/api';

interface Loan {
  id: number; amount: string; interest_rate: string; amount_repaid: string;
  purpose: string; status: string; repayment_date: string;
  days_overdue?: number; penalty_amount?: number; total_due?: number;
}

export default function PaymentScreen() {
  const router = useRouter();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ reference: string; amount: string; fully_paid: boolean } | null>(null);

  const { data: loan } = useQuery({
    queryKey: [`/api/loans/${loanId}`],
    queryFn: () => apiGet<Loan>(`/api/loans/${loanId}`),
    enabled: !!loanId,
  });

  const totalDue = loan?.total_due
    ?? (loan ? parseFloat(loan.amount) * (1 + parseFloat(loan.interest_rate) / 100) - parseFloat(loan.amount_repaid || '0') : 0);
  const displayDue = Math.max(totalDue, 0);

  async function handlePay() {
    const payAmount = parseFloat(amount);
    if (!amount || isNaN(payAmount) || payAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
      return;
    }
    if (payAmount > displayDue + 1) {
      Alert.alert('Too much', `Payment cannot exceed GHS ${displayDue.toFixed(2)}`);
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay GHS ${payAmount.toFixed(2)} via Paystack\n\nThis will be applied to your loan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Pay',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await apiPost('/api/transactions/repay', {
                loan_id: parseInt(loanId),
                amount: payAmount,
              });

              if (result.payment_url) {
                // Open Paystack payment page
                if (Platform.OS === 'web') {
                  window.open(result.payment_url, '_blank');
                } else {
                  // For mobile, we would use WebView or in-app browser
                  // For now, we'll show a message with the URL
                  Alert.alert(
                    'Payment Initiated',
                    'Complete your payment in the browser. You will be redirected back after payment.',
                    [
                      { text: 'Open Payment', onPress: () => {
                        // In a real app, you would use expo-web-browser or similar
                        Alert.alert('Payment URL', result.payment_url);
                      }},
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }
              }

              // Poll for payment verification
              const checkPayment = setInterval(async () => {
                try {
                  const verifyResult = await apiGet(`/api/transactions/verify/${result.reference}`);
                  if (verifyResult.transaction?.status === 'success') {
                    clearInterval(checkPayment);
                    queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
                    queryClient.invalidateQueries({ queryKey: [`/api/loans/${loanId}`] });
                    queryClient.invalidateQueries({ queryKey: ['/api/trust'] });
                    setSuccess({
                      reference: result.reference,
                      amount: payAmount.toFixed(2),
                      fully_paid: verifyResult.fully_paid,
                    });
                  }
                } catch (e) {
                  // Ignore verification errors during polling
                }
              }, 3000);

              // Stop polling after 5 minutes
              setTimeout(() => clearInterval(checkPayment), 300000);

            } catch (e: any) {
              Alert.alert('Payment Failed', e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={[styles.successHero, { paddingTop: topPad + 20 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successAmount}>GHS {success.amount}</Text>
          <Text style={styles.successRef}>Ref: {success.reference}</Text>
        </LinearGradient>
        <View style={{ padding: 24, gap: 16 }}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="card-outline" size={20} color={colors.primaryContainer} />
            <Text style={[styles.confirmText, { color: colors.foreground }]}>
              Paystack payment of GHS {success.amount} received.
            </Text>
          </View>
          {success.fully_paid && (
            <View style={[styles.confirmCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
              <Ionicons name="ribbon" size={20} color="#3B7D4A" />
              <Text style={[styles.confirmText, { color: '#3B7D4A' }]}>
                Loan fully settled! Your trust score increased by 30 points.
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
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Make Payment</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Due summary */}
        {loan && (
          <LinearGradient colors={['#003EC7', '#0052FF']} style={styles.dueCard}>
            <Text style={styles.dueLabel}>Total Due</Text>
            <Text style={styles.dueAmount}>GHS {displayDue.toFixed(2)}</Text>
            <Text style={styles.duePurpose}>{loan.purpose}</Text>
            {(loan.days_overdue ?? 0) > 0 && (
              <View style={styles.overdueRow}>
                <Ionicons name="warning-outline" size={14} color="#FFCC00" />
                <Text style={styles.overdueText}>
                  {loan.days_overdue} days overdue · Penalty: GHS {(loan.penalty_amount ?? 0).toFixed(2)}
                </Text>
              </View>
            )}
          </LinearGradient>
        )}

        {/* Amount */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>PAYMENT AMOUNT (GHS)</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.currencyLabel, { color: colors.muted }]}>GHS</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold' }]}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity onPress={() => setAmount(displayDue.toFixed(2))}>
              <Text style={[styles.maxBtn, { color: colors.primaryContainer }]}>MAX</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.helperText, { color: colors.muted }]}>
            Outstanding balance: GHS {displayDue.toFixed(2)}
          </Text>
        </View>

        <Button
          title={`Pay GHS ${amount ? parseFloat(amount).toFixed(2) : '0.00'} via Mobile Money`}
          onPress={() => {
            if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
              Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
              return;
            }
            if (parseFloat(amount) > displayDue + 1) {
              Alert.alert('Too much', `Payment cannot exceed GHS ${displayDue.toFixed(2)}`);
              return;
            }
            router.push(`/payment/momo-pin?amount=${amount}&loanId=${loanId}` as any);
          }}
          size="lg"
          style={{ marginTop: 4 }}
        />

        <View style={[styles.secureRow, { borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={[styles.secureText, { color: colors.muted }]}>
            Payments are processed securely. Reference will be sent to your number.
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
  dueCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 4 },
  dueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_500Medium' },
  dueAmount: { fontSize: 42, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 },
  duePurpose: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  overdueText: { fontSize: 12, color: '#FFCC00', fontFamily: 'PlusJakartaSans_600SemiBold' },
  sectionLabel: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.5 },
  providerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  providerDot: { width: 12, height: 12, borderRadius: 6 },
  providerName: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  currencyLabel: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  maxBtn: { fontSize: 12, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  helperText: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', paddingHorizontal: 4 },
  secureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  secureText: { flex: 1, fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 16 },
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
