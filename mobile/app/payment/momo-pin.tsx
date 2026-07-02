import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Alert, Animated, Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { apiPost, apiGet } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

type Stage = 'confirm' | 'waiting' | 'success' | 'failed';

const PROVIDER_META: Record<string, { color: string; logo: string }> = {
  'MTN MoMo':         { color: '#FFC107', logo: 'M' },
  'mtn':              { color: '#FFC107', logo: 'M' },
  'Vodafone Cash':    { color: '#E53935', logo: 'V' },
  'vod':              { color: '#E53935', logo: 'V' },
  'AirtelTigo Money': { color: '#FF6F00', logo: 'A' },
  'tgo':              { color: '#FF6F00', logo: 'A' },
};

export default function MomoPinScreen() {
  const router = useRouter();
  const { amount, loanId } = useLocalSearchParams<{ amount: string; loanId: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<Stage>('confirm');
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState('');
  const [fullyPaid, setFullyPaid] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const payAmount = parseFloat(amount || '0');
  const provider = (user as any)?.momo_provider || 'MTN MoMo';
  const momoNumber = (user as any)?.momo_number || '';
  const providerMeta = PROVIDER_META[provider] || PROVIDER_META['MTN MoMo'];

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (stage !== 'waiting') return;
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [stage]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    if (stage !== 'waiting' || !reference) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 40;

    const poll = async () => {
      while (!cancelled && attempts < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 3000));
        if (cancelled) break;
        attempts++;
        try {
          const result = await apiGet<{ status: string; fully_paid: boolean }>(
            `/api/transactions/momo-status/${reference}`
          );
          if (result.status === 'success') {
            setFullyPaid(result.fully_paid);
            queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
            queryClient.invalidateQueries({ queryKey: [`/api/loans/${loanId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/trust'] });
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
            setStage('success');
            return;
          }
          if (result.status === 'failed') {
            setErrorMsg('Payment was declined by your network provider.');
            setStage('failed');
            return;
          }
        } catch (_e) { /* network hiccup — keep polling */ }
      }
      if (!cancelled) {
        setErrorMsg('Payment timed out. If your wallet was debited, it will be reversed automatically.');
        setStage('failed');
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [stage, reference]);

  async function handleSendRequest() {
    if (!momoNumber) {
      Alert.alert('No MoMo number', 'Please complete your KYC to add a Mobile Money number.');
      return;
    }
    setLoading(true);
    try {
      const result = await apiPost<{ reference: string }>('/api/transactions/momo-charge', {
        loan_id: parseInt(loanId),
        amount: payAmount,
      });
      setReference(result.reference);
      setStage('waiting');
    } catch (e: any) {
      Alert.alert('Failed to initiate', e.message || 'Unable to send payment request. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={[styles.heroGrad, { paddingTop: topPad + 24 }]}>
          <View style={styles.heroIcon}><Ionicons name="checkmark-circle" size={72} color="#fff" /></View>
          <Text style={styles.heroTitle}>Payment Successful</Text>
          <Text style={styles.heroAmount}>GHS {payAmount.toFixed(2)}</Text>
          <Text style={styles.heroSub}>{provider} · {momoNumber}</Text>
          <Text style={styles.heroRef}>Ref: {reference}</Text>
        </LinearGradient>
        <View style={{ padding: 24, gap: 14 }}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.primaryContainer} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              GHS {payAmount.toFixed(2)} debited from your {provider} wallet.
            </Text>
          </View>
          {fullyPaid && (
            <View style={[styles.infoCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
              <Ionicons name="ribbon" size={20} color="#3B7D4A" />
              <Text style={[styles.infoText, { color: '#3B7D4A' }]}>
                Loan fully settled! Your trust score increased by 30 points.
              </Text>
            </View>
          )}
          <Button title="Back to Loans" onPress={() => router.replace('/(tabs)/loans')} size="lg" />
        </View>
      </View>
    );
  }

  if (stage === 'failed') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#7F0000', '#B71C1C']} style={[styles.heroGrad, { paddingTop: topPad + 24 }]}>
          <View style={styles.heroIcon}><Ionicons name="close-circle" size={72} color="#fff" /></View>
          <Text style={styles.heroTitle}>Payment Failed</Text>
          <Text style={styles.heroSub}>{errorMsg}</Text>
        </LinearGradient>
        <View style={{ padding: 24, gap: 14 }}>
          <Button title="Try Again" onPress={() => { setStage('confirm'); setReference(''); setErrorMsg(''); }} size="lg" />
          <Button title="Back to Loans" onPress={() => router.replace('/(tabs)/loans')} size="lg" variant="ghost" />
        </View>
      </View>
    );
  }

  if (stage === 'waiting') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.topBar, { paddingTop: topPad + 12 }]}>
          <Text style={styles.topBarTitle}>Mobile Money Payment</Text>
        </LinearGradient>
        <View style={styles.waitBody}>
          <Animated.View style={[styles.providerRing, { borderColor: providerMeta.color, transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.providerCircle, { backgroundColor: providerMeta.color }]}>
              <Text style={styles.providerLetter}>{providerMeta.logo}</Text>
            </View>
          </Animated.View>
          <Text style={[styles.waitTitle, { color: colors.foreground }]}>Waiting for Approval</Text>
          <Text style={[styles.waitSub, { color: colors.muted }]}>
            A payment prompt has been sent to{'\n'}
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: colors.foreground }}>{momoNumber}</Text>
          </Text>
          <View style={[styles.stepList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { icon: 'phone-portrait-outline', text: 'Check your phone for a USSD prompt or push notification' },
              { icon: 'keypad-outline', text: `Enter your ${provider} PIN to approve GHS ${payAmount.toFixed(2)}` },
              { icon: 'checkmark-circle-outline', text: 'This screen updates automatically once approved' },
            ].map((step, i) => (
              <View key={i} style={[styles.stepRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.stepIcon, { backgroundColor: colors.surfaceContainer }]}>
                  <Ionicons name={step.icon as any} size={18} color={colors.primaryContainer} />
                </View>
                <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
              </View>
            ))}
          </View>
          <Animated.View style={[styles.spinner, { borderColor: colors.border, borderTopColor: colors.primaryContainer, transform: [{ rotate: spin }] }]} />
          <Text style={[styles.waitNote, { color: colors.muted }]}>Waiting up to 2 minutes…</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/loans')} style={{ marginTop: 8 }}>
            <Text style={[styles.cancelLink, { color: colors.muted }]}>Cancel and go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mobile Money Payment</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.confirmBody}>
        <LinearGradient colors={['#003EC7', '#0052FF']} style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>GHS {payAmount.toFixed(2)}</Text>
        </LinearGradient>

        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.detailHeading, { color: colors.muted }]}>PAYMENT METHOD</Text>
          <View style={styles.detailRow}>
            <View style={[styles.providerBadge, { backgroundColor: providerMeta.color + '22' }]}>
              <View style={[styles.providerDot, { backgroundColor: providerMeta.color }]}>
                <Text style={styles.providerDotText}>{providerMeta.logo}</Text>
              </View>
              <Text style={[styles.providerName, { color: colors.foreground }]}>{provider}</Text>
            </View>
            {momoNumber ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.momoNum, { color: colors.foreground }]}>{momoNumber}</Text>
                <Text style={[styles.momoTag, { color: colors.muted }]}>Registered wallet</Text>
              </View>
            ) : (
              <Text style={[styles.momoMissing, { color: '#B71C1C' }]}>No number on file</Text>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.howRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text style={[styles.howText, { color: colors.muted }]}>
              Tapping "Send Request" will prompt your phone. Approve it with your {provider} PIN.
            </Text>
          </View>
        </View>

        {!momoNumber && (
          <View style={[styles.warnCard, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
            <Ionicons name="warning-outline" size={18} color="#E65100" />
            <Text style={[styles.warnText, { color: '#E65100' }]}>
              No Mobile Money number found. Please complete KYC first.
            </Text>
          </View>
        )}

        <Button
          title={`Send GHS ${payAmount.toFixed(2)} Payment Request`}
          onPress={handleSendRequest}
          loading={loading}
          size="lg"
          disabled={!momoNumber || loading}
        />

        <View style={[styles.secureRow, { borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={[styles.secureText, { color: colors.muted }]}>
            Secured by Paystack · Your PIN stays on your phone
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', flex: 1, textAlign: 'center' },
  confirmBody: { flex: 1, padding: 20, gap: 16 },
  amountCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 4 },
  amountLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_500Medium' },
  amountValue: { fontSize: 42, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 },
  detailCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  detailHeading: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  providerDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  providerDotText: { fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  providerName: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  momoNum: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  momoTag: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1 },
  momoMissing: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  divider: { height: 1 },
  howRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  howText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  warnCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  warnText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  secureText: { flex: 1, fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  waitBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  providerRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  providerCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  providerLetter: { fontSize: 36, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  waitTitle: { fontSize: 22, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center' },
  waitSub: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', lineHeight: 22 },
  stepList: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  stepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  spinner: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  waitNote: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  cancelLink: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', textDecorationLine: 'underline' },
  heroGrad: { paddingHorizontal: 24, paddingBottom: 48, alignItems: 'center', gap: 8 },
  heroIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  heroAmount: { fontSize: 40, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'PlusJakartaSans_400Regular' },
  heroRef: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'PlusJakartaSans_400Regular' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 20 },
});
