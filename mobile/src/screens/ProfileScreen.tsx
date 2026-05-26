import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { changePassword } from '../services/api';
import { colors, spacing, radius, shadow } from '../theme';

const Row = ({ icon, label, value }: any) => (
  <View style={styles.row}>
    <Ionicons name={icon} size={18} color={colors.primary} style={styles.rowIcon} />
    <View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      Alert.alert('Done', 'Password changed successfully.');
      setShowPwForm(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const roleBadge: any = {
    super_admin:   { label: 'Super Admin', color: '#7c3aed' },
    company_admin: { label: 'Company Admin', color: colors.primary },
    agent:         { label: 'Field Agent', color: colors.success },
  };
  const rb = roleBadge[user?.role] || roleBadge.agent;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: rb.color + '20' }]}>
          <Text style={[styles.roleText, { color: rb.color }]}>{rb.label}</Text>
        </View>
        {user?.company_name && <Text style={styles.company}>{user.company_name}</Text>}
      </View>

      {/* Info Card */}
      <View style={[styles.card, shadow.card]}>
        <Text style={styles.cardTitle}>Profile Information</Text>
        <Row icon="mail-outline"   label="Email"   value={user?.email} />
        <Row icon="call-outline"   label="Phone"   value={user?.phone} />
        <Row icon="card-outline"   label="CNIC"    value={user?.cnic} />
        <Row icon="business-outline" label="Company" value={user?.company_name} />
      </View>

      {/* Change Password */}
      <View style={[styles.card, shadow.card]}>
        <TouchableOpacity style={styles.cardTitleRow} onPress={() => setShowPwForm(!showPwForm)}>
          <Text style={styles.cardTitle}>Change Password</Text>
          <Ionicons name={showPwForm ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMid} />
        </TouchableOpacity>
        {showPwForm && (
          <View style={styles.pwForm}>
            <TextInput
              style={styles.input} secureTextEntry value={currentPw} onChangeText={setCurrentPw}
              placeholder="Current password" placeholderTextColor={colors.textLight}
            />
            <TextInput
              style={styles.input} secureTextEntry value={newPw} onChangeText={setNewPw}
              placeholder="New password (min 8 chars)" placeholderTextColor={colors.textLight}
            />
            <TextInput
              style={styles.input} secureTextEntry value={confirmPw} onChangeText={setConfirmPw}
              placeholder="Confirm new password" placeholderTextColor={colors.textLight}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Update Password'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* App info */}
      <View style={[styles.card, shadow.card]}>
        <Text style={styles.cardTitle}>About</Text>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={styles.rowIcon} />
          <View>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>InspectPro v1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 16 },

  avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name:    { fontSize: 22, fontWeight: '700', color: colors.text },
  company: { fontSize: 13, color: colors.textMid, marginTop: 4 },
  roleBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  roleText: { fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },

  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.bg },
  rowIcon: { marginRight: spacing.sm, marginTop: 2 },
  rowLabel: { fontSize: 11, color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '500', marginTop: 2 },

  pwForm: { gap: spacing.sm },
  input: {
    height: 46, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, fontSize: 14, color: colors.text, backgroundColor: colors.bg,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1.5, borderColor: colors.danger + '40',
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
