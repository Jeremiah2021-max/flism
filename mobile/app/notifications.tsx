import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPut } from '@/lib/api';

interface Notification {
  id: number; title: string; message: string;
  type: string; is_read: boolean; created_at: string;
}

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  info:    { icon: 'information-circle-outline', color: '#0052FF', bg: '#EEF2FF' },
  success: { icon: 'checkmark-circle-outline', color: '#006875', bg: '#E0F5F7' },
  warning: { icon: 'alert-circle-outline', color: '#B86A00', bg: '#FFF3E0' },
  error:   { icon: 'close-circle-outline', color: '#BA1A1A', bg: '#FFDAD6' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => apiGet<{ notifications: Notification[]; unread_count: number }>('/api/notifications'),
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiPut('/api/notifications/read-all', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiPut(`/api/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
          {unread > 0 && <Text style={[styles.unreadCount, { color: colors.muted }]}>{unread} unread</Text>}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={() => readAllMutation.mutate()} style={styles.markAllBtn}>
            <Text style={[styles.markAllText, { color: colors.primaryContainer }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
        scrollEnabled={!!notifications.length}
        ListEmptyComponent={() =>
          !isLoading ? (
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>You're all caught up!</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <NotifItem notif={item} colors={colors} onPress={() => !item.is_read && markReadMutation.mutate(item.id)} />
        )}
      />
    </View>
  );
}

function NotifItem({ notif, colors, onPress }: { notif: Notification; colors: any; onPress: () => void }) {
  const config = TYPE_ICONS[notif.type] ?? TYPE_ICONS.info;
  const time = new Date(notif.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity
      style={[styles.notifCard, { backgroundColor: notif.is_read ? colors.surface : colors.surfaceVariant, borderColor: notif.is_read ? colors.cardBorder : colors.primaryContainer + '40' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {!notif.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primaryContainer }]} />}
      <View style={[styles.iconBg, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as any} size={20} color={config.color} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTop}>
          <Text style={[styles.notifTitle, { color: colors.foreground }]}>{notif.title}</Text>
          <Text style={[styles.notifTime, { color: colors.muted }]}>{time}</Text>
        </View>
        <Text style={[styles.notifMsg, { color: colors.foregroundSecondary }]}>{notif.message}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  unreadCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  notifCard: { borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, borderWidth: 1, position: 'relative' },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  iconBg: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifContent: { flex: 1, gap: 4 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  notifTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', flex: 1 },
  notifTime: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', flexShrink: 0 },
  notifMsg: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  empty: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 8, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
});
