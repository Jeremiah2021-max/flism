import { View, Text, StyleSheet, Image, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { useColors } from '@/hooks/useColors';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <LinearGradient
      colors={['#001A7A', '#003EC7', '#0052FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 32 }]}
    >
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Logo area */}
      <View style={[styles.topSection, { paddingTop: 24 }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Flism</Text>
        <Text style={styles.tagline}>Student Finance,{'\n'}Powered by Trust</Text>
      </View>

      {/* Feature bullets */}
      <View style={styles.features}>
        {[
          { icon: 'lock-closed-outline' as const, text: 'Collateral-secured microloans' },
          { icon: 'flash-outline' as const, text: 'Fast approval in 24 hours' },
          { icon: 'trending-up-outline' as const, text: 'Build your trust score over time' },
          { icon: 'school-outline' as const, text: 'Made for Ghanaian students' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name={f.icon} size={16} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <Button
          title="Create Account"
          onPress={() => router.push('/(auth)/register')}
          size="lg"
          style={styles.primaryBtn}
          textStyle={{ color: '#0052FF' }}
        />
        <Button
          title="Sign In"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
          size="lg"
          style={styles.ghostBtn}
          textStyle={{ color: '#fff' }}
        />
        <Text style={styles.disclaimer}>
          Available for university students in Ghana
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle1: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -100,
  },
  circle2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(0,198,224,0.12)', bottom: 80, left: -60,
  },
  topSection: { alignItems: 'center', paddingHorizontal: 24, flex: 1 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  logo: { width: 56, height: 56, borderRadius: 12 },
  appName: {
    fontSize: 38, fontWeight: '800', color: '#fff',
    fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1,
  },
  tagline: {
    fontSize: 22, color: 'rgba(255,255,255,0.85)', textAlign: 'center',
    fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 8, lineHeight: 30,
  },
  features: { paddingHorizontal: 32, gap: 12, marginTop: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: {
    fontSize: 15, color: 'rgba(255,255,255,0.88)',
    fontFamily: 'PlusJakartaSans_500Medium', flex: 1,
  },
  cta: { paddingHorizontal: 24, gap: 12, marginTop: 40 },
  primaryBtn: { backgroundColor: '#fff', borderRadius: 14 },
  ghostBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 14 },
  disclaimer: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', fontFamily: 'PlusJakartaSans_400Regular', marginTop: 4,
  },
});
