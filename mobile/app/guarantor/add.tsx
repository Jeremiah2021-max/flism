import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { Button } from '@/components/Button';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import * as Haptics from 'expo-haptics';

const RELATIONSHIPS = ['Parent', 'Guardian', 'Sibling', 'Relative', 'Lecturer', 'Friend'];

interface Guarantor {
  id: number; name: string; phone: string; email: string;
  relationship: string; is_verified: boolean; created_at: string;
}

export default function GuarantorScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: guarantors = [], isLoading } = useQuery({
    queryKey: ['/api/guarantors'],
    queryFn: () => apiGet<Guarantor[]>('/api/guarantors'),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiPost('/api/guarantors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guarantors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trust'] });
      setShowForm(false);
      setName(''); setPhone(''); setEmail(''); setRelationship('Parent');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/guarantors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/guarantors'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Name and phone are required.');
      return;
    }
    addMutation.mutate({ name: name.trim(), phone: phone.trim(), email: email.trim(), relationship });
  }

  function handleDelete(g: Guarantor) {
    Alert.alert('Remove Guarantor', `Remove ${g.name} as your guarantor?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(g.id) },
    ]);
  }

  if (showSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={[styles.successHero, { paddingTop: topPad + 20 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="people" size={64} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Guarantor Added!</Text>
          <Text style={styles.successAmount}>+10 Trust Points</Text>
          <Text style={styles.successRef}>{relationship}: {name}</Text>
        </LinearGradient>
        <View style={{ padding: 24, gap: 16 }}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={20} color="#3B7D4A" />
            <Text style={[styles.confirmText, { color: colors.foreground }]}>
              Your guarantor has been successfully added to your account.
            </Text>
          </View>
          <View style={[styles.confirmCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
            <Ionicons name="ribbon" size={20} color="#3B7D4A" />
            <Text style={[styles.confirmText, { color: '#3B7D4A' }]}>
              Trust score increased by 10 points. Maximum 3 guarantors allowed.
            </Text>
          </View>
          <View style={[styles.confirmCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primaryContainer} />
            <Text style={[styles.confirmText, { color: colors.foreground }]}>
              Your guarantor will be contacted for verification if needed.
            </Text>
          </View>
          <Button title="Back to Profile" onPress={() => router.replace('/(tabs)/profile')} size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#001A7A', '#003EC7']} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Guarantors</Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={styles.addBtn}
          disabled={guarantors.length >= 3}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primaryContainer + '12', borderColor: colors.primaryContainer + '30' }]}>
          <Ionicons name="people-outline" size={20} color={colors.primaryContainer} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.primaryContainer }]}>Why add a guarantor?</Text>
            <Text style={[styles.infoText, { color: colors.foregroundSecondary }]}>
              Each guarantor adds 10 trust points and improves your loan approval chances. Maximum 3 guarantors allowed.
            </Text>
          </View>
        </View>

        {/* Add form */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Add New Guarantor</Text>
            <InputField label="Full Name *" placeholder="Kwame Mensah" value={name} onChangeText={setName} icon="person-outline" colors={colors} />
            <InputField label="Phone Number *" placeholder="024 XXX XXXX" value={phone} onChangeText={setPhone} icon="call-outline" colors={colors} keyboardType="phone-pad" />
            <InputField label="Email (optional)" placeholder="kwame@email.com" value={email} onChangeText={setEmail} icon="mail-outline" colors={colors} keyboardType="email-address" autoCapitalize="none" />

            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Relationship *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {RELATIONSHIPS.map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRelationship(r)}
                    style={[styles.chip, {
                      backgroundColor: relationship === r ? colors.primaryContainer : colors.surfaceVariant,
                      borderColor: relationship === r ? colors.primaryContainer : colors.border,
                    }]}
                  >
                    <Text style={[styles.chipText, { color: relationship === r ? '#fff' : colors.foregroundSecondary }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Button title="Add Guarantor" onPress={handleAdd} loading={addMutation.isPending} style={{ marginTop: 4 }} />
          </View>
        )}

        {/* Guarantors list */}
        {isLoading ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>Loading...</Text>
        ) : guarantors.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No guarantors yet</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Add a parent, guardian, or trusted contact as your guarantor to increase trust and loan eligibility.
            </Text>
            <Button title="Add Your First Guarantor" onPress={() => setShowForm(true)} style={{ marginTop: 8, alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>
              {guarantors.length} OF 3 GUARANTORS ADDED
            </Text>
            {guarantors.map((g) => (
              <View key={g.id} style={[styles.guarantorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={styles.avatarText}>{g.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gName, { color: colors.foreground }]}>{g.name}</Text>
                  <Text style={[styles.gSub, { color: colors.muted }]}>{g.relationship} · {g.phone}</Text>
                  {g.email ? <Text style={[styles.gSub, { color: colors.muted }]}>{g.email}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[styles.statusPill, { backgroundColor: g.is_verified ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Text style={[styles.statusText, { color: g.is_verified ? '#3B7D4A' : '#B86A00' }]}>
                      {g.is_verified ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(g)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InputField({ label, placeholder, value, onChangeText, icon, colors, keyboardType, autoCapitalize }: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.foregroundSecondary }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  infoTitle: { fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 3 },
  infoText: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  formCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
  formTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  sectionTitle: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.5, paddingHorizontal: 2 },
  guarantorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  gName: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  gSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', gap: 10, borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', lineHeight: 20 },
  successHero: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center', gap: 8 },
  successIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  successAmount: { fontSize: 32, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5 },
  successRef: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  confirmCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  confirmText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 20 },
});
