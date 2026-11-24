import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { GLUCOSE_TYPES, TIME_RE, nowHHMM } from '../utils/glucose';
import { lastNDates, todayISO, prettyDate } from '../utils/dates';
import Field from './Field';

const s = (v) => (v === undefined || v === null ? '' : String(v));

// Add or edit one glucose reading. `initial` is an existing record or null.
export default function GlucoseForm({ initial, onSave, onClose }) {
  const today = todayISO();
  const recent = lastNDates(7);
  const days = initial && !recent.includes(initial.date) ? [initial.date, ...recent] : recent;

  const [value, setValue] = useState(s(initial && initial.value));
  const [type, setType] = useState(initial ? initial.type : 'Fasting');
  const [context, setContext] = useState(s(initial && initial.context));
  const [date, setDate] = useState(initial ? initial.date : today);
  const [time, setTime] = useState(initial ? initial.time : nowHHMM());
  const [notes, setNotes] = useState(s(initial && initial.notes));
  const [error, setError] = useState('');

  const save = () => {
    const v = Number(String(value).trim());
    if (!String(value).trim() || !Number.isFinite(v) || v < 20 || v > 1000) {
      setError('Enter the meter value in mg/dL (between 20 and 1000). Check your meter if it shows something else.');
      return;
    }
    if (!TIME_RE.test(time.trim())) { setError('Time must look like 07:30 (24-hour).'); return; }
    if (date > today) { setError('You cannot record a reading for a future date.'); return; }
    if (type === 'Other' && !context.trim()) { setError('Describe this reading, for example "after exercise".'); return; }
    if (context.length > 60 || notes.length > 500) { setError('Text is too long.'); return; }
    onSave({
      date,
      time: time.trim(),
      value: v,
      unit: 'mg/dL',
      type,
      context: type === 'Other' ? context.trim() : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      source: initial && initial.source ? initial.source : 'manual',
    });
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.head}>
          <Text style={styles.title}>{initial ? 'Edit reading' : 'Add glucose reading'}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close"><Ionicons name="close" size={26} color={colors.dark} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Field label="Glucose value (mg/dL)" value={value} onChangeText={setValue} keyboardType="decimal-pad" autoFocus={!initial} />

          <Text style={styles.label}>Reading type</Text>
          <View style={styles.chips}>
            {GLUCOSE_TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipOn]}>
                <Text style={[styles.chipText, type === t && { color: colors.white }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {type === 'Other' && <Field label="What is this reading for?" value={context} onChangeText={setContext} maxLength={60} />}

          <Text style={styles.label}>Date</Text>
          <View style={styles.chips}>
            {days.map((d) => (
              <TouchableOpacity key={d} onPress={() => setDate(d)} style={[styles.chip, date === d && styles.chipOn]}>
                <Text style={[styles.chipText, date === d && { color: colors.white }]}>{d === today ? 'Today' : prettyDate(d)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label="Time (24-hour, for example 07:30)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} />
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline maxLength={500} />

          {error ? <Text style={styles.err}>{error}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnText}>Save reading</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.white },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  label: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.light },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.dark, fontSize: 12, fontWeight: '600' },
  err: { color: colors.danger, marginBottom: 10 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '800' },
});
