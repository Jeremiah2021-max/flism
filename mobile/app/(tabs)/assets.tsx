import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

interface Asset {
  id: number; type: string; description: string; brand: string; model: string;
  estimated_value: string; loan_value: string; status: string; condition: string;
  created_at: string;
}

const ASSET_ICONS: Record<string, string> = {
  smartphone: 'phone-portrait-outline',
  laptop: 'laptop-outline',
  tablet: 'tablet-portrait-outline',
  'gaming console': 'game-controller-outline',
  camera: 'camera-outline',
  motorbike: 'bicycle-outline',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  pending:  { color: '#B86A00', bg: '#FFF3E0' },
  approved: { color: '#006875', bg: '#E0F5F7' },
  rejected: { color: '#BA1A1A', bg: '#FFDAD6' },
  seized:   { color: '#6B7080', bg: '#F0F2F8' },
};

export default function AssetsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: assets, isLoading, refetch } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: () => apiGet<Asset[]>('/api/assets'),
  });

  const totalValue = assets?.reduce((s, a) => s + parseFloat(a.estimated_value), 0) ?? 0;
  const totalLoanable = assets?.filter(a => a.status === 'approved').reduce((s, a) => s + parseFloat(a.loan_value), 0) ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Asset Vault</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>Your collateral portfolio</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => router.push('/asset/submit')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Asset</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={assets ?? []}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!(assets && assets.length > 0)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryContainer} />}
        ListHeaderComponent={() =>
          assets && assets.length > 0 ? (
            <View style={[styles.summary, { backgroundColor: colors.primaryContainer }]}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Value</Text>
                <Text style={styles.summaryValue}>GHS {totalValue.toFixed(0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Loanable</Text>
                <Text style={styles.summaryValue}>GHS {totalLoanable.toFixed(0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Assets</Text>
                <Text style={styles.summaryValue}>{assets?.length ?? 0}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={() =>
          isLoading ? null : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={52} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Vault is empty</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Submit a physical asset as collateral to apply for loans.
              </Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primaryContainer }]} onPress={() => router.push('/asset/submit')}>
                <Text style={styles.emptyBtnText}>Submit First Asset</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <AssetCard asset={item} colors={colors} onPress={() => router.push(`/asset/${item.id}` as any)} />
        )}
      />
    </View>
  );
}

function AssetCard({ asset, colors, onPress }: { asset: Asset; colors: any; onPress: () => void }) {
  const s = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.pending;
  const iconName = (ASSET_ICONS[asset.type.toLowerCase()] ?? 'cube-outline') as any;
  const date = new Date(asset.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardContent}>
        <View style={[styles.assetIcon, { backgroundColor: colors.surfaceContainer }]}>
          <Ionicons name={iconName} size={22} color={colors.primaryContainer} />
        </View>
        <View style={styles.assetInfo}>
          <View style={styles.assetTop}>
            <Text style={[styles.assetType, { color: colors.foreground }]}>
              {asset.brand ? `${asset.brand} ${asset.type}` : asset.type}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.color }]}>{asset.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.assetDesc, { color: colors.muted }]} numberOfLines={1}>
            {asset.model || asset.description || asset.type}
          </Text>
          <View style={styles.assetMeta}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Value</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>GHS {parseFloat(asset.estimated_value).toFixed(0)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Loan up to</Text>
              <Text style={[styles.metaValue, { color: colors.primaryContainer }]}>GHS {parseFloat(asset.loan_value || '0').toFixed(0)}</Text>
            </View>
            <Text style={[styles.dateText, { color: colors.muted }]}>{date}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  headerSub: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  summary: { borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_400Regular' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  card: { borderRadius: 16, padding: 14, borderWidth: 1 },
  cardContent: { flexDirection: 'row', gap: 12 },
  assetIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  assetInfo: { flex: 1, gap: 4 },
  assetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetType: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  assetDesc: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  assetMeta: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  metaItem: {},
  metaLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular' },
  metaValue: { fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  dateText: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginLeft: 'auto' as any },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 9, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyState: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 10, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
});
