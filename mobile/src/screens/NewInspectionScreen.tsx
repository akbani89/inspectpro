import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createInspection, uploadPhoto } from '../services/api';
import { colors, spacing, radius, shadow } from '../theme';
import * as ImagePicker from 'expo-image-picker';

// ── Reusable field components ──────────────────────────────────
const Field = ({ label, children }: any) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const Input = ({ value, onChange, placeholder, keyboardType = 'default', multiline = false }: any) => (
  <TextInput
    style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    placeholderTextColor={colors.textLight}
    keyboardType={keyboardType}
    multiline={multiline}
    autoCapitalize="words"
  />
);

const Toggle = ({ label, value, onChange }: any) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} thumbColor="#fff" />
  </View>
);

// ── Step indicator ─────────────────────────────────────────────
const steps = ['Proposal', 'Vehicle', 'Accessories', 'Body', 'Valuation', 'Meta'];

const StepBar = ({ current }: { current: number }) => (
  <View style={styles.stepBar}>
    {steps.map((s, i) => (
      <View key={s} style={styles.stepItem}>
        <View style={[styles.stepDot, i <= current && styles.stepDotActive]}>
          {i < current
            ? <Ionicons name="checkmark" size={12} color="#fff" />
            : <Text style={[styles.stepNum, i === current && styles.stepNumActive]}>{i + 1}</Text>
          }
        </View>
        {i < steps.length - 1 && <View style={[styles.stepLine, i < current && styles.stepLineActive]} />}
      </View>
    ))}
  </View>
);

// ── FACTORY ACCESSORIES list (common) ──────────────────────────
const FACTORY_OPTIONS = [
  'Air Conditioner', 'Power Steering', 'Power Windows', 'Central Locking',
  'Alloy Rims', 'Spare Wheel', 'Tool Kit', 'LCD Player', 'Rear View Camera',
  'Sunroof', 'Leather Seats', 'Push Start', 'Keyless Entry', 'Cruise Control',
  'Speaker System', 'Navigation', 'Parking Sensors',
];

// ── DAMAGE PARTS ───────────────────────────────────────────────
const DAMAGE_PARTS = [
  'Front Bumper', 'Rear Bumper', 'Front Left Fender', 'Front Right Fender',
  'Rear Left Fender', 'Rear Right Fender', 'Front Left Door', 'Front Right Door',
  'Rear Left Door', 'Rear Right Door', 'Hood / Bonnet', 'Roof', 'Boot / Trunk',
  'Windscreen', 'Rear Glass', 'Left Mirror', 'Right Mirror',
];
const DAMAGE_TYPES = ['Dent', 'Scratch', 'Crack', 'Missing', 'Broken', 'Rust'];
const DAMAGE_SEVERITIES = ['Minor', 'Moderate', 'Major'];

