import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/Button';
import * as Haptics from 'expo-haptics';

const ASSET_TYPES = ['Smartphone', 'Laptop', 'Tablet', 'Gaming Console', 'Camera', 'Motorbike', 'Other'];
const CONDITIONS = ['Brand New', 'Excellent', 'Good', 'Fair'];

export default function SubmitAssetScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const queryClient = useQueryClient();

  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [value, setValue] = useState('');
  const [condition, setCondition] = useState('Good');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () => apiPost('/api/assets', {
      type: type.toLowerCase(),
      brand, model, serial_number: serial,
      estimated_value: parseFloat(value),
      condition: condition.toLowerCase(),
      description,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Asset Submitted!', 'Your asset has been submitted for verification. You will be notified within 24 hours.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll access is required to add photos.'); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  }

  function validate() {
    if (!type) { Alert.alert('Select asset type'); return false; }
    if (!value || parseFloat(value) < 200) { Alert.alert('Invalid value', 'Minimum asset value is GHS 200'); return false; }
    if (!serial.trim()) { Alert.alert('Serial number required', 'Enter the IMEI/serial number for verification'); return false; }
    return true;
  }

  const estimatedLoan = value ? (parseFloat(value) * 0.55).toFixed(2) : '0.00';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Submit Asset</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomPad + 20 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.stepSub, { color: colors.muted }]}>Provide accurate details for faster verification</Text>

        {/* Asset Type */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Asset Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {ASSET_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, { backgroundColor: type === t ? colors.primaryContainer : colors.surfaceVariant, borderColor: type === t ? colors.primaryContainer : colors.border }]}
                onPress={() => setType(t)}
              >
                <Ionicons name={getTypeIcon(t)} size={16} color={type === t ? '#fff' : colors.muted} />
                <Text style={[styles.typeText, { color: type === t ? '#fff' : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Brand & Model */}
        <View style={styles.row}>
          <InputField label="Brand" placeholder="e.g. Samsung" value={brand} onChange={setBrand} colors={colors} flex />
          <InputField label="Model" placeholder="e.g. Galaxy A54" value={model} onChange={setModel} colors={colors} flex />
        </View>

        {/* Serial / IMEI */}
        <InputField label="IMEI / Serial Number *" placeholder="Enter device serial number" value={serial} onChange={setSerial} colors={colors} />

        {/* Estimated Value */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Estimated Market Value (GHS) *</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.currencyLabel, { color: colors.primaryContainer }]}>GHS</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, fontSize: 18, fontWeight: '700' }]}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
            />
          </View>
          {value && parseFloat(value) >= 200 && (
            <View style={[styles.loanEstimate, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.primaryContainer} />
              <Text style={[styles.loanEstimateText, { color: colors.primaryContainer }]}>
                Estimated loan value: GHS {estimatedLoan} (55% of asset value)
              </Text>
            </View>
          )}
        </View>

        {/* Condition */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Condition</Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.conditionBtn, { backgroundColor: condition === c ? colors.primaryContainer : colors.surfaceVariant, borderColor: condition === c ? colors.primaryContainer : colors.border }]}
                onPress={() => setCondition(c)}
              >
                <Text style={[styles.conditionText, { color: condition === c ? '#fff' : colors.foreground }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <InputField label="Additional Description" placeholder="Any notable features, accessories, or issues..." value={description} onChange={setDescription} colors={colors} multiline />

        {/* Photos */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foregroundSecondary }]}>Photos (optional)</Text>
          <View style={styles.photosRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImg} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 4 && (
              <TouchableOpacity style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]} onPress={pickPhoto}>
                <Ionicons name="camera-outline" size={24} color={colors.muted} />
                <Text style={[styles.addPhotoText, { color: colors.muted }]}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit */}
        <View style={[styles.noteBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryContainer} />
          <Text style={[styles.noteText, { color: colors.foregroundSecondary }]}>
            Our team will verify your asset within 24 hours. You may be asked to bring it in for physical inspection at your campus office.
          </Text>
        </View>

        <Button
          title={mutation.isPending ? 'Submitting...' : 'Submit for Verification'}
          onPress={() => validate() && mutation.mutate()}
          loading={mutation.isPending}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}

function InputField({ label, placeholder, value, onChange, colors, multiline, flex }: any) {
  return (
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={[styles.label, { color: colors.foregroundSecondary }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground }, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

function getTypeIcon(type: string): any {
  const map: Record<string, string> = {
    Smartphone: 'phone-portrait-outline', Laptop: 'laptop-outline',
    Tablet: 'tablet-portrait-outline', 'Gaming Console': 'game-controller-outline',
    Camera: 'camera-outline', Motorbike: 'bicycle-outline', Other: 'cube-outline',
  };
  return map[type] ?? 'cube-outline';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  body: { padding: 20, gap: 16 },
  stepSub: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  field: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  typeText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  currencyLabel: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  loanEstimate: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8 },
  loanEstimateText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 },
  conditionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  conditionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  conditionText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  photosRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoThumb: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 4, right: 4 },
  addPhoto: { width: 80, height: 80, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium' },
  noteBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
});
