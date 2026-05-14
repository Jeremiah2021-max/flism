import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { apiPost } from '@/lib/api';

const STEPS = [
  { title: 'Identity', icon: 'card-outline', desc: 'Verify with your Ghana Card' },
  { title: 'Student', icon: 'school-outline', desc: 'Confirm your academic details' },
  { title: 'Mobile Money', icon: 'phone-portrait-outline', desc: 'Link your MoMo account' },
  { title: 'Review', icon: 'shield-checkmark-outline', desc: 'Submit for verification' },
];

const MOMO_PROVIDERS = ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money'];
const YEARS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Postgraduate'];

export default function KYCScreen() {
  const router = useRouter();
  const colors = useColors();
  const { refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [ghanaCard, setGhanaCard] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');

  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('Level 100');

  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState('MTN MoMo');

  async function handleNext() {
    if (step === 0) {
      if (!ghanaCard.trim() || !dob.trim() || !address.trim()) {
        Alert.alert('Required', 'Please fill in all identity fields.');
        return;
      }
      setLoading(true);
      try {
        await apiPost('/api/users/kyc/identity', {
          ghana_card_number: ghanaCard.trim(),
          date_of_birth: dob.trim(),
          address: address.trim(),
        });
        setStep(1);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    } else if (step === 1) {
      if (!department.trim()) {
        Alert.alert('Required', 'Please enter your department.');
        return;
      }
      setLoading(true);
      try {
        await apiPost('/api/users/kyc/student', {
          department: department.trim(),
          faculty: faculty.trim(),
          year_of_study: yearOfStudy,
        });
        setStep(2);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!momoNumber.trim()) {
        Alert.alert('Required', 'Please enter your Mobile Money number.');
        return;
      }
      setLoading(true);
      try {
        await apiPost('/api/users/kyc/momo', {
          momo_number: momoNumber.trim(),
          momo_provider: momoProvider,
        });
        setStep(3);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      setLoading(true);
      try {
        await apiPost('/api/users/kyc/complete', {});
        await refreshUser();
        queryClient.invalidateQueries({ queryKey: ['/api/trust'] });
        Alert.alert(
          'KYC Submitted!',
          'Your identity has been verified. Your trust score and loan limit have increased.',
          [{ text: 'Continue', onPress: () => router.back() }]
        );
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Step indicator */}
      <View style={[styles.stepBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              { backgroundColor: i < step ? '#3B7D4A' : i === step ? colors.primaryContainer : colors.border }
            ]}>
              {i < step
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Text style={[styles.stepNum, { color: i === step ? '#fff' : colors.muted }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, { color: i === step ? colors.primaryContainer : colors.muted }]} numberOfLines={1}>
              {s.title}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.stepIcon, { backgroundColor: colors.primaryContainer + '18' }]}>
            <Ionicons name={STEPS[step].icon as any} size={28} color={colors.primaryContainer} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{STEPS[step].title}</Text>
          <Text style={[styles.cardDesc, { color: colors.muted }]}>{STEPS[step].desc}</Text>
        </View>

        {step === 0 && (
          <View style={styles.form}>
            <Field label="Ghana Card Number *" placeholder="GHA-000000000-0" value={ghanaCard} onChangeText={setGhanaCard} icon="card-outline" colors={colors} autoCapitalize="characters" />
            <Field label="Date of Birth *" placeholder="DD/MM/YYYY" value={dob} onChangeText={setDob} icon="calendar-outline" colors={colors} keyboardType="numeric" />
            <Field label="Residential Address *" placeholder="House No., Street, City" value={address} onChangeText={setAddress} icon="location-outline" colors={colors} multiline />
            <InfoBox icon="information-circle-outline" text="Your Ghana Card details are encrypted and used only for identity verification." colors={colors} />
          </View>
        )}

        {step === 1 && (
          <View style={styles.form}>
            <Field label="Department *" placeholder="Computer Science" value={department} onChangeText={setDepartment} icon="book-outline" colors={colors} />
            <Field label="Faculty / School" placeholder="School of Engineering" value={faculty} onChangeText={setFaculty} icon="library-outline" colors={colors} />
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Year of Study *</Text>
              <View style={styles.chips}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYearOfStudy(y)}
                    style={[styles.chip, {
                      backgroundColor: yearOfStudy === y ? colors.primaryContainer : colors.surfaceVariant,
                      borderColor: yearOfStudy === y ? colors.primaryContainer : colors.border,
                    }]}
                  >
                    <Text style={[styles.chipText, { color: yearOfStudy === y ? '#fff' : colors.foregroundSecondary }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <InfoBox icon="school-outline" text="Student verification adds 20 points to your trust score and increases loan eligibility." colors={colors} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Mobile Money Provider *</Text>
              <View style={styles.providerRow}>
                {MOMO_PROVIDERS.map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setMomoProvider(p)}
                    style={[styles.providerChip, {
                      backgroundColor: momoProvider === p ? colors.primaryContainer : colors.surface,
                      borderColor: momoProvider === p ? colors.primaryContainer : colors.border,
                    }]}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={14}
                      color={momoProvider === p ? '#fff' : colors.muted}
                    />
                    <Text style={[styles.providerText, { color: momoProvider === p ? '#fff' : colors.foreground }]}>
                      {p.replace(' Money', '').replace(' Cash', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Field label="Mobile Money Number *" placeholder="024 XXX XXXX" value={momoNumber} onChangeText={setMomoNumber} icon="call-outline" colors={colors} keyboardType="phone-pad" />
            <InfoBox icon="lock-closed-outline" text="Your MoMo number is used for loan disbursement and repayments. It is securely stored." colors={colors} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <ReviewRow label="Ghana Card" value={ghanaCard || '(saved)'} icon="card-outline" colors={colors} />
            <ReviewRow label="Date of Birth" value={dob || '(saved)'} icon="calendar-outline" colors={colors} />
            <ReviewRow label="Department" value={department || '(saved)'} icon="book-outline" colors={colors} />
            <ReviewRow label="Year of Study" value={yearOfStudy} icon="school-outline" colors={colors} />
            <ReviewRow label="Mobile Money" value={`${momoProvider} — ${momoNumber || '(saved)'}`} icon="phone-portrait-outline" colors={colors} />
            <View style={[styles.infoBox, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#3B7D4A" />
              <Text style={[styles.infoText, { color: '#3B7D4A' }]}>
                Submitting this will complete your KYC. You'll receive +50 trust points and an increased loan limit.
              </Text>
            </View>
          </View>
        )}

        <Button
          title={step === 3 ? 'Submit KYC' : 'Continue'}
          onPress={handleNext}
          loading={loading}
          size="lg"
          style={{ marginTop: 8 }}
        />
        {step > 0 && step < 3 && (
          <Button
            title="Save & Continue Later"
            variant="ghost"
            onPress={() => router.back()}
            textStyle={{ color: colors.muted }}
          />
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, placeholder, value, onChangeText, icon, colors, keyboardType, autoCapitalize, multiline }: any) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.foregroundSecondary }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface, alignItems: multiline ? 'flex-start' : 'center' }]}>
        <Ionicons name={icon} size={18} color={colors.muted} style={multiline ? { marginTop: 2 } : {}} />
        <TextInput
          style={[styles.input, { color: colors.foreground }, multiline && { height: 72, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'words'}
          multiline={!!multiline}
        />
      </View>
    </View>
  );
}

function InfoBox({ icon, text, colors }: any) {
  return (
    <View style={[styles.infoBox, { backgroundColor: colors.primaryContainer + '12', borderColor: colors.primaryContainer + '30' }]}>
      <Ionicons name={icon} size={16} color={colors.primaryContainer} />
      <Text style={[styles.infoText, { color: colors.foregroundSecondary }]}>{text}</Text>
    </View>
  );
}

function ReviewRow({ label, value, icon, colors }: any) {
  return (
    <View style={[styles.reviewRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.primaryContainer} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.reviewLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.reviewValue, { color: colors.foreground }]}>{value}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={16} color="#3B7D4A" />
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
  stepBar: {
    flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, gap: 0,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  stepLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center' },
  body: { padding: 20, gap: 14, paddingBottom: 40 },
  stepCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1,
  },
  stepIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cardDesc: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  inputWrap: {
    flexDirection: 'row', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1.5,
  },
  chipText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  providerRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  providerChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  providerText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  infoBox: {
    flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  reviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  reviewLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
  reviewValue: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