// ── Main component ─────────────────────────────────────────────
export default function NewInspectionScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);

  // Step 0: Proposal
  const [insurerName, setInsurerName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [underwriterName, setUnderwriterName] = useState('');
  const [insuredName, setInsuredName] = useState('');
  const [insuredContact, setInsuredContact] = useState('');
  const [insuredAddress, setInsuredAddress] = useState('');
  const [insuredCnic, setInsuredCnic] = useState('');

  // Step 1: Vehicle
  const [manufacturer, setManufacturer] = useState('');
  const [make, setMake] = useState('');
  const [modelVariant, setModelVariant] = useState('');
  const [engineCc, setEngineCc] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [registrationYear, setRegistrationYear] = useState('');
  const [manufacturingYear, setManufacturingYear] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [color, setColor] = useState('');
  const [odometer, setOdometer] = useState('');
  const [bodyType, setBodyType] = useState('Saloon');
  const [usageType, setUsageType] = useState('Private');
  const [assembly, setAssembly] = useState('Local Assembled');

  // Step 2: Accessories
  const [factoryAcc, setFactoryAcc] = useState<string[]>([]);
  const [additionalAcc, setAdditionalAcc] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // Step 3: Body
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [damages, setDamages] = useState<any[]>([]);
  const [damageNotes, setDamageNotes] = useState('');
  const [missingItems, setMissingItems] = useState('');
  const [alterations, setAlterations] = useState('');

  // Step 4: Valuation
  const [marketValue, setMarketValue] = useState('');
  const [accValue, setAccValue] = useState('');

  // Step 5: Meta
  const [inspectionPlace, setInspectionPlace] = useState('');
  const [surveyorRemarks, setSurveyorRemarks] = useState('');
  const [docsReceived, setDocsReceived] = useState({
    reg_book: false, sale_invoice: false, cnic: false,
    import_docs: false, bill_of_entry: false,
  });

  // ── helpers ────────────────────────────────────────────────
  const toggleAcc = (item: string) =>
    setFactoryAcc(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);

  const addDamage = () =>
    setDamages(prev => [...prev, { part: DAMAGE_PARTS[0], type: DAMAGE_TYPES[0], severity: DAMAGE_SEVERITIES[0] }]);

  const removeDamage = (i: number) =>
    setDamages(prev => prev.filter((_, idx) => idx !== i));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, { uri: result.assets[0].uri, caption: '', photoType: 'damage' }]);
    }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsMultipleSelection: true });
    if (!result.canceled) {
      setPhotos(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri, caption: '', photoType: 'damage' }))]);
    }
  };

  // ── Save & navigate ────────────────────────────────────────
  const handleFinish = async () => {
    setSaving(true);
    try {
      const payload: any = {
        insurer_name: insurerName, branch_name: branchName,
        underwriter_name: underwriterName, insured_name: insuredName,
        insured_contact: insuredContact, insured_address: insuredAddress,
        insured_cnic: insuredCnic, manufacturer, make,
        model_variant: modelVariant, engine_cc: engineCc,
        registration_no: registrationNo,
        registration_year: registrationYear ? parseInt(registrationYear) : undefined,
        manufacturing_year: manufacturingYear ? parseInt(manufacturingYear) : undefined,
        engine_no: engineNo, chassis_no: chassisNo, color,
        odometer_reading: odometer ? parseInt(odometer) : undefined,
        body_type: bodyType, usage_type: usageType, assembly,
        factory_accessories: factoryAcc,
        additional_accessories: additionalAcc.split(',').map(s => s.trim()).filter(Boolean),
        accessories_notes: accNotes,
        is_new_vehicle: isNewVehicle, damages, damage_notes: damageNotes,
        missing_items: missingItems || 'Nil', alterations: alterations || 'Nil',
        market_value: marketValue ? parseFloat(marketValue) : undefined,
        additional_accessories_value: accValue ? parseFloat(accValue) : 0,
        inspection_place: inspectionPlace,
        inspection_date: new Date().toISOString(),
        documents_received: docsReceived,
        surveyor_remarks: surveyorRemarks,
      };

      const res = await createInspection(payload);
      const id = res.data.id;
      setInspectionId(id);

      // Upload photos
      for (const photo of photos) {
        try {
          await uploadPhoto(id, photo.uri, photo.caption, photo.photoType);
        } catch {}
      }

      Alert.alert('Saved!', `Inspection created — ${res.data.report_number}`, [
        { text: 'View', onPress: () => navigation.replace('InspectionDetail', { id }) },
        { text: 'Done',  onPress: () => navigation.navigate('Dashboard') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render steps ───────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0: return (
        <View>
          <Field label="Insurer / Insurance Company"><Input value={insurerName} onChange={setInsurerName} placeholder="e.g. Jubilee General Insurance" /></Field>
          <Field label="Branch Name"><Input value={branchName} onChange={setBranchName} placeholder="e.g. Saddar" /></Field>
          <Field label="Underwriter Name"><Input value={underwriterName} onChange={setUnderwriterName} placeholder="e.g. Farrukh Kamal" /></Field>
          <Field label="Insured Person Name"><Input value={insuredName} onChange={setInsuredName} placeholder="Full name" /></Field>
          <Field label="Contact Number"><Input value={insuredContact} onChange={setInsuredContact} placeholder="0300-1234567" keyboardType="phone-pad" /></Field>
          <Field label="CNIC Number"><Input value={insuredCnic} onChange={setInsuredCnic} placeholder="XXXXX-XXXXXXX-X" keyboardType="numeric" /></Field>
          <Field label="Address"><Input value={insuredAddress} onChange={setInsuredAddress} placeholder="Full address" multiline /></Field>
        </View>
      );

      case 1: return (
        <View>
          <Field label="Manufacturer"><Input value={manufacturer} onChange={setManufacturer} placeholder="e.g. Toyota, Suzuki, Honda" /></Field>
          <Field label="Make / Model"><Input value={make} onChange={setMake} placeholder="e.g. Corolla, Swift, Civic" /></Field>
          <Field label="Variant"><Input value={modelVariant} onChange={setModelVariant} placeholder="e.g. GL Manual, 1.8 CVT" /></Field>
          <Field label="Engine CC"><Input value={engineCc} onChange={setEngineCc} placeholder="e.g. 1197CC" /></Field>
          <Field label="Registration No."><Input value={registrationNo} onChange={setRegistrationNo} placeholder="e.g. BNX-395" /></Field>
          <View style={styles.row}>
            <View style={styles.half}><Field label="Registration Year"><Input value={registrationYear} onChange={setRegistrationYear} placeholder="2022" keyboardType="numeric" /></Field></View>
            <View style={styles.half}><Field label="Manufacturing Year"><Input value={manufacturingYear} onChange={setManufacturingYear} placeholder="2022" keyboardType="numeric" /></Field></View>
          </View>
          <Field label="Engine No."><Input value={engineNo} onChange={setEngineNo} placeholder="Engine number" /></Field>
          <Field label="Chassis No."><Input value={chassisNo} onChange={setChassisNo} placeholder="Chassis number" /></Field>
          <Field label="Color"><Input value={color} onChange={setColor} placeholder="e.g. White, Silver" /></Field>
          <Field label="Odometer Reading (km)"><Input value={odometer} onChange={setOdometer} placeholder="e.g. 49373" keyboardType="numeric" /></Field>

          <Field label="Body Type">
            <View style={styles.chipRow}>
              {['Saloon', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Other'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, bodyType === t && styles.chipActive]} onPress={() => setBodyType(t)}>
                  <Text style={[styles.chipText, bodyType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Usage">
            <View style={styles.chipRow}>
              {['Private', 'Commercial'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, usageType === t && styles.chipActive]} onPress={() => setUsageType(t)}>
                  <Text style={[styles.chipText, usageType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Assembly">
            <View style={styles.chipRow}>
              {['Local Assembled', 'Imported'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, assembly === t && styles.chipActive]} onPress={() => setAssembly(t)}>
                  <Text style={[styles.chipText, assembly === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
        </View>
      );

      case 2: return (
        <View>
          <Text style={styles.fieldLabel}>Factory Fitted Accessories</Text>
          <View style={styles.chipRow}>
            {FACTORY_OPTIONS.map(item => (
              <TouchableOpacity key={item} style={[styles.chip, factoryAcc.includes(item) && styles.chipActive]} onPress={() => toggleAcc(item)}>
                <Text style={[styles.chipText, factoryAcc.includes(item) && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Additional Accessories (comma separated)">
            <Input value={additionalAcc} onChange={setAdditionalAcc} placeholder="e.g. Amplifier, Woofer, Tinted Windows" />
          </Field>
          <Field label="Notes">
            <Input value={accNotes} onChange={setAccNotes} placeholder="Any notes about accessories" multiline />
          </Field>
        </View>
      );

      case 3: return (
        <View>
          <Toggle label="Brand new vehicle (no damage)" value={isNewVehicle} onChange={setIsNewVehicle} />

          {!isNewVehicle && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.fieldLabel}>Damage List</Text>
                <TouchableOpacity style={styles.addBtn} onPress={addDamage}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add damage</Text>
                </TouchableOpacity>
              </View>

              {damages.length === 0 && (
                <View style={styles.emptyDamage}>
                  <Text style={styles.emptyDamageText}>No damages recorded. Tap "Add damage" to start.</Text>
                </View>
              )}

              {damages.map((d, i) => (
                <View key={i} style={[styles.damageCard, shadow.card]}>
                  <View style={styles.damageHeader}>
                    <Text style={styles.damageTitle}>Damage #{i + 1}</Text>
                    <TouchableOpacity onPress={() => removeDamage(i)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.fieldLabel}>Part / Location</Text>
                  <View style={styles.chipRow}>
                    {DAMAGE_PARTS.slice(0, 8).map(p => (
                      <TouchableOpacity key={p} style={[styles.chip, d.part === p && styles.chipActive]}
                        onPress={() => { const nd = [...damages]; nd[i] = { ...nd[i], part: p }; setDamages(nd); }}>
                        <Text style={[styles.chipText, d.part === p && styles.chipTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.chipRow}>
                    {DAMAGE_TYPES.map(t => (
                      <TouchableOpacity key={t} style={[styles.chip, d.type === t && styles.chipActive]}
                        onPress={() => { const nd = [...damages]; nd[i] = { ...nd[i], type: t }; setDamages(nd); }}>
                        <Text style={[styles.chipText, d.type === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Severity</Text>
                  <View style={styles.chipRow}>
                    {DAMAGE_SEVERITIES.map(s => (
                      <TouchableOpacity key={s} style={[styles.chip, d.severity === s && styles.chipActive]}
                        onPress={() => { const nd = [...damages]; nd[i] = { ...nd[i], severity: s }; setDamages(nd); }}>
                        <Text style={[styles.chipText, d.severity === s && styles.chipTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          <Field label="Damage Notes / Details">
            <Input value={damageNotes} onChange={setDamageNotes} placeholder="Any additional notes about damage" multiline />
          </Field>
          <Field label="Missing Factory Items">
            <Input value={missingItems} onChange={setMissingItems} placeholder="e.g. Spare wheel, Tool kit — or leave blank for Nil" />
          </Field>
          <Field label="Alterations / Modifications">
            <Input value={alterations} onChange={setAlterations} placeholder="e.g. CNG installed — or leave blank for Nil" />
          </Field>

          {/* Photos */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Inspection Photos</Text>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickFromLibrary}>
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={styles.photoBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.photoCount}>{photos.length} photo{photos.length !== 1 ? 's' : ''} attached</Text>
        </View>
      );

      case 4: return (
        <View>
          <Field label="Current Market Value (PKR)">
            <Input value={marketValue} onChange={setMarketValue} placeholder="e.g. 3800000" keyboardType="numeric" />
          </Field>
          <Field label="Additional Accessories Value (PKR)">
            <Input value={accValue} onChange={setAccValue} placeholder="e.g. 0" keyboardType="numeric" />
          </Field>
        </View>
      );

      case 5: return (
        <View>
          <Field label="Place of Inspection">
            <Input value={inspectionPlace} onChange={setInspectionPlace} placeholder="e.g. F-7/3, Islamabad" />
          </Field>
          <Field label="Surveyor Remarks">
            <Input value={surveyorRemarks} onChange={setSurveyorRemarks} placeholder="Optional remarks" multiline />
          </Field>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Documents Received</Text>
          {[
            { key: 'reg_book',     label: 'Registration Book' },
            { key: 'sale_invoice', label: 'Sale Invoice (New Vehicle)' },
            { key: 'cnic',         label: 'CNIC of Insured' },
            { key: 'import_docs',  label: 'Import Documents' },
            { key: 'bill_of_entry',label: 'Bill of Entry / Lading' },
          ].map(doc => (
            <Toggle
              key={doc.key}
              label={doc.label}
              value={(docsReceived as any)[doc.key]}
              onChange={(v: boolean) => setDocsReceived(prev => ({ ...prev, [doc.key]: v }))}
            />
          ))}
        </View>
      );
    }
  };

  return (
    <View style={styles.screen}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Inspection</Text>
        <Text style={styles.navStep}>{step + 1}/{steps.length}</Text>
      </View>

      <StepBar current={step} />

      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{steps[step]}</Text>
        {renderStep()}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomBar}>
        {step < steps.length - 1
          ? (
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(s => s + 1)}>
              <Text style={styles.nextBtnText}>Next: {steps[step + 1]}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextBtn, styles.submitBtn]} onPress={handleFinish} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.nextBtnText}>Save Inspection</Text></>
              }
            </TouchableOpacity>
          )
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: spacing.sm, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  navStep:  { fontSize: 13, color: colors.textMid },

  stepBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.surface },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontSize: 10, fontWeight: '600', color: colors.textMid },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 2 },
  stepLineActive: { backgroundColor: colors.primary },

  formScroll: { flex: 1 },
  formContent: { padding: spacing.md },
  stepTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  fieldWrap: { marginBottom: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 48, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },

  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMid, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleLabel: { fontSize: 14, color: colors.text },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.primary + '15' },
  addBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  damageCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  damageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  damageTitle: { fontSize: 14, fontWeight: '700', color: colors.text },

  emptyDamage: { backgroundColor: '#f0fdf4', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  emptyDamageText: { color: colors.success, fontSize: 13 },

  photoActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 12, backgroundColor: colors.surface,
  },
  photoBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  photoCount: { fontSize: 12, color: colors.textMid, textAlign: 'center', marginBottom: spacing.sm },

  bottomBar: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  nextBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  submitBtn: { backgroundColor: colors.success },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
