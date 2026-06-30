import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Alert, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Button } from '@/components/Button';
import { apiPost } from '@/lib/api';

export default function MomoPinScreen() {
  const router = useRouter();
  const { amount, loanId } = useLocalSearchParams<{ amount: string; loanId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const payAmount = parseFloat(amount || '0');

  async function handleConfirm() {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter your 4-digit MoMo PIN.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiPost('/api/transactions/momo-repay', {
        loan_id: parseInt(loanId),
        amount: payAmount,
        pin,
      });

      Alert.alert(
        'Payment Successful',
        `GHS ${payAmount.toFixed(2)} has been deducted from your MoMo wallet.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/loans'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Payment Failed', e.message || 'Unable to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mobile Money Payment</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.amountCard, { backgroundColor: colors.primaryContainer }]}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>GHS {payAmount.toFixed(2)}</Text>
        </View>

        <View style={[styles.pinCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.pinLabel, { color: colors.foreground }]}>Enter MoMo PIN</Text>
          <Text style={[styles.pinHint, { color: colors.muted }]}>
            Enter your 4-digit Mobile Money PIN to authorize this payment.
          </Text>

          <View style={styles.pinInputContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  {
                    borderColor: colors.border,
                    backgroundColor: pin[index] ? colors.primaryContainer : colors.surface,
                  },
                ]}
              >
                <Text style={[styles.pinDotText, { color: colors.foreground }]}>
                  {pin[index] ? '•' : ''}
                </Text>
              </View>
            ))}
          </View>

          <TextInput
            style={styles.hiddenInput}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoFocus
          />

          <View style={[styles.secureRow, { borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
            <Text style={[styles.secureText, { color: colors.muted }]}>
              Your PIN is encrypted and secure.
            </Text>
          </View>
        </View>

        <Button
          title="Confirm Payment"
          onPress={handleConfirm}
          loading={loading}
          size="lg"
          disabled={pin.length !== 4}
        />
      </View>
    </KeyboardAvoidingView>
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
  body: { flex: 1, padding: 20, gap: 20 },
  amountCard: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 4 },
  amountLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  amountValue: { fontSize: 36, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 },
  pinCard: { borderRadius: 16, padding: 24, gap: 16, borderWidth: 1 },
  pinLabel: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },
  pinHint: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', lineHeight: 20 },
  pinInputContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  pinDot: {
    width: 50, height: 55, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  pinDotText: { fontSize: 32, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  hiddenInput: { height: 0, opacity: 0 },
  secureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8,
  },
  secureText: { flex: 1, fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 16 },
});
