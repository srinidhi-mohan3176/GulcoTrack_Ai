import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { ACTIVITY_TYPES, estimateKcal } from '../utils/nutrition';
import { todayISO } from '../utils/dates';
import Field from './Field';

const s = (v) => (v === undefined || v === null ? '' : String(v));
const blank = (v) => String(v).trim() === '';
const inRange = (v, lo, hi) => blank(v) || (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi);

// Add or edit one activity entry. `initial` is an existing record or null. `days` are the selectable dates.
export default function ActivityForm({ visible, initial, days, weightKg, onSave, onClose }) {
  const today = todayISO();
  const selectable = days.filter((d) => d.iso <= today);
  const [date, setDate] = useState(initial ? initial.date : today);
  const [type, setType] = useState(initial ? initial.type : 'Walking');
  const [duration, setDuration] = useState(s(initial && initial.durationMin));
  const [steps, setSteps] = useState(s(initial && initial.steps));
  const [distance, setDistance] = useState(s(initial && initial.distanceKm));
  const [notes, setNotes] = useState(s(initial && initial.notes));
  const [error, setError] = useState('');

  const est = estimateKcal(type, Number(duration), weightKg);

  const save = () => {
    if (date > today) { setError('You cannot log activity for a future date.'); return; }
    if (blank(duration) && blank(steps) && blank(distance)) { setError('Enter at least duration, steps or distance.'); return; }
    if (!inRange(duration, 0, 1440)) { setError('Duration must be between 0 and 1440 minutes.'); return; }
    if (!inRange(steps, 0, 100000) || (!blank(steps) && !Number.isInteger(Number(steps)))) { setError('Steps must be a whole number up to 100000.'); return; }
    if (!inRange(distance, 0, 500)) { setError('Distance must be between 0 and 500 km.'); return; }
    if (notes.length > 300) { setError('Notes are too long (max 300 characters).'); return; }
    onSave({
      date,
      type,
      durationMin: blank(duration) ? undefined : Number(duration),
      steps: blank(steps) ? undefined : Number(steps),
      distanceKm: blank(distance) ? undefined : Number(distance),
      estKcal: est == null ? undefined : est,
      notes: notes.trim() ? notes.trim() : undefined,
      source: 'manual',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.head}>
          <Text style={styles.title}>{initial ? 'Edit activity' : 'Log activity'}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close"><Ionicons name="close" size={26} color={colors.dark} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Day</Text>
          <View style={styles.chips}>
            {selectable.map((d) => (
              <TouchableOpacity key={d.iso} onPress={() => setDate(d.iso)} style={[styles.chip, date === d.iso && styles.chipOn]}>
                <Text style={[styles.chipText, date === d.iso && { color: colors.white }]}>{d.short} {d.iso.slice(8)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.chips}>
            {ACTIVITY_TYPES.map((a) => (
              <TouchableOpacity key={a.type} onPress={() => setType(a.type)} style={[styles.chip, type === a.type && styles.chipOn]}>
                <Text style={[styles.chipText, type === a.type && { color: colors.white }]}>{a.type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label="Duration (minutes)" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" />
          <Field label="Steps (optional, counted yourself or from another app)" value={steps} onChangeText={setSteps} keyboardType="number-pad" />
          <Field label="Distance in km (optional)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline maxLength={300} />

          <Text style={styles.est}>
            {est != null
              ? `Estimated calories burned: about ${est} kcal (rough estimate from your weight and duration)`
              : 'Add your weight in Profile and a duration to see a rough calorie estimate.'}
          </Text>
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
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
  est: { color: colors.muted, fontSize: 12, marginBottom: 12 },
  err: { color: colors.danger, marginBottom: 10 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '800' },
});
