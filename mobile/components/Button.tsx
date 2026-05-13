import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';

async function triggerHaptic() {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* ignore on web */ }
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, textStyle, size = 'md' }: ButtonProps) {
  const colors = useColors();
  const paddingV = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  const baseStyle: ViewStyle = {
    borderRadius: colors.radius,
    paddingVertical: paddingV,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled || loading ? 0.6 : 1,
  };

  const variantStyle: ViewStyle = variant === 'primary'
    ? { backgroundColor: colors.primaryContainer }
    : variant === 'secondary'
    ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primaryContainer }
    : variant === 'danger'
    ? { backgroundColor: colors.error }
    : { backgroundColor: 'transparent' };

  const textColor = variant === 'primary' || variant === 'danger'
    ? '#fff'
    : variant === 'secondary'
    ? colors.primaryContainer
    : colors.foreground;

  async function handlePress() {
    if (disabled || loading) return;
    await triggerHaptic();
    onPress();
  }

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={handlePress}
      style={[baseStyle, variantStyle, style]}
      disabled={disabled || loading}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[{ color: textColor, fontSize, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' }, textStyle]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}
