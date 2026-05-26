import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { getDashboardStats, listInspections } from '../services/api';
import { colors, spacing, radius, shadow } from '../theme';
import { format } from 'date-fns';

const StatusBadge = ({ status }: { status: string }) => {
  const map: any = colors.badge;
  const s = map[status] || map.draft;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{status.toUpperCase()}</Text>
    </View>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <View style={[styles.statCard, shadow.card]}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value ?? '—'}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, r] = await Promise.all([
        getDashboardStats(),
        listInspections({ limit: 10 } as any),
      ]);
      setStats(s.data);
      setRecent(r.data.items || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0]} 👋</Text>
          <Text style={styles.company}>{user?.company_name}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.textMid} />
        </TouchableOpacity>
      </View>

      {/* New Inspection CTA */}
      <TouchableOpacity
        style={styles.newBtn}
        onPress={() => navigation.navigate('NewInspection')}
        activeOpacity={0.88}
      >
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.newBtnText}>Start New Inspection</Text>
      </TouchableOpacity>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsRow}>
        <StatCard label="Total" value={stats?.total_inspections} icon="documents-outline" color={colors.primary} />
        <StatCard label="This Month" value={stats?.this_month} icon="calendar-outline" color={colors.accent} />
        <StatCard label="Pending" value={stats?.submitted} icon="time-outline" color={colors.warning} />
        <StatCard label="Approved" value={stats?.approved} icon="checkmark-circle-outline" color={colors.success} />
      </View>

      {/* Recent Inspections */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Inspections</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Inspections')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {recent.length === 0
        ? <View style={styles.empty}><Text style={styles.emptyText}>No inspections yet. Start your first one!</Text></View>
        : recent.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.inspectionCard, shadow.card]}
            onPress={() => navigation.navigate('InspectionDetail', { id: item.id })}
            activeOpacity={0.85}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="car" size={18} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.insured_name || 'Unnamed'} — {item.registration_no || 'No Reg'}
                </Text>
                <Text style={styles.cardSub}>{item.make} {item.model_variant}</Text>
                <Text style={styles.cardDate}>
                  {item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : ''}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
          </TouchableOpacity>
        ))
      }

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  company:  { fontSize: 13, color: colors.textMid, marginTop: 2 },
  logoutBtn: { padding: 8 },

  newBtn: {
    margin: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  newBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '500' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm },
  statCard: {
    width: '46%', margin: '2%', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'flex-start',
  },
  statIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMid, marginTop: 2 },

  inspectionCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardSub:  { fontSize: 12, color: colors.textMid, marginTop: 2 },
  cardDate: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '700' },

  empty: { alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMid, fontSize: 14, textAlign: 'center' },
});
