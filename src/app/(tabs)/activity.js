import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deleteField } from 'firebase/firestore';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import BarChart from '../../components/BarChart';
import EmptyState from '../../components/EmptyState';
import Segmented from '../../components/Segmented';
import Field from '../../components/Field';
import ActivityForm from '../../components/ActivityForm';
import { colors, radius } from '../../constants/theme';
import { DEMO_PROFILE } from '../../constants/demoData';
import { useAuth } from '../../context/AuthContext';
import { useRecords } from '../../hooks/useRecords';
import { addRecord, updateRecord, removeRecord } from '../../services/records';
import { saveProfile } from '../../services/profileService';
import { weekDates, todayISO, prettyDate } from '../../utils/dates';

const sum = (list, k) => list.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const r1 = (x) => Math.round(x * 10) / 10;
const blank = (v) => String(v ?? '').trim() === '';
const inRange = (v, lo, hi) => blank(v) || (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi);

export default function Activity() {
  const { profile, demo, user, refreshProfile } = useAuth();
  const [offset, setOffset] = useState(0);
  const [metric, setMetric] = useState('Steps');
  const [form, setForm] = useState(null); // { record: existing | null }
  const [goalOpen, setGoalOpen] = useState(false);
  const [demoGoals, setDemoGoals] = useState({});

  const today = todayISO();
  const week = weekDates(offset);
  const weekRec = useRecords('activityLogs', week.map((w) => w.iso));
  const todayRec = useRecords('activityLogs', [today]);
  const uid = weekRec.uid;

  const weight = demo ? DEMO_PROFILE.weightKg : profile && profile.weightKg;
  const goals = demo
    ? demoGoals
    : {
        steps: profile && profile.activityGoalSteps,
        minutes: profile && profile.activityGoalMinutes,
        km: profile && profile.activityGoalKm,
        setBy: profile && profile.activityGoalSetBy,
      };

  const reloadAll = async () => { await weekRec.reload(); await todayRec.reload(); };
  const fail = () => Alert.alert('Something went wrong', 'Could not save. Check your connection and try again.');

  const onSave = async (data) => {
    try {
      if (form.record) await updateRecord('activityLogs', uid, form.record.id, data);
      else await addRecord('activityLogs', uid, data);
      setForm(null);
      await reloadAll();
    } catch (e) { fail(); }
  };

  const confirmDelete = (r) =>
    Alert.alert('Delete this activity?', `${r.type} on ${prettyDate(r.date)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await removeRecord('activityLogs', uid, r.id); await reloadAll(); } catch (e) { fail(); } } },
    ]);

  const saveGoals = async (g) => {
    const n = (v) => (blank(v) ? undefined : Number(v));
    try {
      if (demo) {
        setDemoGoals({ steps: n(g.steps), minutes: n(g.minutes), km: n(g.km), setBy: g.setBy.trim() || undefined });
      } else {
        await saveProfile(user.uid, {
          activityGoalSteps: n(g.steps) ?? deleteField(),
          activityGoalMinutes: n(g.minutes) ?? deleteField(),
          activityGoalKm: n(g.km) ?? deleteField(),
          activityGoalSetBy: g.setBy.trim() || deleteField(),
        });
        await refreshProfile();
      }
      setGoalOpen(false);
    } catch (e) { fail(); }
  };

  const t = todayRec.items;
  const steps = sum(t, 'steps');
  const minutes = sum(t, 'durationMin');
  const km = r1(sum(t, 'distanceKm'));
  const kcal = Math.round(sum(t, 'estKcal'));

  const key = { Steps: 'steps', Minutes: 'durationMin', Km: 'distanceKm' }[metric];
  const chart = week.map((w) => ({ label: w.short, value: r1(sum(weekRec.items.filter((r) => r.date === w.iso), key)) }));
  const weekTotal = r1(chart.reduce((a, c) => a + c.value, 0));
  const history = [...weekRec.items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const hasGoals = goals.steps || goals.minutes || goals.km;

  return (
    <Screen title="Activity" subtitle="Log walks and exercise">
      <Text style={styles.note}>
        Activity is entered by you. This app does not count steps automatically yet. Android Health Connect support can be added later.
      </Text>
      {demo && <Text style={styles.demo}>Demo mode: entries are kept only until you close the app.</Text>}
      {weekRec.error ? <Text style={styles.error}>{weekRec.error}</Text> : null}

      <TouchableOpacity style={styles.btn} onPress={() => setForm({ record: null })}>
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.btnText}>Log activity</Text>
      </TouchableOpacity>

      <Card title="Today">
        {goals.steps ? <ProgressBar label="Steps" value={steps} goal={goals.steps} /> : <Row k="Steps" v={String(steps)} />}
        {goals.minutes ? <ProgressBar label="Active time" value={Math.round(minutes)} goal={goals.minutes} unit="min" /> : <Row k="Active time" v={`${Math.round(minutes)} min`} />}
        {goals.km ? <ProgressBar label="Distance" value={km} goal={goals.km} unit="km" /> : <Row k="Distance" v={`${km} km`} />}
        <Row k="Estimated calories burned" v={`${kcal} kcal`} />
        <Text style={styles.small}>Calories burned are a rough estimate and are tracked separately from food calories.</Text>
      </Card>

      <Card title="Daily goals" right={<TouchableOpacity onPress={() => setGoalOpen(true)}><Text style={styles.link}>{hasGoals ? 'Edit' : 'Set goals'}</Text></TouchableOpacity>}>
        {hasGoals ? (
          <Text style={styles.line}>
            {[goals.steps && `${goals.steps} steps`, goals.minutes && `${goals.minutes} min`, goals.km && `${goals.km} km`].filter(Boolean).join(' · ')}
            {goals.setBy ? `  (set by ${goals.setBy})` : ''}
          </Text>
        ) : (
          <Text style={styles.small}>No goals set. Your doctor or you can set them. The app does not choose goals for you.</Text>
        )}
      </Card>

      <Card title="Weekly history">
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setOffset(offset - 1)} accessibilityLabel="Previous week"><Ionicons name="chevron-back" size={22} color={colors.primary} /></TouchableOpacity>
          <Text style={styles.weekText}>{prettyDate(week[0].iso)} – {prettyDate(week[6].iso)}{offset === 0 ? ' (this week)' : ''}</Text>
          <TouchableOpacity onPress={() => setOffset(Math.min(0, offset + 1))} disabled={offset === 0} accessibilityLabel="Next week">
            <Ionicons name="chevron-forward" size={22} color={offset === 0 ? colors.border : colors.primary} />
          </TouchableOpacity>
        </View>
        <Segmented options={['Steps', 'Minutes', 'Km']} value={metric} onChange={setMetric} />
        <BarChart data={chart} />
        <Text style={[styles.small, { marginTop: 8 }]}>Week total: {weekTotal} {metric.toLowerCase()}</Text>
      </Card>

      <Card title="Exercise history" right={<Badge label={`${history.length} entries`} tone="ok" />}>
        {history.length === 0 && <EmptyState icon="walk-outline" text="Nothing logged for this week." />}
        {history.map((r) => (
          <View key={r.id} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{r.type} · {prettyDate(r.date)}</Text>
              <Text style={styles.small}>
                {[r.durationMin != null && `${r.durationMin} min`, r.steps != null && `${r.steps} steps`, r.distanceKm != null && `${r.distanceKm} km`, r.estKcal != null && `≈ ${r.estKcal} kcal`].filter(Boolean).join(' · ')}
              </Text>
              {r.notes ? <Text style={styles.small}>{r.notes}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => setForm({ record: r })} style={{ padding: 6 }} accessibilityLabel="Edit activity">
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(r)} style={{ padding: 6 }} accessibilityLabel="Delete activity">
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </Card>

      {form && (
        <ActivityForm
          key={form.record ? form.record.id : 'new'}
          visible
          initial={form.record}
          days={weekDates(0)}
          weightKg={weight}
          onSave={onSave}
          onClose={() => setForm(null)}
        />
      )}

      {goalOpen && <GoalsModal initial={goals} onSave={saveGoals} onClose={() => setGoalOpen(false)} />}
    </Screen>
  );
}

const Row = ({ k, v }) => (
  <View style={styles.row}>
    <Text style={styles.rowK}>{k}</Text>
    <Text style={styles.rowV}>{v}</Text>
  </View>
);

function GoalsModal({ initial, onSave, onClose }) {
  const s = (v) => (v === undefined || v === null ? '' : String(v));
  const [g, setG] = useState({ steps: s(initial.steps), minutes: s(initial.minutes), km: s(initial.km), setBy: s(initial.setBy) });
  const [error, setError] = useState('');
  const set = (k) => (v) => setG((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!inRange(g.steps, 1, 100000) || !inRange(g.minutes, 1, 1440) || !inRange(g.km, 0.1, 500)) {
      setError('Check your goals: steps 1–100000, minutes 1–1440, km 0.1–500.');
      return;
    }
    onSave(g);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Daily activity goals</Text>
          <Text style={[styles.small, { marginBottom: 12 }]}>Enter goals agreed with your doctor, or your own. Leave a box empty for no goal.</Text>
          <Field label="Steps per day" value={g.steps} onChangeText={set('steps')} keyboardType="number-pad" />
          <Field label="Active minutes per day" value={g.minutes} onChangeText={set('minutes')} keyboardType="number-pad" />
          <Field label="Distance per day (km)" value={g.km} onChangeText={set('km')} keyboardType="decimal-pad" />
          <Field label="Set by (for example Dr. name, or Me)" value={g.setBy} onChangeText={set('setBy')} maxLength={100} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnText}>Save goals</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={onClose}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  demo: { backgroundColor: colors.warnBg, color: colors.warnText, padding: 10, borderRadius: radius.md, fontSize: 12, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 10 },
  small: { color: colors.muted, fontSize: 12 },
  line: { color: colors.text },
  link: { color: colors.primary, fontWeight: '700' },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowK: { color: colors.text, fontWeight: '600' },
  rowV: { color: colors.muted },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  weekText: { color: colors.dark, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.light },
  itemTitle: { color: colors.text, fontWeight: '700' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.dark, marginBottom: 6 },
});
