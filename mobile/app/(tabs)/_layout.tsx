import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

function TabIcon({ name, focusedName, color, focused }: {
  name: any; focusedName: any; color: string; focused: boolean;
}) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 14, paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: focused ? color + '18' : 'transparent',
    }}>
      <Ionicons name={focused ? focusedName : name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)');
    }
  }, [user, isLoading, router]);

  if (!user) return null;

  const tabBarHeight = Platform.OS === 'web' ? 88 : 76;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryContainer,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'web' ? 34 : 14,
          paddingTop: 6,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'PlusJakartaSans_600SemiBold',
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" focusedName="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="wallet-outline" focusedName="wallet" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="shield-checkmark-outline" focusedName="shield-checkmark" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trust"
        options={{
          title: 'Trust',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="ribbon-outline" focusedName="ribbon" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-circle-outline" focusedName="person-circle" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
