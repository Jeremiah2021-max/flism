import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.replace('/(auth)');
      else if (user.role !== 'admin') router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  if (!user || user.role !== 'admin') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="loans" />
      <Stack.Screen name="users" />
      <Stack.Screen name="assets" />
    </Stack>
  );
}
