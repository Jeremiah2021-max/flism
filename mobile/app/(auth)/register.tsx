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
  'University of Ghana',
  'KNUST',
  'University of Cape Coast',
  'GIMPA',
  'Ashesi University',
  'Ghana Institute of Management',
  'Other',
];

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useColors();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('University of Ghana');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function nextStep() {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setStep(2);
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
      await register({ email: email.trim().toLowerCase(), password, full_name: fullName.trim(), phone, university, student_id: studentId });
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
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.steps}>
          {[1, 2].map(s => (
            <View key={s} style={[styles.stepDot, { backgroundColor: step >= s ? colors.primaryContainer : colors.border, width: step === s ? 24 : 8 }]} />
          ))}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: colors.primaryContainer }]}>Step {step} of 2</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {step === 1 ? 'Create your account' : 'Secure your account'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {step === 1 ? 'Tell us a bit about yourself' : 'Choose a strong password to protect your account'}
        </Text>

        {step === 1 ? (
          <View style={styles.form}>
            <InputField label="Full Name *" placeholder="Kwame Asante" value={fullName} onChangeText={setFullName} icon="person-outline" colors={colors} />
            <InputField label="Email Address *" placeholder="kwame@ug.edu.gh" value={email} onChangeText={setEmail} icon="mail-outline" colors={colors} keyboardType="email-address" autoCapitalize="none" />
            <InputField label="Phone Number *" placeholder="0244 123 456" value={phone} onChangeText={setPhone} icon="call-outline" colors={colors} keyboardType="phone-pad" />
            <InputField label="Student ID" placeholder="10XXXXXXX" value={studentId} onChangeText={setStudentId} icon="card-outline" colors={colors} />

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>University</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 8 }}>
                {UNIVERSITIES.map(u => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUniversity(u)}
                    style={[styles.uniChip, { backgroundColor: university === u ? colors.primaryContainer : colors.surfaceVariant, borderColor: university === u ? colors.primaryContainer : colors.border }]}
                  >
                    <Text style={[styles.uniChipText, { color: university === u ? '#fff' : colors.foregroundSecondary }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Button title="Continue" onPress={nextStep} size="lg" style={{ marginTop: 8 }} />
          </View>
        ) : (
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
                  <Ionicons name={confirmPassword === password ? 'checkmark-circle' : 'close-circle'} size={18} color={confirmPassword === password ? colors.success : colors.error} />
                )}
              </View>
            </View>

            <View style={[styles.termsBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryContainer} />
              <Text style={[styles.termsText, { color: colors.foregroundSecondary }]}>
                By registering, you agree to our Terms of Service and confirm you are a student in Ghana.
              </Text>
            </View>

            <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" style={{ marginTop: 8 }} />

            <Button title="Already have an account? Sign in" onPress={() => router.replace('/(auth)/login')} variant="ghost" textStyle={{ color: colors.primaryContainer, textDecorationLine: 'underline' }} />
          </View>
        )}
      </View>
    </ScrollView>
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
    backgroundColor: '#EEF2FF', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  title: { fontSize: 26, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 28 },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  uniChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5,
  },
  uniChipText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  termsBox: {
    flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1,
  },
  termsText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
});
