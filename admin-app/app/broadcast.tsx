import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

const TYPES = [
  { key: 'info', label: 'Info', color: '#0052FF', bg: '#EEF2FF', icon: 'information-circle-outline' as const },
  { key: 'success', label: 'Success', color: '#3B7D4A', bg: '#E8F5E9', icon: 'checkmark-circle-outline' as const },
  { key: 'warning', label: 'Warning', color: '#B86A00', bg: '#FFF3E0', icon: 'alert-circle-outline' as const },
  { key: 'error', label: 'Alert', color: '#BA1A1A', bg: '#FFDAD6', icon: 'warning-outline' as const },
];

export default function BroadcastScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [loading, setLoading] = useState(false);

  async function handleBroadcast() {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Please enter a title and message.');
      return;
    }
    Alert.alert(
      'Send Broadcast',
      `Send "${title}" to all students?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send to All',
          onPress: async () => {
            setLoading(true);
            try {
              await apiPost('/api/admin/notify/broadcast', { title: title.trim(), message: message.trim(), type });
              Alert.alert('Sent!', 'Notification sent to all students.');
              setTitle('');
              setMessage('');
              setType('info');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to send notification.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  const selectedType = TYPES.find(t => t.key === type) ?? TYPES[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: '#001A7A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Broadcast</Text>
          <Text style={styles.headerSub}>Send notifications to all students</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notification Type</Text>
          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setType(t.key)}
                style={[
                  styles.typeChip,
                  { borderColor: type === t.key ? t.color : colors.border, backgroundColor: type === t.key ? t.bg : colors.surface },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon} size={16} color={type === t.key ? t.color : colors.muted} />
                <Text style={[styles.typeChipText, { color: type === t.key ? t.color : colors.muted }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notification Title</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
            placeholder="e.g. System Maintenance Tonight"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <Text style={[styles.charCount, { color: colors.muted }]}>{title.length}/80</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Message</Text>
          <TextInput
            style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
            placeholder="Enter the notification message..."
            placeholderTextColor={colors.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.muted }]}>{message.length}/500</Text>
        </View>

        {title.length > 0 && message.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewLabel, { color: colors.muted }]}>PREVIEW</Text>
            <View style={[styles.previewCard, { backgroundColor: selectedType.bg, borderColor: selectedType.color + '66' }]}>
              <View style={styles.previewTop}>
                <Ionicons name={selectedType.icon} size={18} color={selectedType.color} />
                <Text style={[styles.previewTitle, { color: selectedType.color }]}>{title}</Text>
              </View>
              <Text style={[styles.previewMessage, { color: colors.foregroundSecondary }]}>{message}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.sendBtn, (loading || !title.trim() || !message.trim()) && { opacity: 0.6 }]}
          onPress={handleBroadcast}
          disabled={loading || !title.trim() || !message.trim()}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="megaphone-outline" size={20} color="#fff" />
                <Text style={styles.sendBtnText}>Send to All Students</Text>
              </>
          }
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={[styles.infoText, { color: colors.muted }]}>
            This will send a push notification to every student on the platform. Use this for important announcements only.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'PlusJakartaSans_400Regular' },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  typeChipText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  textarea: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', minHeight: 120 },
  charCount: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'right' },
  previewSection: { gap: 8 },
  previewLabel: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.8 },
  previewCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, gap: 6 },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', flex: 1 },
  previewMessage: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#003EC7', borderRadius: 16, height: 56 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 17 },
});
