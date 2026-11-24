import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Disclaimer from '../components/Disclaimer';
import Field from '../components/Field';
import Loading from '../components/Loading';
import { colors, radius } from '../constants/theme';
import { TEST_CATEGORIES, COMMON_TESTS, DEMO_REPORT, DEMO_PROFILE } from '../constants/demoData';
import { useAuth } from '../context/AuthContext';
import { useUid } from '../hooks/useRecords';
import { addRecord, updateRecord, getRecord } from '../services/records';
import { getDraft, clearDraft } from '../utils/reportDraft';
import { isRealDMY, dmyToISO, isoToDMY, todayISO } from '../utils/dates';

let nextId = 1;
const newTest = (over = {}) => ({ id: nextId++, name: '', category: 'Blood Glucose', value: '', unit: '', range: '', notes: '', ...over });
const str = (v) => (v === undefined || v === null ? '' : String(v));

// Add a lab report by hand, review values read from a photo, or edit a saved report (?id=...).
export default function AddLabReport() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { demo } = useAuth();
  const uid = useUid();

  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [draft] = useState(() => (id ? null : getDraft()));
  const [step, setStep] = useState('form'); // 'form' | 'preview'
  const [patient, setPatient] = useState(draft ? str(draft.patientName) : '');
  const [lab, setLab] = useState(draft ? str(draft.labName) : '');
  const [date, setDate] = useState(draft ? str(draft.reportDate) : '');
  const [notes, setNotes] = useState(draft ? str(draft.notes) : '');
  const [tests, setTests] = useState(() =>
    draft && draft.tests && draft.tests.length ? draft.tests.map((t) => newTest(t)) : [newTest()]
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const method = existing ? existing.entryMethod : draft ? draft.method : 'manual';

  useEffect(() => () => clearDraft(), []);

  // Editing: load the saved report.
  useEffect(() => {
    if (!id || !uid) return;
    let alive = true;
    getRecord('labReports', uid, id)
      .then((r) => {
        if (!alive || !r) return;
        setExisting(r);
        setPatient(str(r.patientName));
        setLab(str(r.labName));
        setDate(isoToDMY(r.reportDate));
        setNotes(str(r.notes));
        setTests((r.tests || []).map((t) => newTest(t)));
      })
      .catch(() => Alert.alert('Could not open this report', 'Check your connection and try again.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, uid]);

  const update = (tid, patch) => setTests((ts) => ts.map((t) => (t.id === tid ? { ...t, ...patch } : t)));
  const remove = (tid) => setTests((ts) => (ts.length > 1 ? ts.filter((t) => t.id !== tid) : ts));

  const loadDemo = () => {
    setPatient(DEMO_PROFILE.name);
    setLab(DEMO_REPORT.lab);
    setDate(DEMO_REPORT.date);
    setTests(DEMO_REPORT.tests.map((t) => newTest(t)));
    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!patient.trim()) e.patient = 'Patient name is required';
    if (!lab.trim()) e.lab = 'Laboratory name is required';
    if (!isRealDMY(date.trim())) e.date = 'Use a real date as DD-MM-YYYY, for example 14-11-2026';
    else if (dmyToISO(date.trim()) > todayISO()) e.date = 'The report date cannot be in the future';
    tests.forEach((t) => {
      if (!t.name.trim()) e[`n${t.id}`] = 'Test name required';
      if (!t.value.trim()) e[`v${t.id}`] = 'Result required';
    });
    if (tests.length > 60) e.patient = 'Too many tests (max 60)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = {
        patientName: patient.trim().slice(0, 100),
        labName: lab.trim().slice(0, 100),
        reportDate: dmyToISO(date.trim()),
        entryMethod: method,
        tests: tests.map((t) => ({
          name: t.name.trim().slice(0, 100),
          category: t.category,
          value: t.value.trim().slice(0, 40),
          unit: t.unit.trim().slice(0, 20),
          range: t.range.trim().slice(0, 40),
          notes: str(t.notes).trim().slice(0, 200),
        })),
        notes: notes.trim() ? notes.trim().slice(0, 1000) : undefined,
      };

      if (existing) await updateRecord('labReports', uid, existing.id, data);
      else await addRecord('labReports', uid, data);

      clearDraft();
      Alert.alert('Report saved', 'Your confirmed values were saved to your report history.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      const msg =
        e && e.message === 'FILE_SIZE' ? 'The file is larger than 10 MB, so it could not be kept.'
        : e && e.message === 'STORAGE_DISABLED' ? 'Cloud Storage is not enabled.'
        : 'Could not save. Check your connection and that the latest Firestore rules are published.';
      Alert.alert('Could not save', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const banner =
    method === 'text' || method === 'image'
      ? 'These values were found in the text you pasted by an automatic checker and may contain mistakes. Check every value against your report before saving. Nothing is saved until you confirm.'
      : method === 'pdf'
      ? 'Type the values from your PDF report. PDF text is not read automatically. Nothing is saved until you confirm.'
      : 'Enter values exactly as printed on your report. The app stores them for your records and does not diagnose.';

  if (step === 'preview') {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ padding: 16 }}>
        <Card title="Report preview">
          <Text style={styles.b}>{patient}</Text>
          <Text style={styles.small}>{lab} · {date}</Text>
          {tests.map((t) => (
            <View key={t.id} style={styles.prevRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.b}>{t.name}</Text>
                <Text style={styles.small}>{t.category}{t.range ? ` · Ref: ${t.range}` : ''}</Text>
              </View>
              <Text style={styles.val}>{t.value} {t.unit}</Text>
            </View>
          ))}
          {notes ? <Text style={[styles.small, { marginTop: 8 }]}>Notes: {notes}</Text> : null}
        </Card>
        <Text style={styles.small}>Please check every value against your paper report before saving.</Text>
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>{existing ? 'Confirm and save changes' : 'Confirm and save'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={() => setStep('form')} disabled={saving}>
          <Text style={styles.btnOutlineText}>Edit report</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Disclaimer text={banner} />

        {!existing && method === 'manual' && (
          <TouchableOpacity style={styles.demoBtn} onPress={loadDemo}>
            <Text style={styles.demoText}>Fill with DEMO report (14-11-2026)</Text>
          </TouchableOpacity>
        )}

        <Card title="Report details">
          <Field label="Patient name" value={patient} onChangeText={setPatient} error={errors.patient} maxLength={100} />
          <Field label="Laboratory name" value={lab} onChangeText={setLab} error={errors.lab} maxLength={100} />
          <Field label="Report date (DD-MM-YYYY)" value={date} onChangeText={setDate} error={errors.date} keyboardType="numbers-and-punctuation" maxLength={10} />
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} />
        </Card>

        {tests.map((t, i) => (
          <Card key={t.id} title={`Test ${i + 1}`}
            right={tests.length > 1 ? (
              <TouchableOpacity onPress={() => remove(t.id)} accessibilityLabel={`Remove test ${i + 1}`}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            ) : null}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {TEST_CATEGORIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => update(t.id, { category: c })} style={[styles.chip, t.category === c && styles.chipOn]}>
                  <Text style={[styles.chipText, t.category === c && { color: colors.white }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Pick a common test, or type your own below</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {COMMON_TESTS.map((c) => (
                <TouchableOpacity key={c.name} onPress={() => update(t.id, { name: c.name, unit: c.unit })} style={styles.chipLight}>
                  <Text style={styles.chipText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Field label="Test name" value={t.name} onChangeText={(v) => update(t.id, { name: v })} error={errors[`n${t.id}`]} maxLength={100} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field style={{ flex: 1 }} label="Result" value={t.value} onChangeText={(v) => update(t.id, { value: v })} error={errors[`v${t.id}`]} maxLength={40} />
              <Field style={{ flex: 1 }} label="Unit" value={t.unit} onChangeText={(v) => update(t.id, { unit: v })} maxLength={20} />
            </View>
            <Field label="Reference range (optional)" value={t.range} onChangeText={(v) => update(t.id, { range: v })} maxLength={40} />
          </Card>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setTests((ts) => (ts.length >= 60 ? ts : [...ts, newTest()]))}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addText}>Add Test</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => validate() && setStep('preview')}>
          <Text style={styles.btnText}>Preview report</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.light, marginRight: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipLight: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, marginRight: 6 },
  chipText: { fontSize: 12, color: colors.dark, fontWeight: '600' },
  addBtn: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', padding: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, marginBottom: 12 },
  addText: { color: colors.primary, fontWeight: '800' },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', marginTop: 8 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', marginTop: 10 },
  btnOutlineText: { color: colors.primary, fontWeight: '800' },
  demoBtn: { backgroundColor: colors.warnBg, padding: 10, borderRadius: radius.md, alignItems: 'center', marginBottom: 12 },
  demoText: { color: colors.warnText, fontWeight: '700', fontSize: 12 },
  b: { fontWeight: '700', color: colors.text },
  small: { color: colors.muted, fontSize: 12 },
  prevRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.light },
  val: { color: colors.dark, fontWeight: '800' },
});
