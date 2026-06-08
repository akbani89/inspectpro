import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, ActivityIndicator, Platform,
  Modal, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { createInspection, uploadPhoto } from '../services/api';
import { setAuthToken } from '../services/api';
import { colors, spacing, radius, shadow } from '../theme';
import axios from 'axios';
import { API_BASE } from '../services/api';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

// ── Dropdown Component ─────────────────────────────────────────
const Dropdown = ({ label, value, options, onChange, placeholder = 'Select...' }: any) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter((o: any) =>
    (typeof o === 'string' ? o : o.name || o).toLowerCase().includes(search.toLowerCase())
  );
  const display = value || placeholder;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.dropdownText, !value && { color: colors.textLight }]}>{display}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMid} />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.modalSearch}
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor={colors.textLight}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => i.toString()}
            renderItem={({ item }) => {
              const label = typeof item === 'string' ? item : item.name || item;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, value === label && styles.modalItemSelected]}
                  onPress={() => { onChange(item); setOpen(false); setSearch(''); }}
                >
                  <Text style={[styles.modalItemText, value === label && { color: colors.primary, fontWeight: '700' }]}>{label}</Text>
                  {value === label && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.modalEmpty}>No results found</Text>}
          />
        </View>
      </Modal>
    </View>
  );
};

// ── Input Component ────────────────────────────────────────────
const Input = ({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false, maxLength }: any) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textLight}
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
      autoCapitalize="none"
    />
  </View>
);

const Toggle = ({ label, value, onChange }: any) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} thumbColor="#fff" />
  </View>
);

const steps = ['Proposal', 'Vehicle', 'Accessories', 'Body', 'Valuation', 'Photos', 'Documents'];

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

const DAMAGE_PARTS = [
  'Front Bumper', 'Rear Bumper', 'Front Left Fender', 'Front Right Fender',
  'Rear Left Fender', 'Rear Right Fender', 'Front Left Door', 'Front Right Door',
  'Rear Left Door', 'Rear Right Door', 'Hood / Bonnet', 'Roof', 'Boot / Trunk',
  'Windscreen', 'Rear Glass', 'Left Mirror', 'Right Mirror',
];
const DAMAGE_TYPES = ['Dent', 'Scratch', 'Crack', 'Missing', 'Broken', 'Rust'];
const DAMAGE_SEVERITIES = ['Minor', 'Moderate', 'Major'];

const FACTORY_OPTIONS = [
  'Air Conditioner', 'Power Steering', 'Power Windows', 'Central Locking',
  'Alloy Rims', 'Spare Wheel', 'Tool Kit', 'LCD Player', 'Rear View Camera',
  'Sunroof', 'Leather Seats', 'Push Start', 'Keyless Entry', 'Cruise Control',
  'Speaker System', 'Navigation', 'Parking Sensors', 'Fog Lights',
];

