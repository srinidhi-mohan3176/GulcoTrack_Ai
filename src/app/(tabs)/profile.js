import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Disclaimer from '../../components/Disclaimer';
import { colors, radius } from '../../constants/theme';
import { DEMO_PROFILE as demoP } from '../../constants/demoData';
import { useAuth } from '../../context/AuthContext';
import { saveProfile, profileToForm, formToProfile, validateForm } from '../../services/profileService';

const Row = ({ k, v }) => (
  <View style={styles.row}>
    <Text style={styles.k}>{k}</Text>
    <Text style={styles.v}>{v || 'Not entered'}</Text>
  </View>
);

const Field = ({ label, ...props }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.k}>{label}</Text>
    <TextInput {...props} placeholderTextColor={colors.muted}
      style={[styles.input, props.multiline && { height: 80, textAlignVertical: 'top' }]} />
  </View>
);

const STATUS = [
  ['not_confirmed', 'Not clinically confirmed'],
  ['clinician_confirmed', 'Confirmed by my clinician'],
];

function targetsText(p) {
  const parts = [];
  if (p.targetFastingMin != null || p.targetFastingMax != null) {
    parts.push(`Fasting ${p.targetFastingMin ?? '?'}–${p.targetFastingMax ?? '?'} mg/dL`);
  }
  if (p.targetPostMealMax != null) parts.push(`After meals up to ${p.targetPostMealMax} mg/dL`);
  if (!parts.length) return '';
  return parts.join(' · ') + (p.targetSetBy ? ` (set by ${p.targetSetBy})` : '');
}

