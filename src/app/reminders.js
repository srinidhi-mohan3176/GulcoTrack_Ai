import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Field from '../components/Field';
import EmptyState from '../components/EmptyState';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useUserRecords } from '../hooks/useRecords';
import { addRecord, updateRecord, removeRecord, listByUser } from '../services/records';
import { hasPermission, requestPermission, syncReminders } from '../services/reminders';
import { DAY_LABELS, ALL_DAYS, daysSummary, validateReminder } from '../utils/reminderPlan';

export default function Reminders() {
  const { demo } = useAuth();
  const { items, loading, error, reload, uid } = useUserRecords('medicationReminders');
  const [form, setForm] = useState(null); // { record | null }
  const [perm, setPerm] = useState(null);
  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time));

  useEffect(() => { hasPermission().then(setPerm).catch(() => setPerm(false)); }, []);

  const fail = () => Alert.alert('Something went wrong', 'Could not save. Check your connection and try again.');
  const afterChange = async () => {
    const fresh = await listByUser('medicationReminders', uid);
    const res = await syncReminders(fresh);
    setPerm(res.permission);
    await reload();
  };

  const allow = async () => {
    const ok = await requestPermission();
    setPerm(ok);
    if (ok) await afterChange();
    else Alert.alert('Notifications are off', 'Turn on notifications for this app in your phone settings to get reminders.');
  };

  const onSave = async (data) => {
    try {
      if (form.record) await updateRecord('medicationReminders', uid, form.record.id, data);
      else await addRecord('medicationReminders', uid, data);
      setForm(null);
      await afterChange();
    } catch (e) { fail(); }
  };

  const toggle = async (r, value) => {
    try { await updateRecord('medicationReminders', uid, r.id, { enabled: value }); await afterChange(); } catch (e) { fail(); }
  };

  const confirmDelete = (r) =>
    Alert.alert('Delete this reminder?', `${r.label} at ${r.time}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await removeRecord('medicationReminders', uid, r.id); await afterChange(); } catch (e) { fail(); } } },
    ]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.notice}>
        These are alerts you set yourself. The app does not know your prescription and never suggests medicines, doses or times. Follow your doctor’s and pharmacist’s instructions. Alerts can arrive a few minutes late on some phones, so do not rely on them alone.
      </Text>
      {demo && <Text style={styles.demo}>Demo mode: reminders are kept only until you close the app.</Text>}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      {perm === false && (
        <Card title="Notifications are off">
          <Text style={styles.text}>Allow notifications so reminders can appear on your phone.</Text>
          <TouchableOpacity style={[styles.btn, { marginTop: 10 }]} onPress={allow}><Text style={styles.btnText}>Allow notifications</Text></TouchableOpacity>
        </Card>
      )}

      <TouchableOpacity style={styles.btn} onPress={() => setForm({ record: null })}>
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.btnText}>Add reminder</Text>
      </TouchableOpacity>

      {sorted.length === 0 && (
        <Card><EmptyState icon="alarm-outline" text={loading ? 'Loading…' : 'No reminders yet.'} /></Card>
      )}

      {sorted.map((r) => (
        <Card key={r.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.time}>{r.time}</Text>
              <Text style={styles.title}>{r.label}</Text>
              <Text style={styles.small}>{daysSummary(r.days)}{r.note ? ` · ${r.note}` : ''}</Text>
            </View>
            <Switch value={Boolean(r.enabled)} onValueChange={(v) => toggle(r, v)} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => setForm({ record: r })} style={styles.act}><Text style={styles.link}>Edit</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(r)} style={styles.act}><Text style={styles.del}>Delete</Text></TouchableOpacity>
          </View>
        </Card>
      ))}

      {form && <ReminderForm key={form.record ? form.record.id : 'new'} initial={form.record} onSave={onSave} onClose={() => setForm(null)} />}
    </ScrollView>
  );
}

function ReminderForm({ initial, onSave, onClose }) {
  const [label, setLabel] = useState(initial ? initial.label : '');
  const [time, setTime] = useState(initial ? initial.time : '');
  const [days, setDays] = useState(initial ? initial.days : ALL_DAYS);
  const [note, setNote] = useState(initial && initial.note ? initial.note : '');
  const [enabled, setEnabled] = useState(initial ? Boolean(initial.enabled) : true);
  const [error, setError] = useState('');

  const toggleDay = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const save = () => {
    const problem = validateReminder({ label, time, days, note });
    if (problem) { setError(problem); return; }
    onSave({
      label: label.trim(),
      time: time.trim(),
      days: [...days].sort((a, b) => a - b),
      enabled,
      note: note.trim() ? note.trim() : undefined,
    });
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{initial ? 'Edit reminder' : 'Add reminder'}</Text>
          <Field label="Name (as your doctor or the label says)" value={label} onChangeText={setLabel} maxLength={60} />
          <Field label="Time (24-hour, for example 08:30)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} />
          <Text style={styles.label}>Days</Text>
          <View style={styles.chips}>
            {DAY_LABELS.map((d, i) => (
              <TouchableOpacity key={d} onPress={() => toggleDay(i)} style={[styles.chip, days.includes(i) && styles.chipOn]}>
                <Text style={[styles.chipText, days.includes(i) && { color: colors.white }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Note (optional, for example “with food”)" value={note} onChangeText={setNote} maxLength={100} />
          <Text style={styles.small}>Do not enter doses here. Follow the label and your doctor’s instructions. The name can appear on your lock screen, so use a general name if you prefer privacy.</Text>
          <View style={[styles.row, { marginVertical: 14 }]}>
            <Text style={styles.title}>Reminder on</Text>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.primary }} />
          </View>
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnText}>Save reminder</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={onClose}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  notice: { backgroundColor: colors.warnBg, color: colors.warnText, padding: 12, borderRadius: radius.md, fontSize: 12, lineHeight: 17, marginBottom: 14 },
  demo: { color: colors.warnText, fontSize: 12, marginBottom: 10 },
  err: { color: colors.danger, marginBottom: 10 },
  text: { color: colors.text },
  small: { color: colors.muted, fontSize: 12 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontSize: 24, fontWeight: '800', color: colors.dark },
  title: { color: colors.text, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  act: { paddingVertical: 4 },
  link: { color: colors.primary, fontWeight: '700' },
  del: { color: colors.danger, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.light },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.dark, fontSize: 12, fontWeight: '700' },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 10 },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.dark, marginBottom: 12 },
});
