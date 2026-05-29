import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listInspections } from '../services/api';
import { colors, spacing, radius, shadow } from '../theme';
import { format } from 'date-fns';

const STATUS_FILTERS = ['all', 'draft', 'submitted', 'approved', 'rejected'];

const StatusBadge = ({ status }: any) => {
  const map: any = colors.badge;
  const s = map[status] || map.draft;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{status?.toUpperCase()}</Text>
    </View>
  );
};

export default function InspectionsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE = 20;

  const load = useCallback(async (reset = false) => {
    const skip = reset ? 0 : page * PAGE;
    try {
      const res = await listInspections({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        skip,
        limit: PAGE,
      } as any);
      if (reset) {
        setItems(res.data.items);
        setPage(0);
      } else {
        setItems(prev => [...prev, ...res.data.items]);
      }
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [search, statusFilter, page]);

  useEffect(() => {
    setLoading(true);
    load(true);
  }, [search, statusFilter]);

  const loadMore = () => {
    if (items.length < total) {
      setPage(p => p + 1);
      load(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, shadow.card]}
      onPress={() => navigation.navigate('InspectionDetail', { id: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.carIconWrap}>
          <Ionicons name="car" size={18} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.insured_name || 'Unnamed'}
          </Text>
          <Text style={styles.cardReg}>{item.registration_no || 'No Registration'}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.cardMeta}>{item.make} {item.model_variant}</Text>
        <Text style={styles.cardMeta}>
          {item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : ''}
        </Text>
      </View>
      {item.report_number && (
        <Text style={styles.reportNo}>{item.report_number}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inspections</Text>
        <Text style={styles.headerCount}>{total} total</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, reg no, report no…"
          placeholderTextColor={colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Status filter tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, statusFilter === f && styles.filterTabActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterTabText, statusFilter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={items.length < total ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No inspections found</Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term.' : 'Start a new inspection from the dashboard.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewInspection')}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: spacing.sm, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  headerCount: { fontSize: 13, color: colors.textMid },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, margin: spacing.sm,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: colors.text },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm, gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: 12, fontWeight: '600', color: colors.textMid },
  filterTabTextActive: { color: '#fff' },

  list: { padding: spacing.sm, paddingBottom: 80 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  carIconWrap: {
    width: 38, height: 38, borderRadius: radius.sm,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardReg: { fontSize: 12, color: colors.textMid, marginTop: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 8 },
  cardMeta: { fontSize: 12, color: colors.textMid },
  reportNo: { fontSize: 10, color: colors.textLight, marginTop: 4 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textMid, marginTop: spacing.md },
  emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginTop: 8 },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
});
