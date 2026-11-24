import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deleteField } from 'firebase/firestore';
import Card from './Card';
import Badge from './Badge';
import Segmented from './Segmented';
import Field from './Field';
import EmptyState from './EmptyState';
import GlucoseChart from './GlucoseChart';
import GlucoseForm from './GlucoseForm';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useRecords } from '../hooks/useRecords';
import { addRecord, updateRecord, removeRecord } from '../services/records';
import { saveProfile } from '../services/profileService';
import { lastNDates, prettyDate } from '../utils/dates';
import {
  GLUCOSE_TYPES, targetsFromProfile, evaluateReading, readingTime, stats, URGENT_ACTION, OUTSIDE_ACTION,
} from '../utils/glucose';

const RANGES = { Daily: 1, Weekly: 7, Monthly: 30 };
const LEVEL_COLOR = { urgent: colors.danger, outside: '#C77700', ok: colors.primary, none: colors.muted };
const LEVEL_LABEL = { urgent: 'Urgent limit', outside: 'Outside range', ok: 'In range', none: 'No target' };
const blank = (v) => String(v ?? '').trim() === '';
const inRange = (v, lo, hi) => blank(v) || (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi);

export default function GlucoseReadings() {
  const { profile, demo, user, refreshProfile } = useAuth();
  const [range, setRange] = useState('Weekly');
  const [type, setType] = useState('All');
  const [form, setForm] = useState(null); // { record: existing | null }
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [demoTargets, setDemoTargets] = useState({});

  const n = RANGES[range];
  const curDates = lastNDates(n);
  const { items, loading, error, reload, uid } = useRecords('glucoseReadings', lastNDates(n * 2));
  const targets = demo ? demoTargets : targetsFromProfile(profile);

  const stamp = (r) => `${r.date} ${r.time}`;
  const matches = (r) => type === 'All' || r.type === type;
  const cur = items.filter((r) => curDates.includes(r.date) && matches(r)).sort((a, b) => stamp(a).localeCompare(stamp(b)));
  const prev = items.filter((r) => !curDates.includes(r.date) && matches(r));
  const sCur = stats(cur);
  const sPrev = stats(prev);
  const enough = sCur.count >= 3 && sPrev.count >= 3;

  const points = cur.map((r) => ({ id: r.id, t: readingTime(r), value: r.value, level: evaluateReading(r, targets).level }));
  let band;
  if (type === 'Fasting' && (targets.fastingMin != null || targets.fastingMax != null)) band = { min: targets.fastingMin, max: targets.fastingMax };
  if (type === 'After meal' && targets.postMealMax != null) band = { max: targets.postMealMax };

  const fail = () => Alert.alert('Something went wrong', 'Could not save. Check your connection and try again.');

  const onSave = async (data) => {
    try {
      if (form.record) await updateRecord('glucoseReadings', uid, form.record.id, data);
      else await addRecord('glucoseReadings', uid, data);
      setForm(null);
      await reload();
      const ev = evaluateReading(data, targets);
      if (ev.level === 'urgent') Alert.alert('Reading beyond your urgent limit', `${ev.text} ${URGENT_ACTION}`);
      else if (ev.level === 'outside') Alert.alert('Reading outside your range', `${ev.text} ${OUTSIDE_ACTION}`);
    } catch (e) { fail(); }
  };

  const confirmDelete = (r) =>
    Alert.alert('Delete this reading?', `${r.value} mg/dL on ${prettyDate(r.date)} at ${r.time}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await removeRecord('glucoseReadings', uid, r.id); await reload(); } catch (e) { fail(); } } },
    ]);

  const saveTargets = async (g) => {
    const num = (v) => (blank(v) ? undefined : Number(v));
    try {
      if (demo) {
        setDemoTargets({
          fastingMin: num(g.fastingMin), fastingMax: num(g.fastingMax), postMealMax: num(g.postMealMax),
          alertLow: num(g.alertLow), alertHigh: num(g.alertHigh), setBy: g.setBy.trim() || undefined,
        });
      } else {
        await saveProfile(user.uid, {
          targetFastingMin: num(g.fastingMin) ?? deleteField(),
          targetFastingMax: num(g.fastingMax) ?? deleteField(),
          targetPostMealMax: num(g.postMealMax) ?? deleteField(),
          alertLow: num(g.alertLow) ?? deleteField(),
          alertHigh: num(g.alertHigh) ?? deleteField(),
          targetSetBy: g.setBy.trim() || deleteField(),
        });
        await refreshProfile();
      }
      setTargetsOpen(false);
    } catch (e) { fail(); }
  };

  const hasTargets = ['fastingMin', 'fastingMax', 'postMealMax', 'alertLow', 'alertHigh'].some((k) => targets[k] != null);
  const diff = enough ? sCur.avg - sPrev.avg : null;

  return (
    <>
      {demo && <Text style={styles.demo}>Demo mode: readings are kept only until you close the app.</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.btn} onPress={() => setForm({ record: null })}>
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.btnText}>Add glucose reading</Text>
      </TouchableOpacity>

      <Card title="Targets set by your doctor" right={<TouchableOpacity onPress={() => setTargetsOpen(true)}><Text style={styles.link}>{hasTargets ? 'Edit' : 'Enter'}</Text></TouchableOpacity>}>
        {hasTargets ? (
          <View>
            {(targets.fastingMin != null || targets.fastingMax != null) && (
              <Text style={styles.line}>Fasting: {targets.fastingMin ?? '?'}–{targets.fastingMax ?? '?'} mg/dL</Text>
            )}
            {targets.postMealMax != null && <Text style={styles.line}>After meal: up to {targets.postMealMax} mg/dL</Text>}
            {targets.alertLow != null && <Text style={styles.line}>Urgent low limit: below {targets.alertLow} mg/dL</Text>}
            {targets.alertHigh != null && <Text style={styles.line}>Urgent high limit: above {targets.alertHigh} mg/dL</Text>}
            {targets.setBy ? <Text style={styles.small}>Set by {targets.setBy}</Text> : null}
          </View>
        ) : (
          <Text style={styles.small}>
            Not set. Ask your doctor for your ranges and enter them here. The app never invents targets, so readings show “no target” until you do.
          </Text>
        )}
      </Card>

      <Segmented options={['Daily', 'Weekly', 'Monthly']} value={range} onChange={setRange} />
      <View style={styles.chips}>
        {['All', ...GLUCOSE_TYPES].map((t) => (
          <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipOn]}>
            <Text style={[styles.chipText, type === t && { color: colors.white }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card title={`${range} graph`}>
        {cur.length === 0 ? (
          <EmptyState icon="water-outline" text={loading ? 'Loading…' : 'No readings in this period. Tap “Add glucose reading”.'} />
        ) : (
          <>
            <GlucoseChart points={points} band={band} />
            <View style={styles.statsRow}>
              <Stat label="Readings" value={String(sCur.count)} />
              <Stat label="Average" value={`${sCur.avg}`} />
              <Stat label="Lowest" value={`${sCur.min}`} />
              <Stat label="Highest" value={`${sCur.max}`} />
            </View>
          </>
        )}
      </Card>

      <Card title="Compare with the previous period">
        {enough ? (
          <Text style={styles.line}>
            Average {sCur.avg} mg/dL ({sCur.count} readings) vs {sPrev.avg} mg/dL ({sPrev.count} readings) in the previous {n === 1 ? 'day' : `${n} days`}. Difference: {diff > 0 ? '+' : ''}{diff} mg/dL.
          </Text>
        ) : (
          <Text style={styles.small}>Not enough readings to compare. At least 3 are needed in each period.</Text>
        )}
        <Text style={[styles.small, { marginTop: 6 }]}>
          This only describes what you recorded. It is not a prediction, and a few readings cannot show a reliable pattern. Discuss patterns with your doctor.
        </Text>
      </Card>

      <Card title="History" right={<Badge label={`${cur.length} readings`} tone="ok" />}>
        {cur.length === 0 && <Text style={styles.small}>Nothing to show.</Text>}
        {[...cur].reverse().map((r) => {
          const ev = evaluateReading(r, targets);
          return (
            <View key={r.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {r.value} mg/dL · {r.type === 'Other' && r.context ? r.context : r.type}
                </Text>
                <Text style={styles.small}>{prettyDate(r.date)} · {r.time}{r.source && r.source !== 'manual' ? ` · ${r.source}` : ''}</Text>
                {r.notes ? <Text style={styles.small}>{r.notes}</Text> : null}
                <Text style={[styles.small, { color: LEVEL_COLOR[ev.level], fontWeight: '700' }]}>{LEVEL_LABEL[ev.level]}</Text>
                {ev.level === 'urgent' && <Text style={styles.urgent}>{ev.text} {URGENT_ACTION}</Text>}
                {ev.level === 'outside' && <Text style={styles.warn}>{ev.text} {OUTSIDE_ACTION}</Text>}
              </View>
              <TouchableOpacity onPress={() => setForm({ record: r })} style={{ padding: 6 }} accessibilityLabel="Edit reading">
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(r)} style={{ padding: 6 }} accessibilityLabel="Delete reading">
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })}
      </Card>

      {form && <GlucoseForm key={form.record ? form.record.id : 'new'} initial={form.record} onSave={onSave} onClose={() => setForm(null)} />}
      {targetsOpen && <TargetsModal initial={targets} onSave={saveTargets} onClose={() => setTargetsOpen(false)} />}
    </>
  );
}

const Stat = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

function TargetsModal({ initial, onSave, onClose }) {
  const s = (v) => (v === undefined || v === null ? '' : String(v));
  const [g, setG] = useState({
    fastingMin: s(initial.fastingMin), fastingMax: s(initial.fastingMax), postMealMax: s(initial.postMealMax),
    alertLow: s(initial.alertLow), alertHigh: s(initial.alertHigh), setBy: s(initial.setBy),
  });
  const [error, setError] = useState('');
  const set = (k) => (v) => setG((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!inRange(g.fastingMin, 20, 600) || !inRange(g.fastingMax, 20, 600) || !inRange(g.postMealMax, 20, 600)) {
      setError('Targets must be between 20 and 600 mg/dL.'); return;
    }
    if (!inRange(g.alertLow, 20, 1000) || !inRange(g.alertHigh, 20, 1000)) {
      setError('Urgent limits must be between 20 and 1000 mg/dL.'); return;
    }
    if (!blank(g.fastingMin) && !blank(g.fastingMax) && Number(g.fastingMin) >= Number(g.fastingMax)) {
      setError('Fasting minimum must be lower than the maximum.'); return;
    }
    if (!blank(g.alertLow) && !blank(g.alertHigh) && Number(g.alertLow) >= Number(g.alertHigh)) {
      setError('Urgent low must be lower than urgent high.'); return;
    }
    onSave(g);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Targets from your doctor (mg/dL)</Text>
          <Text style={[styles.small, { marginBottom: 12 }]}>Enter only values your doctor gave you. Leave a box empty if you were not given one.</Text>
          <Field label="Fasting minimum" value={g.fastingMin} onChangeText={set('fastingMin')} keyboardType="decimal-pad" />
          <Field label="Fasting maximum" value={g.fastingMax} onChangeText={set('fastingMax')} keyboardType="decimal-pad" />
          <Field label="After-meal maximum" value={g.postMealMax} onChangeText={set('postMealMax')} keyboardType="decimal-pad" />
          <Field label="Urgent low limit (alert if below)" value={g.alertLow} onChangeText={set('alertLow')} keyboardType="decimal-pad" />
          <Field label="Urgent high limit (alert if above)" value={g.alertHigh} onChangeText={set('alertHigh')} keyboardType="decimal-pad" />
          <Field label="Set by (doctor name)" value={g.setBy} onChangeText={set('setBy')} maxLength={100} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={onClose}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  demo: { backgroundColor: colors.warnBg, color: colors.warnText, padding: 10, borderRadius: radius.md, fontSize: 12, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 10 },
  small: { color: colors.muted, fontSize: 12 },
  line: { color: colors.text, marginBottom: 3 },
  link: { color: colors.primary, fontWeight: '700' },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 10 },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.light },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.dark, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.dark },
  statLabel: { fontSize: 11, color: colors.muted },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.light },
  itemTitle: { color: colors.text, fontWeight: '700' },
  urgent: { color: colors.danger, fontSize: 12, marginTop: 4 },
  warn: { color: colors.warnText, fontSize: 12, marginTop: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.dark, marginBottom: 6 },
});
