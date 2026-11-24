import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Disclaimer from '../../components/Disclaimer';
import Segmented from '../../components/Segmented';
import BarChart from '../../components/BarChart';
import FoodPicker from '../../components/FoodPicker';
import Field from '../../components/Field';
import EmptyState from '../../components/EmptyState';
import { colors, radius } from '../../constants/theme';
import { MEAL_SLOTS } from '../../constants/demoData';
import { useAuth } from '../../context/AuthContext';
import { useRecords } from '../../hooks/useRecords';
import { useDietPlan } from '../../hooks/useDietPlan';
import { addRecord, updateRecord, removeRecord, setRecord } from '../../services/records';
import { weekDates, todayISO, prettyDate } from '../../utils/dates';
import { sumEntries, describeEntry, pickEntry } from '../../utils/nutrition';

const SAFETY =
  'Food records are for your information only. Do not skip meals or change your carbohydrate intake or insulin because of these numbers. Follow your doctor’s plan. This sample plan must be reviewed by a qualified dietitian or doctor.';

const n = (v) => Number(String(v).trim());
const okNum = (v, lo, hi) => String(v).trim() !== '' && Number.isFinite(n(v)) && n(v) >= lo && n(v) <= hi;

export default function Diet() {
  const { demo } = useAuth();
  const week = weekDates(0);
  const weekIso = week.map((w) => w.iso);
  const today = todayISO();
  const todayName = (week.find((w) => w.iso === today) || week[0]).name;

  const [tab, setTab] = useState('Plan');
  const [dayName, setDayName] = useState(todayName);
  const [picker, setPicker] = useState(null); // { kind: 'replace' | 'addPlan' | 'addLog', slot, index }
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const { plan, customized, savePlan, resetPlan } = useDietPlan();
  const { items: logs, loading, error, reload, uid } = useRecords('foodLogs', weekIso);

  const dayIso = week.find((w) => w.name === dayName).iso;
  const isFuture = dayIso > today;
  const dayAll = logs.filter((l) => l.date === dayIso);
  const dayLogs = dayAll.filter((l) => l.mealType !== 'water');
  const water = dayAll.find((l) => l.mealType === 'water');
  const dayPlan = plan[dayName] || {};

  const fail = (msg) => Alert.alert('Something went wrong', msg || 'Could not save. Check your connection and try again.');

  // ---- plan: tick a meal as eaten (creates real food records) or untick it (removes them) ----
  const toggleMeal = async (slot) => {
    if (busy || isFuture) return;
    setBusy(true);
    try {
      const done = dayLogs.filter((l) => l.mealType === slot.key && l.fromPlan);
      if (done.length) {
        await Promise.all(done.map((l) => removeRecord('foodLogs', uid, l.id)));
      } else {
        for (const it of dayPlan[slot.key] || []) {
          await addRecord('foodLogs', uid, {
            ...pickEntry(it), date: dayIso, mealType: slot.key, source: 'plan', fromPlan: true,
          });
        }
      }
      await reload();
    } catch (e) { fail(); } finally { setBusy(false); }
  };

  const clonePlan = () => JSON.parse(JSON.stringify(plan));

  const removeFromPlan = async (slotKey, index) => {
    try {
      const days = clonePlan();
      days[dayName][slotKey].splice(index, 1);
      await savePlan(days);
    } catch (e) { fail(); }
  };

  const onPick = async (entry, isManual) => {
    const p = picker;
    setPicker(null);
    try {
      if (p.kind === 'addLog') {
        await addRecord('foodLogs', uid, {
          ...pickEntry(entry), date: dayIso, mealType: p.slot, source: isManual ? 'manual' : 'search', fromPlan: false,
        });
        await reload();
      } else {
        const days = clonePlan();
        const list = days[dayName][p.slot] || [];
        if (p.kind === 'replace') list[p.index] = pickEntry(entry);
        else list.push(pickEntry(entry));
        days[dayName][p.slot] = list;
        await savePlan(days);
      }
    } catch (e) { fail(); }
  };

  const confirmReset = () =>
    Alert.alert('Reset plan?', 'This replaces your changes with the sample weekly plan. Food you already logged is kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { try { await resetPlan(); } catch (e) { fail(); } } },
    ]);

  // ---- log ----
  const confirmDelete = (l) =>
    Alert.alert('Delete this record?', l.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await removeRecord('foodLogs', uid, l.id); await reload(); } catch (e) { fail(); } } },
    ]);

  const startEdit = (l) => {
    const sv = l.servings > 0 ? l.servings : 1;
    setEditing({
      id: l.id, name: l.name, serving: l.serving || '', servings: String(sv),
      base: { kcal: l.kcal / sv, carbs: l.carbs / sv, protein: l.protein / sv, fat: l.fat / sv },
      kcal: String(l.kcal), carbs: String(l.carbs), protein: String(l.protein), fat: String(l.fat), error: '',
    });
  };

  const setEdit = (k) => (v) => setEditing((e) => ({ ...e, [k]: v, error: '' }));
  const setEditServings = (v) =>
    setEditing((e) => {
      const next = { ...e, servings: v, error: '' };
      if (okNum(v, 0.1, 100)) {
        const s = n(v);
        next.kcal = String(Math.round(e.base.kcal * s));
        next.carbs = String(Math.round(e.base.carbs * s * 10) / 10);
        next.protein = String(Math.round(e.base.protein * s * 10) / 10);
        next.fat = String(Math.round(e.base.fat * s * 10) / 10);
      }
      return next;
    });

  const saveEdit = async () => {
    const e = editing;
    let msg = '';
    if (!e.name.trim()) msg = 'Name is required.';
    else if (!okNum(e.servings, 0.1, 100)) msg = 'Servings must be between 0.1 and 100.';
    else if (!okNum(e.kcal, 0, 5000)) msg = 'Calories must be between 0 and 5000.';
    else if (!okNum(e.carbs, 0, 1000) || !okNum(e.protein, 0, 1000) || !okNum(e.fat, 0, 1000)) msg = 'Carbs, protein and fat must be between 0 and 1000 g.';
    if (msg) { setEditing({ ...e, error: msg }); return; }
    try {
      await updateRecord('foodLogs', uid, e.id, {
        name: e.name.trim(), serving: e.serving.trim() || '1 serving', servings: n(e.servings),
        kcal: Math.round(n(e.kcal)), carbs: n(e.carbs), protein: n(e.protein), fat: n(e.fat),
      });
      setEditing(null);
      await reload();
    } catch (err) { fail(); }
  };

  const changeWater = async (delta) => {
    if (isFuture || busy) return;
    const next = Math.max(0, Math.min(30, (water ? water.glasses : 0) + delta));
    setBusy(true);
    try {
      if (next === 0) {
        if (water) await removeRecord('foodLogs', uid, water.id);
      } else {
        await setRecord('foodLogs', uid, `${uid}_water_${dayIso}`, {
          date: dayIso, mealType: 'water', name: 'Water', serving: '1 glass', servings: next, glasses: next,
          kcal: 0, carbs: 0, protein: 0, fat: 0, source: 'manual', fromPlan: false,
        });
      }
      await reload();
    } catch (e) { fail(); } finally { setBusy(false); }
  };

  // ---- numbers ----
  const planned = sumEntries(MEAL_SLOTS.flatMap((s) => dayPlan[s.key] || []));
  const eaten = sumEntries(dayLogs);
  const perDay = week.map((w) => {
    const list = logs.filter((l) => l.date === w.iso && l.mealType !== 'water');
    return { label: w.short, value: sumEntries(list).kcal, count: list.length };
  });
  const loggedDays = perDay.filter((d) => d.count > 0);
  const weekTotals = sumEntries(logs);
  const avg = (k) => (loggedDays.length ? Math.round((weekTotals[k] / loggedDays.length) * 10) / 10 : 0);

  return (
    <Screen title="Diet" subtitle="Plan meals, log what you eat, review your week">
      <Disclaimer text={SAFETY} />
      {demo && (
        <Text style={styles.demo}>Demo mode: entries are kept only until you close the app. Create an account to save them.</Text>
      )}

      <Segmented options={['Plan', 'Log', 'Report']} value={tab} onChange={setTab} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {week.map((w) => (
          <TouchableOpacity key={w.name} onPress={() => setDayName(w.name)} style={[styles.chip, dayName === w.name && styles.chipOn]}>
            <Text style={[styles.chipText, dayName === w.name && { color: colors.white }]}>{w.short}</Text>
            <Text style={[styles.chipSub, dayName === w.name && { color: colors.white }]}>{w.iso === today ? 'Today' : w.iso.slice(8)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ---------------- PLAN ---------------- */}
      {tab === 'Plan' && (
        <>
          <Card title={`${dayName} plan totals`} right={<Badge label={customized ? 'YOUR PLAN' : 'SAMPLE PLAN'} />}>
            <Text style={styles.line}>{planned.kcal} kcal · Carbs {planned.carbs}g · Protein {planned.protein}g · Fat {planned.fat}g</Text>
            <Text style={styles.small}>
              {isFuture
                ? 'Future day: you can edit the plan, but meals can be ticked as eaten only on the day.'
                : 'Tick a meal when you have eaten it. This adds it to your food records.'}
            </Text>
          </Card>

          {MEAL_SLOTS.map((slot) => {
            const items = dayPlan[slot.key] || [];
            const done = dayLogs.some((l) => l.mealType === slot.key && l.fromPlan);
            const t = sumEntries(items);
            return (
              <Card key={slot.key}>
                <View style={styles.mealHead}>
                  <TouchableOpacity onPress={() => toggleMeal(slot)} disabled={isFuture || busy}
                    accessibilityRole="checkbox" accessibilityState={{ checked: done, disabled: isFuture }}>
                    <Ionicons name={done ? 'checkbox' : 'square-outline'} size={28} color={isFuture ? colors.muted : colors.primary} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.mealTitle}>{slot.label}</Text>
                    <Text style={styles.small}>{slot.time} · {t.kcal} kcal planned</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPicker({ kind: 'addPlan', slot: slot.key })} accessibilityLabel={`Add food to ${slot.label}`}>
                    <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                {items.length === 0 && <Text style={styles.small}>No foods in this meal. Tap + to add.</Text>}
                {items.map((it, i) => (
                  <View key={`${it.name}-${i}`} style={styles.food}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName}>{it.name}</Text>
                      <Text style={styles.small}>{describeEntry(it)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setPicker({ kind: 'replace', slot: slot.key, index: i })} style={{ padding: 6 }}>
                      <Text style={styles.link}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeFromPlan(slot.key, i)} style={{ padding: 6 }} accessibilityLabel="Remove from plan">
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            );
          })}

          {customized && (
            <TouchableOpacity style={styles.btnOutline} onPress={confirmReset}>
              <Text style={styles.btnOutlineText}>Reset to sample plan</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ---------------- LOG ---------------- */}
      {tab === 'Log' && (
        <>
          <Card title={`${dayName} (${prettyDate(dayIso)}): food eaten`} right={<Badge label="ESTIMATES" />}>
            {loading && dayLogs.length === 0 ? <Text style={styles.small}>Loading…</Text> : (
              <Text style={styles.big}>{eaten.kcal} kcal</Text>
            )}
            <Text style={styles.line}>Carbs {eaten.carbs}g · Protein {eaten.protein}g · Fat {eaten.fat}g</Text>
            <Text style={styles.small}>
              These are food calories consumed. Calories burned in the Activity tab are tracked separately and are not subtracted here.
            </Text>
          </Card>

          <Card title="Water">
            <View style={styles.waterRow}>
              <TouchableOpacity style={styles.round} onPress={() => changeWater(-1)} disabled={isFuture || busy} accessibilityLabel="Remove one glass">
                <Ionicons name="remove" size={22} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.big}>{water ? water.glasses : 0} <Text style={styles.small}>glasses</Text></Text>
              <TouchableOpacity style={styles.round} onPress={() => changeWater(1)} disabled={isFuture || busy} accessibilityLabel="Add one glass">
                <Ionicons name="add" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.small}>Ask your doctor how much water is right for you.</Text>
          </Card>

          {isFuture && <Text style={styles.small}>You cannot log food for a future day.</Text>}

          {MEAL_SLOTS.map((slot) => {
            const entries = dayLogs.filter((l) => l.mealType === slot.key);
            const t = sumEntries(entries);
            return (
              <Card key={slot.key} title={slot.label} right={<Text style={styles.small}>{t.kcal} kcal</Text>}>
                {entries.length === 0 && <Text style={styles.small}>Nothing logged.</Text>}
                {entries.map((l) => (
                  <View key={l.id} style={styles.food}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName}>{l.name}{l.fromPlan ? '  (from plan)' : ''}</Text>
                      <Text style={styles.small}>{describeEntry(l)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => startEdit(l)} style={{ padding: 6 }} accessibilityLabel="Edit record">
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(l)} style={{ padding: 6 }} accessibilityLabel="Delete record">
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {!isFuture && (
                  <TouchableOpacity onPress={() => setPicker({ kind: 'addLog', slot: slot.key })} style={{ paddingTop: 8 }}>
                    <Text style={styles.link}>+ Add food (search or manual)</Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })}
        </>
      )}

      {/* ---------------- REPORT ---------------- */}
      {tab === 'Report' && (
        <>
          <Card title="This week: food calories eaten" right={<Badge label="ESTIMATES" />}>
            <BarChart data={perDay} />
            <Text style={[styles.small, { marginTop: 8 }]}>
              {loggedDays.length === 0
                ? 'No food logged this week yet.'
                : `Food logged on ${loggedDays.length} of 7 days. Days with no records show an empty bar, which means nothing was logged, not that nothing was eaten.`}
            </Text>
          </Card>

          <Card title="Weekly averages (days with records)">
            {loggedDays.length === 0 ? (
              <EmptyState icon="stats-chart-outline" text="Log some meals to see averages." />
            ) : (
              <Text style={styles.line}>
                {Math.round(weekTotals.kcal / loggedDays.length)} kcal · Carbs {avg('carbs')}g · Protein {avg('protein')}g · Fat {avg('fat')}g per day
              </Text>
            )}
          </Card>

          <Card title={`${dayName}: planned vs actual`}>
            <View style={styles.cmpHead}>
              <Text style={[styles.cmpCell, { flex: 2 }]}>Meal</Text>
              <Text style={styles.cmpCell}>Planned</Text>
              <Text style={styles.cmpCell}>Logged</Text>
            </View>
            {MEAL_SLOTS.map((slot) => (
              <View key={slot.key} style={styles.cmpRow}>
                <Text style={[styles.cmpCell, { flex: 2, color: colors.text }]}>{slot.label}</Text>
                <Text style={styles.cmpCell}>{sumEntries(dayPlan[slot.key] || []).kcal}</Text>
                <Text style={styles.cmpCell}>{isFuture ? '-' : sumEntries(dayLogs.filter((l) => l.mealType === slot.key)).kcal}</Text>
              </View>
            ))}
            <View style={styles.cmpRow}>
              <Text style={[styles.cmpCell, { flex: 2, color: colors.dark, fontWeight: '800' }]}>Total kcal</Text>
              <Text style={[styles.cmpCell, { fontWeight: '800' }]}>{planned.kcal}</Text>
              <Text style={[styles.cmpCell, { fontWeight: '800' }]}>{isFuture ? '-' : eaten.kcal}</Text>
            </View>
            <Text style={[styles.small, { marginTop: 8 }]}>
              Differences are shown for your records only. Talk to your dietitian or doctor before changing how you eat.
            </Text>
          </Card>
        </>
      )}

      {picker && (
        <FoodPicker
          visible
          title={picker.kind === 'replace' ? 'Replace food' : picker.kind === 'addLog' ? 'Log food eaten' : 'Add to plan'}
          onClose={() => setPicker(null)}
          onPick={onPick}
        />
      )}

      {/* edit record modal */}
      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {editing && (
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.mealTitle}>Edit food record</Text>
              <Text style={[styles.small, { marginBottom: 12 }]}>Changing servings updates the nutrition numbers. You can still adjust them by hand afterwards.</Text>
              <Field label="Food name" value={editing.name} onChangeText={setEdit('name')} maxLength={100} />
              <Field label="Serving size" value={editing.serving} onChangeText={setEdit('serving')} maxLength={60} />
              <Field label="Servings" value={editing.servings} onChangeText={setEditServings} keyboardType="decimal-pad" />
              <Field label="Calories (kcal)" value={editing.kcal} onChangeText={setEdit('kcal')} keyboardType="decimal-pad" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field style={{ flex: 1 }} label="Carbs (g)" value={editing.carbs} onChangeText={setEdit('carbs')} keyboardType="decimal-pad" />
                <Field style={{ flex: 1 }} label="Protein (g)" value={editing.protein} onChangeText={setEdit('protein')} keyboardType="decimal-pad" />
                <Field style={{ flex: 1 }} label="Fat (g)" value={editing.fat} onChangeText={setEdit('fat')} keyboardType="decimal-pad" />
              </View>
              {editing.error ? <Text style={styles.error}>{editing.error}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={saveEdit}><Text style={styles.btnText}>Save changes</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => setEditing(null)}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demo: { backgroundColor: colors.warnBg, color: colors.warnText, padding: 10, borderRadius: radius.md, fontSize: 12, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.white, marginRight: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '700' },
  chipSub: { color: colors.muted, fontSize: 10 },
  line: { color: colors.text, marginBottom: 4 },
  big: { fontSize: 24, fontWeight: '800', color: colors.dark },
  small: { color: colors.muted, fontSize: 12 },
  error: { color: colors.danger, marginBottom: 10 },
  mealHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mealTitle: { fontSize: 16, fontWeight: '700', color: colors.dark },
  food: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.light },
  foodName: { color: colors.text, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  waterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cmpHead: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  cmpRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.light },
  cmpCell: { flex: 1, color: colors.muted, fontSize: 13 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', marginTop: 6 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
});
