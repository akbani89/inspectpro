import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getInspection, generatePdf, submitInspection } from '../services/api';
import { colors, spacing, radius, shadow } from '../theme';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const Row = ({ label, value }: any) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const StatusBadge = ({ status }: any) => {
  const map: any = colors.badge;
  const s = map[status] || map.draft;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{status?.toUpperCase()}</Text>
    </View>
  );
};

export default function InspectionDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasPdf, setHasPdf] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      const res = await getInspection(id);
      setInspection(res.data);
      setHasPdf(!!res.data.pdf_url);
    } catch {
      Alert.alert('Error', 'Could not load inspection.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    Alert.alert('Submit Inspection', 'Once submitted, you cannot edit this inspection. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit', style: 'default', onPress: async () => {
          setSubmitting(true);
          try {
            await submitInspection(id);
            await load();
            Alert.alert('Submitted!', 'The inspection has been submitted for review.');
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Could not submit.');
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  const handleSharePdfById = async (inspectionId: string) => {
    setSharing(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Error', 'Not logged in. Please log in again.');
        return;
      }

      const downloadUrl = 'https://inspectpro-api.fly.dev/api/reports/' + inspectionId + '/download';
      const localPath = FileSystem.cacheDirectory + 'report_' + inspectionId + '.pdf';

      console.log('Downloading from:', downloadUrl);

      const dl = await FileSystem.downloadAsync(downloadUrl, localPath, {
        headers: { Authorization: 'Bearer ' + token }
      });

      console.log('Download status:', dl.status, 'URI:', dl.uri);

      if (dl.status !== 200) {
        Alert.alert('Download Failed', 'Server returned status: ' + dl.status + '. Please try generating the PDF again.');
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Inspection Report',
        });
      } else {
        Alert.alert('Not available', 'Sharing is not available on this device.');
      }
    } catch (e: any) {
      console.log('Share error:', e);
      Alert.alert('Error', 'Could not share PDF: ' + e.message);
    } finally {
      setSharing(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      await generatePdf(id);
      setHasPdf(true);
      setGeneratingPdf(false);
      Alert.alert('PDF Ready', 'Your report has been generated.', [
        { text: 'Share Now', onPress: () => handleSharePdfById(id) },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'PDF generation failed.');
      setGeneratingPdf(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!inspection) return null;

  const damages: any[] = inspection.damages || [];
  const photos: any[] = inspection.photos || [];
  const docs = inspection.documents_received || {};

  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {inspection.report_number || 'Inspection'}
        </Text>
        <StatusBadge status={inspection.status} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        <View style={styles.actionRow}>
          {inspection.status === 'draft' && (
            <TouchableOpacity style={[styles.actionBtn, styles.submitBtn]} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.actionBtnText}>Submit</Text></>
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.pdfBtn]} onPress={handleGeneratePdf} disabled={generatingPdf}>
            {generatingPdf
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="document-text" size={16} color="#fff" /><Text style={styles.actionBtnText}>Generate PDF</Text></>
            }
          </TouchableOpacity>
          {hasPdf && (
            <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={() => handleSharePdfById(id)} disabled={sharing}>
              {sharing
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="share-social" size={16} color="#fff" /><Text style={styles.actionBtnText}>Share</Text></>
              }
            </TouchableOpacity>
          )}
        </View>

        <Section title="Proposal Details">
          <Row label="Insurer" value={inspection.insurer_name} />
          <Row label="Branch" value={inspection.branch_name} />
          <Row label="Underwriter" value={inspection.underwriter_name} />
          <Row label="Insured Name" value={inspection.insured_name} />
          <Row label="Contact" value={inspection.insured_contact} />
          <Row label="CNIC" value={inspection.insured_cnic} />
          <Row label="Address" value={inspection.insured_address} />
        </Section>

        <Section title="Vehicle Details">
          <Row label="Manufacturer" value={inspection.manufacturer} />
          <Row label="Make / Model" value={inspection.make} />
          <Row label="Variant" value={inspection.model_variant} />
          <Row label="Engine CC" value={inspection.engine_cc} />
          <Row label="Registration No." value={inspection.registration_no} />
          <Row label="Reg. Year" value={inspection.registration_year} />
          <Row label="Mfg. Year" value={inspection.manufacturing_year} />
          <Row label="Engine No." value={inspection.engine_no} />
          <Row label="Chassis No." value={inspection.chassis_no} />
          <Row label="Color" value={inspection.color} />
          <Row label="Odometer" value={inspection.odometer_reading ? `${inspection.odometer_reading?.toLocaleString()} km` : null} />
          <Row label="Body Type" value={inspection.body_type} />
          <Row label="Usage" value={inspection.usage_type} />
          <Row label="Assembly" value={inspection.assembly} />
        </Section>

        <Section title="Accessories">
          <Text style={styles.rowLabel}>Factory Fitted</Text>
          <View style={styles.tagRow}>
            {(inspection.factory_accessories || []).length === 0
              ? <Text style={styles.nilText}>None</Text>
              : inspection.factory_accessories.map((a: string, i: number) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>
              ))
            }
          </View>
          <Text style={[styles.rowLabel, { marginTop: spacing.sm }]}>Additional</Text>
          <View style={styles.tagRow}>
            {(inspection.additional_accessories || []).length === 0
              ? <Text style={styles.nilText}>None</Text>
              : inspection.additional_accessories.map((a: string, i: number) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>
              ))
            }
          </View>
        </Section>

        <Section title="Body Observations">
          {inspection.is_new_vehicle ? (
            <View style={styles.newVehicleBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.newVehicleText}>Brand New Vehicle — No Pre-existing Damage</Text>
            </View>
          ) : damages.length === 0 ? (
            <View style={styles.newVehicleBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.newVehicleText}>No damage observed</Text>
            </View>
          ) : (
            damages.map((d: any, i: number) => (
              <View key={i} style={styles.damageRow}>
                <View style={styles.damageNum}><Text style={styles.damageNumText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.damagePart}>{d.part}</Text>
                  <Text style={styles.damageDetail}>{d.type} · {d.severity}</Text>
                </View>
                <View style={[styles.severityDot, {
                  backgroundColor: d.severity === 'Major' ? colors.danger : d.severity === 'Moderate' ? colors.warning : '#94a3b8'
                }]} />
              </View>
            ))
          )}
          <Row label="Missing Items" value={inspection.missing_items || 'Nil'} />
          <Row label="Alterations" value={inspection.alterations || 'Nil'} />
          {inspection.damage_notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{inspection.damage_notes}</Text>
            </View>
          )}
        </Section>

        <Section title="Estimated Values">
          <View style={styles.valuationCard}>
            <Text style={styles.valuationLabel}>Current Market Value</Text>
            <Text style={styles.valuationAmount}>
              {inspection.market_value
                ? `PKR ${Number(inspection.market_value).toLocaleString()}`
                : '—'}
            </Text>
          </View>
          {inspection.additional_accessories_value > 0 && (
            <Row label="Additional Accessories Value" value={`PKR ${Number(inspection.additional_accessories_value).toLocaleString()}`} />
          )}
        </Section>

        {photos.length > 0 && (
          <Section title={`Photos (${photos.length})`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {photos.map((p: any) => (
                <View key={p.id} style={styles.photoItem}>
                  <Image
                    source={{ uri: p.url.startsWith('http') ? p.url : `https://inspectpro-api.fly.dev${p.url}` }}
                    style={styles.photoThumb} resizeMode="cover"
                  />
                  {p.caption ? <Text style={styles.photoCaption} numberOfLines={1}>{p.caption}</Text> : null}
                </View>
              ))}
            </ScrollView>
          </Section>
        )}

        <Section title="Documents Received">
          {[
            { key: 'reg_book', label: 'Registration Book' },
            { key: 'sale_invoice', label: 'Sale Invoice' },
            { key: 'cnic', label: 'CNIC of Insured' },
            { key: 'import_docs', label: 'Import Documents' },
            { key: 'bill_of_entry', label: 'Bill of Entry / Lading' },
          ].map(doc => (
            <View key={doc.key} style={styles.docRow}>
              <Ionicons
                name={docs[doc.key] ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={docs[doc.key] ? colors.success : colors.danger}
              />
              <Text style={styles.docLabel}>{doc.label}</Text>
            </View>
          ))}
        </Section>

        <Section title="Surveyor Details">
          <Row label="Agent" value={inspection.agent_name} />
          <Row label="Place" value={inspection.inspection_place} />
          <Row label="Date & Time" value={
            inspection.inspection_date
              ? format(new Date(inspection.inspection_date), 'dd MMM yyyy hh:mm a')
              : null
          } />
          {inspection.surveyor_remarks && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{inspection.surveyor_remarks}</Text>
            </View>
          )}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: spacing.sm, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  navTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: radius.md, gap: 6,
  },
  submitBtn: { backgroundColor: colors.primary },
  pdfBtn: { backgroundColor: colors.accent },
  shareBtn: { backgroundColor: colors.success },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    marginBottom: spacing.sm, overflow: 'hidden', ...shadow.card,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.md, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: colors.bg,
  },
  rowLabel: { fontSize: 12, color: colors.textMid, flex: 1 },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1.5, textAlign: 'right' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  tag: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  tagText: { fontSize: 12, color: colors.textMid },
  nilText: { fontSize: 13, color: colors.textLight, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  newVehicleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', margin: spacing.sm, padding: spacing.sm, borderRadius: radius.sm,
  },
  newVehicleText: { fontSize: 13, color: colors.success, fontWeight: '500' },
  damageRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.bg,
  },
  damageNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.warning + '20', alignItems: 'center', justifyContent: 'center',
  },
  damageNumText: { fontSize: 11, fontWeight: '700', color: colors.warning },
  damagePart: { fontSize: 13, fontWeight: '600', color: colors.text },
  damageDetail: { fontSize: 11, color: colors.textMid, marginTop: 1 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  notesBox: { margin: spacing.sm, padding: spacing.sm, backgroundColor: '#fffbeb', borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: colors.warning },
  notesText: { fontSize: 12, color: colors.textMid, lineHeight: 18 },
  valuationCard: {
    margin: spacing.sm, padding: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  valuationLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  valuationAmount: { fontSize: 26, fontWeight: '700', color: '#fff' },
  photoScroll: { paddingLeft: spacing.md, paddingVertical: spacing.sm },
  photoItem: { marginRight: spacing.sm, width: 120 },
  photoThumb: { width: 120, height: 90, borderRadius: radius.sm },
  photoCaption: { fontSize: 10, color: colors.textMid, marginTop: 3, textAlign: 'center' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bg },
  docLabel: { fontSize: 13, color: colors.text },
});