export default function Profile() {
  const router = useRouter();
  const { user, profile, demo, logout, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profileToForm(profile, user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) setForm(profileToForm(profile, user));
  }, [profile, user, editing]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    const problem = validateForm(form);
    if (problem) { setError(problem); return; }
    setError(''); setSaving(true);
    try {
      await saveProfile(user.uid, formToProfile(form));
      await refreshProfile();
      setEditing(false);
      Alert.alert('Saved', 'Your profile was saved to your account.');
    } catch (e) {
      setError('Could not save your profile. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const fillDemo = () =>
    setForm((f) => ({
      ...f, name: demoP.name, age: '50', heightCm: '165', weightKg: '85',
      medications: 'Insulin (as reported)\nOther medication (as reported)', diagnosisStatus: 'not_confirmed',
    }));

  const onLogout = async () => { await logout(); router.replace('/login'); };

  // ---------- demo mode: read-only sample ----------
  if (demo) {
    return (
      <Screen title="Profile" subtitle="Demo mode">
        <Card title="Sample profile" right={<Badge label="DEMO DATA" />}>
          <Row k="Name" v={demoP.name} />
          <Row k="Age" v={`${demoP.age} years`} />
          <Row k="Height" v={`${demoP.heightCm} cm`} />
          <Row k="Weight" v={`${demoP.weightKg} kg`} />
          <Row k="BMI" v={`≈ ${demoP.bmi}`} />
          <Row k="Diagnosis status" v={demoP.diagnosisStatus} />
          <Row k="Medication" v={demoP.medication} />
        </Card>
        <Text style={styles.small}>Create an account to save your own profile.</Text>
        <TouchableOpacity style={[styles.linkRow, { marginTop: 8 }]} onPress={() => router.push('/reminders')}>
          <Text style={styles.linkRowText}>Medication reminders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnOutline, { marginTop: 12 }]} onPress={onLogout}>
          <Text style={styles.btnOutlineText}>Exit demo</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  // ---------- signed-in: edit form ----------
  if (editing) {
    return (
      <Screen title="Edit profile" subtitle="Stored privately in your account">
        <Disclaimer text="Enter glucose targets only if your doctor gave them to you. The app never invents targets or changes medicines." />
        <Card title="Personal">
          <Field label="Full name" value={form.name} onChangeText={set('name')} maxLength={100} />
          <Field label="Age (years)" value={form.age} onChangeText={set('age')} keyboardType="numeric" maxLength={3} />
          <Field label="Height (cm)" value={form.heightCm} onChangeText={set('heightCm')} keyboardType="numeric" maxLength={5} />
          <Field label="Weight (kg)" value={form.weightKg} onChangeText={set('weightKg')} keyboardType="numeric" maxLength={5} />
          <TouchableOpacity onPress={fillDemo}><Text style={styles.link}>Fill with DEMO values</Text></TouchableOpacity>
        </Card>

        <Card title="Medical">
          <Field label="Medical history" value={form.medicalHistory} onChangeText={set('medicalHistory')} multiline maxLength={2000} />
          <Text style={styles.k}>Diagnosis status</Text>
          <View style={styles.chips}>
            {STATUS.map(([val, label]) => (
              <TouchableOpacity key={val} onPress={() => set('diagnosisStatus')(val)}
                style={[styles.chip, form.diagnosisStatus === val && styles.chipOn]}>
                <Text style={[styles.chipText, form.diagnosisStatus === val && { color: colors.white }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Medication list (one per line, as reported; your clinician should confirm)" value={form.medications}
            onChangeText={set('medications')} multiline />
          <Field label="Allergies" value={form.allergies} onChangeText={set('allergies')} multiline maxLength={500} />
        </Card>

        <Card title="Doctor and emergency contact">
          <Field label="Doctor name" value={form.doctorName} onChangeText={set('doctorName')} maxLength={100} />
          <Field label="Doctor phone" value={form.doctorPhone} onChangeText={set('doctorPhone')} keyboardType="phone-pad" maxLength={20} />
          <Field label="Emergency contact name" value={form.emergencyName} onChangeText={set('emergencyName')} maxLength={100} />
          <Field label="Emergency contact phone" value={form.emergencyPhone} onChangeText={set('emergencyPhone')} keyboardType="phone-pad" maxLength={20} />
        </Card>

        <Card title="Clinician-set glucose targets (mg/dL)">
          <Field label="Fasting minimum" value={form.targetFastingMin} onChangeText={set('targetFastingMin')} keyboardType="numeric" maxLength={3} />
          <Field label="Fasting maximum" value={form.targetFastingMax} onChangeText={set('targetFastingMax')} keyboardType="numeric" maxLength={3} />
          <Field label="After-meal maximum" value={form.targetPostMealMax} onChangeText={set('targetPostMealMax')} keyboardType="numeric" maxLength={3} />
          <Field label="Set by (doctor name)" value={form.targetSetBy} onChangeText={set('targetSetBy')} maxLength={100} />
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Save profile</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => { setEditing(false); setError(''); }}>
          <Text style={styles.btnOutlineText}>Cancel</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  // ---------- signed-in: view ----------
  const p = profile || {};
  const bmi = p.heightCm && p.weightKg ? (p.weightKg / Math.pow(p.heightCm / 100, 2)).toFixed(1) : '';
  return (
    <Screen title="Profile" subtitle={user ? user.email : ''}>
      <Card title="Personal">
        <Row k="Name" v={p.name || (user && user.displayName)} />
        <Row k="Age" v={p.age ? `${p.age} years` : ''} />
        <Row k="Height" v={p.heightCm ? `${p.heightCm} cm` : ''} />
        <Row k="Weight" v={p.weightKg ? `${p.weightKg} kg` : ''} />
        <Row k="BMI (calculated)" v={bmi ? `≈ ${bmi}` : ''} />
      </Card>

      <Card title="Medical">
        <Row k="Medical history" v={p.medicalHistory} />
        <Row k="Diagnosis status" v={p.diagnosisStatus === 'clinician_confirmed' ? 'Confirmed by my clinician' : 'Not clinically confirmed'} />
        <Row k="Medication (as reported)" v={(p.medications || []).join(', ')} />
        <Row k="Allergies" v={p.allergies} />
        <Row k="Glucose targets" v={targetsText(p) || 'Not set. Your doctor sets these.'} />
      </Card>

      <Card title="Contacts">
        <Row k="Doctor" v={[p.doctorName, p.doctorPhone].filter(Boolean).join(' · ')} />
        <Row k="Emergency contact" v={[p.emergencyName, p.emergencyPhone].filter(Boolean).join(' · ')} />
      </Card>

      <Card title="Settings">
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/reminders')}>
          <Text style={styles.linkRowText}>Medication reminders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/privacy')}>
          <Text style={styles.linkRowText}>Privacy and account</Text>
        </TouchableOpacity>
        <Text style={styles.small}>Lab report history is in the Glucose tab.</Text>
      </Card>

      <TouchableOpacity style={styles.btn} onPress={() => setEditing(true)}>
        <Text style={styles.btnText}>Edit profile</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnOutline, { marginTop: 14 }]} onPress={onLogout}>
        <Text style={styles.btnOutlineText}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linkRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.light },
  linkRowText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  row: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.light },
  k: { color: colors.muted, fontSize: 12, marginBottom: 3 },
  v: { color: colors.text, fontWeight: '600' },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 11, color: colors.text },
  link: { color: colors.primary, fontWeight: '700', marginTop: 4 },
  small: { color: colors.muted, fontSize: 12, marginTop: 10 },
  error: { color: colors.danger, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.light },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.dark, fontSize: 12, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
});
