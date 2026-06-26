import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

const UNIVERSITIES = [
  'University of Ghana', 'KNUST', 'University of Cape Coast',
  'GIMPA', 'Ashesi University', 'Ghana Institute of Management',
  'University of Professional Studies', 'Other',
];

const YEARS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Postgraduate'];
const MOMO_PROVIDERS = ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money'];

const STEP_LABELS = ['Personal', 'Student', 'Security'];

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useColors();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [university, setUniversity] = useState('University of Ghana');
  const [otherUniversity, setOtherUniversity] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('Level 100');
  const [momoProvider, setMomoProvider] = useState('MTN MoMo');
  const [momoNumber, setMomoNumber] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  function goBack() {
    if (step === 1) router.back();
    else setStep((s) => (s - 1) as any);
  }

  function nextStep() {
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || !phone.trim()) {
        Alert.alert('Missing fields', 'Please fill in name, email and phone.');
        return;
      }
      if (!email.includes('@')) {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!department.trim()) {
        Alert.alert('Missing fields', 'Please enter your department.');
        return;
      }
      setStep(3);
    }
  }

  async function handleRegister() {
    if (!password || password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        phone,
        university: university === 'Other' ? otherUniversity.trim() || 'Other' : university,
        student_id: studentId,
        department: department.trim(),
        faculty: faculty.trim(),
        year_of_study: yearOfStudy,
        momo_number: momoNumber.trim() || undefined,
        momo_provider: momoProvider,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ flexGrow: 1, paddingTop: topPad + 16, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.steps}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, {
              backgroundColor: step >= s ? colors.primaryContainer : colors.border,
              width: step === s ? 28 : 8,
            }]} />
          ))}
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: colors.primaryContainer + '18' }]}>
          <Text style={[styles.badgeText, { color: colors.primaryContainer }]}>
            Step {step} of 3 — {STEP_LABELS[step - 1]}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {step === 1 ? 'Create your account' : step === 2 ? 'Academic details' : 'Secure your account'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {step === 1
            ? 'Tell us about yourself to get started'
            : step === 2
            ? 'Your student details help verify your eligibility'
            : 'Set a strong password to protect your account'}
        </Text>

        {step === 1 && (
          <View style={styles.form}>
            <InputField label="Full Name *" placeholder="Kwame Asante" value={fullName} onChangeText={setFullName} icon="person-outline" colors={colors} />
            <InputField label="Email Address *" placeholder="kwame@ug.edu.gh" value={email} onChangeText={setEmail} icon="mail-outline" colors={colors} keyboardType="email-address" autoCapitalize="none" />
            <InputField label="Phone Number *" placeholder="0244 123 456" value={phone} onChangeText={setPhone} icon="call-outline" colors={colors} keyboardType="phone-pad" />

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>University *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 8 }}>
                {UNIVERSITIES.map(u => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUniversity(u)}
                    style={[styles.chip, { backgroundColor: university === u ? colors.primaryContainer : colors.surfaceVariant, borderColor: university === u ? colors.primaryContainer : colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: university === u ? '#fff' : colors.foregroundSecondary }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {university === 'Other' && (
                <View style={[styles.otherInput, { borderColor: colors.primaryContainer, backgroundColor: colors.surfaceVariant }]}>
                  <Ionicons name="school-outline" size={16} color={colors.muted} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Enter your university name"
                    placeholderTextColor={colors.muted}
                    value={otherUniversity}
                    onChangeText={setOtherUniversity}
                    style={{ flex: 1, color: colors.foreground, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 }}
                    autoFocus
                  />
                </View>
              )}
            </View>

            <Button title="Continue" onPress={nextStep} size="lg" style={{ marginTop: 4 }} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <InputField label="Student ID" placeholder="10XXXXXXX" value={studentId} onChangeText={setStudentId} icon="card-outline" colors={colors} autoCapitalize="none" />
            <InputField label="Department *" placeholder="Computer Science" value={department} onChangeText={setDepartment} icon="book-outline" colors={colors} />
            <InputField label="Faculty / School" placeholder="School of Engineering" value={faculty} onChangeText={setFaculty} icon="library-outline" colors={colors} />

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Year of Study *</Text>
              <View style={styles.chipWrap}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYearOfStudy(y)}
                    style={[styles.chip, { backgroundColor: yearOfStudy === y ? colors.primaryContainer : colors.surfaceVariant, borderColor: yearOfStudy === y ? colors.primaryContainer : colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: yearOfStudy === y ? '#fff' : colors.foregroundSecondary }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, { borderColor: colors.border }]} />

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Mobile Money Provider</Text>
              <View style={styles.chipWrap}>
                {MOMO_PROVIDERS.map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setMomoProvider(p)}
                    style={[styles.chip, { backgroundColor: momoProvider === p ? colors.primaryContainer : colors.surfaceVariant, borderColor: momoProvider === p ? colors.primaryContainer : colors.border }]}
                  >
                    <Ionicons name="phone-portrait-outline" size={12} color={momoProvider === p ? '#fff' : colors.muted} />
                    <Text style={[styles.chipText, { color: momoProvider === p ? '#fff' : colors.foregroundSecondary }]}>
                      {p.replace(' Money', '').replace(' Cash', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <InputField label="Mobile Money Number (optional)" placeholder="024 XXX XXXX" value={momoNumber} onChangeText={setMomoNumber} icon="call-outline" colors={colors} keyboardType="phone-pad" />

            <Button title="Continue" onPress={nextStep} size="lg" style={{ marginTop: 4 }} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Password *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.strengthFill, {
                    width: `${Math.min(password.length / 12 * 100, 100)}%` as any,
                    backgroundColor: password.length < 8 ? '#EF4444' : password.length < 12 ? '#F59E0B' : '#22C55E',
                  }]} />
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Confirm Password *</Text>
              <View style={[styles.inputWrapper, { borderColor: confirmPassword && confirmPassword !== password ? colors.error : colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Repeat password"
                  placeholderTextColor={colors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPw}
                />
                {confirmPassword.length > 0 && (
                  <Ionicons
                    name={confirmPassword === password ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={confirmPassword === password ? '#22C55E' : colors.error}
                  />
                )}
              </View>
            </View>

            {/* Summary */}
            <View style={[styles.summaryBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Account Summary</Text>
              <SummaryRow icon="person-outline" label={fullName} colors={colors} />
              <SummaryRow icon="school-outline" label={`${university} · ${yearOfStudy}`} colors={colors} />
              <SummaryRow icon="book-outline" label={department || 'No department'} colors={colors} />
              {momoNumber ? <SummaryRow icon="phone-portrait-outline" label={`${momoProvider.split(' ')[0]} · ${momoNumber}`} colors={colors} /> : null}
            </View>

            <View style={[styles.termsBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryContainer} />
              <Text style={[styles.termsText, { color: colors.foregroundSecondary }]}>
                By registering, you agree to Flism's Terms of Service. Your data is protected under Ghana data privacy laws.
              </Text>
            </View>

            <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" style={{ marginTop: 4 }} />
            <Button title="Already have an account? Sign in" onPress={() => router.replace('/(auth)/login')} variant="ghost" textStyle={{ color: colors.primaryContainer, textDecorationLine: 'underline' }} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function SummaryRow({ icon, label, colors }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text style={{ flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: colors.foregroundSecondary }}>{label}</Text>
    </View>
  );
}

function InputField({ label, placeholder, value, onChangeText, icon, colors, keyboardType, autoCapitalize }: any) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.foregroundSecondary }]}>{label}</Text>
      <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={18} color={colors.muted} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'words'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { height: 8, borderRadius: 4 },
  content: { paddingHorizontal: 24, flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  title: { fontSize: 26, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 24 },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5,
  },
  chipText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    otherInput: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 10, borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  strengthBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  strengthFill: { height: '100%', borderRadius: 2 },
  divider: { borderTopWidth: 1 },
  summaryBox: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 2 },
  summaryTitle: { fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 },
  termsBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  termsText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
});