export default function NewInspectionScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Master data
  const [cities, setCities] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);

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
  const [carColor, setCarColor] = useState('');
  const [odometer, setOdometer] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [usageType, setUsageType] = useState('Private');
  const [assembly, setAssembly] = useState('Local Assembled');

  // Step 2: Accessories
  const [factoryAcc, setFactoryAcc] = useState<string[]>([]);
  const [additionalAccessories, setAdditionalAccessories] = useState<{ name: string; value: string }[]>([]);
  const [accNotes, setAccNotes] = useState('');

  // Step 3: Body
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [damages, setDamages] = useState<any[]>([]);
  const [damageNotes, setDamageNotes] = useState('');
  const [missingItems, setMissingItems] = useState('');
  const [alterations, setAlterations] = useState('');

  // Step 4: Valuation
  const [marketValue, setMarketValue] = useState('');

  // Step 5: Photos
  const [photos, setPhotos] = useState<any[]>([]);
  const [captureType, setCaptureType] = useState<'photo' | 'video'>('photo');

  // Step 6: Documents + Location
  const [city, setCity] = useState('');
  const [inspectionPlace, setInspectionPlace] = useState('');
  const [surveyorRemarks, setSurveyorRemarks] = useState('');
  const [docsReceived, setDocsReceived] = useState({
    reg_book: false, sale_invoice: false, cnic: false,
    import_docs: false, bill_of_entry: false,
  });

  // Load master data
  useEffect(() => {
    const load = async () => {
      try {
        const [c, i, m] = await Promise.all([
          axios.get(`${API_BASE}/master/cities`),
          axios.get(`${API_BASE}/master/insurers`),
          axios.get(`${API_BASE}/master/manufacturers`),
        ]);
        setCities(c.data);
        setInsurers(i.data);
        setManufacturers(m.data);
      } catch (e) { console.log('Master data error:', e); }
    };
    load();
  }, []);

  // Cascading dropdowns
  const selectedInsurer = insurers.find((i: any) => i.name === insurerName);
  const branches = selectedInsurer?.branches || [];
  const selectedMfr = manufacturers.find((m: any) => m.name === manufacturer);
  const makes = selectedMfr?.makes || [];
  const selectedMake = makes.find((m: any) => m.name === make);
  const variants = selectedMake?.variants || [];

  const toggleAcc = (item: string) =>
    setFactoryAcc(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);

  const addAdditionalAccessory = () =>
    setAdditionalAccessories(prev => [...prev, { name: '', value: '' }]);

  const updateAdditionalAccessory = (index: number, field: 'name' | 'value', val: string) => {
    const updated = [...additionalAccessories];
    updated[index][field] = val;
    setAdditionalAccessories(updated);
  };

  const removeAdditionalAccessory = (index: number) =>
    setAdditionalAccessories(prev => prev.filter((_, i) => i !== index));

  const totalValue = () => {
    const mv = parseFloat(marketValue) || 0;
    const accTotal = additionalAccessories.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
    return mv + accTotal;
  };

  const addDamage = () =>
    setDamages(prev => [...prev, { part: DAMAGE_PARTS[0], type: DAMAGE_TYPES[0], severity: DAMAGE_SEVERITIES[0] }]);

  const removeDamage = (i: number) => setDamages(prev => prev.filter((_, idx) => idx !== i));

  // Camera with timestamp
  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      const now = new Date();
      const timestamp = now.toLocaleString('en-PK', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
      setPhotos(prev => [...prev, { uri: photo.uri, timestamp, caption: '', photoType: 'damage' }]);
      setShowCamera(false);
    } catch (e) {
      Alert.alert('Error', 'Could not take photo.');
    }
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleFinish = async () => {
    // Validate CNIC
    if (insuredCnic && insuredCnic.length !== 13) {
      Alert.alert('Invalid CNIC', 'CNIC must be exactly 13 digits.');
      setStep(0); return;
    }
    if (insuredContact && !/^\d+$/.test(insuredContact)) {
      Alert.alert('Invalid Contact', 'Contact number must contain digits only.');
      setStep(0); return;
    }

    setSaving(true);
    try {
      const accNames = additionalAccessories.filter(a => a.name).map(a => a.name);
      const accValues = additionalAccessories.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);

      const payload: any = {
        insurer_name: insurerName, branch_name: branchName,
        underwriter_name: underwriterName, insured_name: insuredName,
        insured_contact: insuredContact, insured_address: insuredAddress,
        insured_cnic: insuredCnic, manufacturer, make,
        model_variant: modelVariant, engine_cc: engineCc,
        registration_no: registrationNo,
        registration_year: registrationYear ? parseInt(registrationYear) : undefined,
        manufacturing_year: manufacturingYear ? parseInt(manufacturingYear) : undefined,
        engine_no: engineNo, chassis_no: chassisNo, color: carColor,
        odometer_reading: odometer ? parseInt(odometer) : undefined,
        body_type: bodyType, usage_type: usageType, assembly,
        factory_accessories: factoryAcc,
        additional_accessories: accNames,
        accessories_notes: accNotes,
        is_new_vehicle: isNewVehicle, damages, damage_notes: damageNotes,
        missing_items: missingItems || 'Nil', alterations: alterations || 'Nil',
        market_value: marketValue ? parseFloat(marketValue) : undefined,
        additional_accessories_value: accValues,
        inspection_place: city ? `${city}${inspectionPlace ? ' - ' + inspectionPlace : ''}` : inspectionPlace,
        inspection_date: new Date().toISOString(),
        documents_received: docsReceived,
        surveyor_remarks: surveyorRemarks,
      };

      const res = await createInspection(payload);
      const id = res.data.id;

      for (const photo of photos) {
        try {
          await uploadPhoto(id, photo.uri, photo.caption || photo.timestamp, photo.photoType);
        } catch {}
      }

      Alert.alert('Saved!', `Inspection created — ${res.data.report_number}`, [
        { text: 'View', onPress: () => navigation.replace('InspectionDetail', { id }) },
        { text: 'Done', onPress: () => navigation.navigate('Dashboard') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <View>
          <Dropdown label="Insurance Company" value={insurerName}
            options={insurers.map((i: any) => i.name)}
            onChange={(v: string) => { setInsurerName(v); setBranchName(''); }}
            placeholder="Select insurer..." />
          <Dropdown label="Branch" value={branchName}
            options={branches.map((b: any) => b.name)}
            onChange={(v: string) => setBranchName(v)}
            placeholder={insurerName ? "Select branch..." : "Select insurer first"} />
          <Input label="Underwriter Name" value={underwriterName} onChange={setUnderwriterName} placeholder="e.g. Farrukh Kamal" />
          <Input label="Insured Person Name" value={insuredName} onChange={setInsuredName} placeholder="Full name" />
          <Input label="Contact Number (digits only)" value={insuredContact} onChange={(v: string) => setInsuredContact(v.replace(/\D/g, ''))} placeholder="03001234567" keyboardType="phone-pad" maxLength={11} />
          <Input label="CNIC (13 digits, no dashes)" value={insuredCnic} onChange={(v: string) => setInsuredCnic(v.replace(/\D/g, ''))} placeholder="1234567890123" keyboardType="numeric" maxLength={13} />
          {insuredCnic.length > 0 && insuredCnic.length !== 13 && (
            <Text style={{ color: colors.danger, fontSize: 11, marginTop: -8, marginBottom: 8 }}>
              {insuredCnic.length}/13 digits entered
            </Text>
          )}
          <Input label="Address" value={insuredAddress} onChange={setInsuredAddress} placeholder="Full address" multiline />
        </View>
      );

      case 1: return (
        <View>
          <Dropdown label="Manufacturer" value={manufacturer}
            options={manufacturers.map((m: any) => m.name)}
            onChange={(v: string) => { setManufacturer(v); setMake(''); setModelVariant(''); setEngineCc(''); setBodyType(''); }}
            placeholder="Select manufacturer..." />
          <Dropdown label="Make / Model" value={make}
            options={makes.map((m: any) => m.name)}
            onChange={(v: string) => { setMake(v); setModelVariant(''); setEngineCc(''); setBodyType(''); }}
            placeholder={manufacturer ? "Select make..." : "Select manufacturer first"} />
          <Dropdown label="Variant" value={modelVariant}
            options={variants.map((v: any) => v.name)}
            onChange={(v: any) => {
              const variant = variants.find((vv: any) => vv.name === v);
              setModelVariant(v);
              if (variant?.engine_cc) setEngineCc(variant.engine_cc);
              if (variant?.body_type) setBodyType(variant.body_type);
            }}
            placeholder={make ? "Select variant..." : "Select make first"} />
          <Input label="Engine CC (auto-filled)" value={engineCc} onChange={setEngineCc} placeholder="e.g. 1197CC" />
          <Input label="Registration No." value={registrationNo} onChange={(v: string) => setRegistrationNo(v.toUpperCase())} placeholder="e.g. BNX-395" />
          <Dropdown label="Registration Year" value={registrationYear} options={YEARS} onChange={setRegistrationYear} placeholder="Select year..." />
          <Dropdown label="Manufacturing Year" value={manufacturingYear} options={YEARS} onChange={setManufacturingYear} placeholder="Select year..." />
          <Input label="Engine No." value={engineNo} onChange={setEngineNo} placeholder="Engine number" />
          <Input label="Chassis No." value={chassisNo} onChange={setChassisNo} placeholder="Chassis number" />
          <Input label="Color" value={carColor} onChange={setCarColor} placeholder="e.g. White, Silver" />
          <Input label="Odometer Reading (km)" value={odometer} onChange={setOdometer} placeholder="e.g. 49373" keyboardType="numeric" />
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Body Type (auto-filled)</Text>
            <View style={styles.chipRow}>
              {['Saloon', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Other'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, bodyType === t && styles.chipActive]} onPress={() => setBodyType(t)}>
                  <Text style={[styles.chipText, bodyType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Usage</Text>
            <View style={styles.chipRow}>
              {['Private', 'Commercial'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, usageType === t && styles.chipActive]} onPress={() => setUsageType(t)}>
                  <Text style={[styles.chipText, usageType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Assembly</Text>
            <View style={styles.chipRow}>
              {['Local Assembled', 'Imported'].map(t => (
                <TouchableOpacity key={t} style={[styles.chip, assembly === t && styles.chipActive]} onPress={() => setAssembly(t)}>
                  <Text style={[styles.chipText, assembly === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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

          <View style={[styles.fieldWrap, { marginTop: spacing.md }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.fieldLabel}>Additional Accessories</Text>
              <TouchableOpacity style={styles.addBtn} onPress={addAdditionalAccessory}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {additionalAccessories.length === 0 && (
              <Text style={{ color: colors.textLight, fontSize: 13, marginBottom: 8 }}>No additional accessories added</Text>
            )}
            {additionalAccessories.map((acc, i) => (
              <View key={i} style={[styles.accRow, shadow.card]}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Accessory Name</Text>
                  <TextInput
                    style={styles.input}
                    value={acc.name}
                    onChangeText={v => updateAdditionalAccessory(i, 'name', v)}
                    placeholder="e.g. Amplifier, Woofer"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Value (PKR)</Text>
                  <TextInput
                    style={styles.input}
                    value={acc.value}
                    onChangeText={v => updateAdditionalAccessory(i, 'value', v.replace(/\D/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity onPress={() => removeAdditionalAccessory(i)} style={{ marginLeft: 8, marginTop: 18 }}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Input label="Accessories Notes" value={accNotes} onChange={setAccNotes} placeholder="Any notes about accessories" multiline />
        </View>
      );

      case 3: return (
        <View>
          <Toggle label="Brand new vehicle (no damage)" value={isNewVehicle} onChange={setIsNewVehicle} />
          {!isNewVehicle && (
            <>
              <View style={[styles.fieldWrap, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={styles.fieldLabel}>Damage List</Text>
                <TouchableOpacity style={styles.addBtn} onPress={addDamage}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add damage</Text>
                </TouchableOpacity>
              </View>
              {damages.length === 0 && (
                <View style={styles.emptyDamage}>
                  <Text style={styles.emptyDamageText}>No damages recorded.</Text>
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
                  <Text style={styles.fieldLabel}>Part</Text>
                  <View style={styles.chipRow}>
                    {DAMAGE_PARTS.map(p => (
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
          <Input label="Damage Notes" value={damageNotes} onChange={setDamageNotes} placeholder="Additional notes" multiline />
          <Input label="Missing Factory Items" value={missingItems} onChange={setMissingItems} placeholder="e.g. Spare wheel — or leave blank for Nil" />
          <Input label="Alterations / Modifications" value={alterations} onChange={setAlterations} placeholder="e.g. CNG installed — or leave blank for Nil" />
        </View>
      );

      case 4: return (
        <View>
          <Input label="Current Market Value (PKR)" value={marketValue} onChange={setMarketValue} placeholder="e.g. 3800000" keyboardType="numeric" />
          {additionalAccessories.length > 0 && (
            <View style={[styles.valuationBox, { marginTop: spacing.md }]}>
              <Text style={styles.valuationLabel}>Accessories Breakdown</Text>
              {additionalAccessories.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{a.name || 'Unnamed'}</Text>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>PKR {a.value ? Number(a.value).toLocaleString() : '0'}</Text>
                </View>
              ))}
              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)', marginTop: 10, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Total Value</Text>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>PKR {totalValue().toLocaleString()}</Text>
              </View>
            </View>
          )}
          {!additionalAccessories.length && marketValue && (
            <View style={styles.valuationBox}>
              <Text style={styles.valuationLabel}>Total Insured Value</Text>
              <Text style={styles.valuationAmount}>PKR {Number(marketValue).toLocaleString()}</Text>
            </View>
          )}
        </View>
      );

      case 5: return (
        <View>
          <Text style={styles.stepDesc}>Take live photos of the vehicle. Timestamp is automatically added to each photo.</Text>
          <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.cameraBtnText}>Take Photo</Text>
          </TouchableOpacity>
          {photos.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.fieldLabel}>{photos.length} Photo{photos.length !== 1 ? 's' : ''} Captured</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.photoThumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                    <Text style={styles.photoTimestamp}>{p.timestamp}</Text>
                    <TouchableOpacity style={styles.photoDelete} onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close-circle" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Camera Modal */}
          <Modal visible={showCamera} animationType="slide">
            <View style={styles.cameraContainer}>
              <CameraView ref={cameraRef} style={styles.camera} facing="back">
                <View style={styles.cameraOverlay}>
                  <View style={styles.timestampOverlay}>
                    <Text style={styles.timestampText}>
                      {new Date().toLocaleString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </Text>
                  </View>
                  <View style={styles.cameraControls}>
                    <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setShowCamera(false)}>
                      <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                      <View style={styles.captureBtnInner} />
                    </TouchableOpacity>
                    <View style={{ width: 50 }} />
                  </View>
                </View>
              </CameraView>
            </View>
          </Modal>
        </View>
      );

      case 6: return (
        <View>
          <Dropdown label="City of Inspection" value={city}
            options={cities.map((c: any) => c.name)}
            onChange={setCity}
            placeholder="Select city..." />
          <Input label="Specific Location / Address" value={inspectionPlace} onChange={setInspectionPlace} placeholder="e.g. F-7/3, Near Masjid" multiline />
          <Input label="Surveyor Remarks" value={surveyorRemarks} onChange={setSurveyorRemarks} placeholder="Optional remarks" multiline />
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Documents Received</Text>
          {[
            { key: 'reg_book', label: 'Registration Book' },
            { key: 'sale_invoice', label: 'Sale Invoice (New Vehicle)' },
            { key: 'cnic', label: 'CNIC of Insured' },
            { key: 'import_docs', label: 'Import Documents' },
            { key: 'bill_of_entry', label: 'Bill of Entry / Lading' },
          ].map(doc => (
            <Toggle key={doc.key} label={doc.label}
              value={(docsReceived as any)[doc.key]}
              onChange={(v: boolean) => setDocsReceived(prev => ({ ...prev, [doc.key]: v }))} />
          ))}
        </View>
      );
    }
  };

  return (
    <View style={styles.screen}>
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
  navStep: { fontSize: 13, color: colors.textMid },
  stepBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.surface },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontSize: 10, fontWeight: '600', color: colors.textMid },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 2 },
  stepLineActive: { backgroundColor: colors.primary },
  formScroll: { flex: 1 },
  formContent: { padding: spacing.md },
  stepTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  stepDesc: { fontSize: 13, color: colors.textMid, marginBottom: spacing.md, lineHeight: 20 },
  fieldWrap: { marginBottom: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 48, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },
  dropdownBtn: {
    height: 48, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  dropdownText: { fontSize: 15, color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMid, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleLabel: { fontSize: 14, color: colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.primary + '15' },
  addBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  accRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  damageCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  damageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  damageTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyDamage: { backgroundColor: '#f0fdf4', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  emptyDamageText: { color: colors.success, fontSize: 13 },
  valuationBox: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  valuationLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  valuationAmount: { fontSize: 26, fontWeight: '700', color: '#fff' },
  cameraBtn: { backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  cameraBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  photoThumbWrap: { marginRight: spacing.sm, position: 'relative' },
  photoThumb: { width: 140, height: 105, borderRadius: radius.sm },
  photoTimestamp: { fontSize: 9, color: colors.textMid, textAlign: 'center', marginTop: 3 },
  photoDelete: { position: 'absolute', top: 4, right: 4 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  timestampOverlay: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, margin: 12, borderRadius: 5 },
  timestampText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cameraControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 },
  cameraCancelBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  bottomBar: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  nextBtn: { backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  submitBtn: { backgroundColor: colors.success },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalSearch: { margin: spacing.md, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, fontSize: 15, backgroundColor: colors.surface },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemSelected: { backgroundColor: colors.primary + '10' },
  modalItemText: { fontSize: 15, color: colors.text },
  modalEmpty: { textAlign: 'center', padding: 32, color: colors.textMid },
});
