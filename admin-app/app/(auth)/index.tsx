import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password.trim());
      router.replace('/dashboard');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials or not an admin account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={{ flex: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: topPad + 40, paddingBottom: 40 }}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: '#003EC7' }]}>
              <Text style={styles.logoText}>F</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Flism Admin</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Sign in to manage the platform</Text>
          </View>

          <View style={{ gap: 16, marginTop: 32 }}>
            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="admin@flism.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#003EC7' }, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              Admin access only. Contact support if you need access.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoContainer: { alignItems: 'center', gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  title: { fontSize: 28, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  label: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  button: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  footer: { marginTop: 32, paddingTop: 24, alignItems: 'center' },
  footerText: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
});
