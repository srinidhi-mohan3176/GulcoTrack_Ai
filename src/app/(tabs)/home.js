import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import EmptyState from '../../components/EmptyState';
import Disclaimer from '../../components/Disclaimer';
import { colors } from '../../constants/theme';
import { DEMO_PROFILE, DEMO_REPORT, MEAL_SLOTS } from '../../constants/demoData';
import { useAuth } from '../../context/AuthContext';
import { useRecords, useUserRecords } from '../../hooks/useRecords';
import { useDietPlan } from '../../hooks/useDietPlan';
import { weekDates, todayISO, lastNDates, isoToDMY, prettyDate } from '../../utils/dates';
import { targetsFromProfile, evaluateReading } from '../../utils/glucose';
import { sumEntries } from '../../utils/nutrition';
import { syncReminders } from '../../services/reminders';
import { daysSummary } from '../../utils/reminderPlan';

const sum = (list, k) => list.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const dateText = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Home() {
  const { demo, profile, user } = useAuth();
  const name = (profile && profile.name) || (user && user.displayName) || (demo ? DEMO_PROFILE.name : 'there');

  const today = todayISO();
  const week = weekDates(0);
  const weekIso = week.map((w) => w.iso);
  const todayName = (week.find((w) => w.iso === today) || week[0]).name;

  const { plan } = useDietPlan();
  const food = useRecords('foodLogs', weekIso);
  const act = useRecords('activityLogs', weekIso);
  const gl = useRecords('glucoseReadings', lastNDates(30));
  const reports = useUserRecords('labReports');
  const meds = useUserRecords('medicationReminders');
  const router = useRouter();
  // keep the phone's scheduled alerts in step with the saved reminders (does not ask for permission)
  useEffect(() => {
    if (!meds.loading) syncReminders(meds.items);
  }, [meds.items, meds.loading]);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const todaysReminders = meds.items.filter((r) => r.enabled && (r.days || []).includes(todayIdx)).sort((a, b) => a.time.localeCompare(b.time));
  const latestGlucose = [...gl.items].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))[0];
  const latestReport = [...reports.items].sort((a, b) => (a.reportDate < b.reportDate ? 1 : -1))[0];
  const glucoseLevel = latestGlucose ? evaluateReading(latestGlucose, demo ? {} : targetsFromProfile(profile)).level : 'none';
  const reportHighlights = latestReport
    ? (latestReport.tests || []).filter((t) => /hba1c|fasting|postprandial|ppbs|ldl/i.test(t.name) && !/vldl/i.test(t.name)).slice(0, 5)
    : [];

  const todayFood = food.items.filter((l) => l.date === today);
  const todayEntries = todayFood.filter((l) => l.mealType !== 'water');
  const eaten = sumEntries(todayEntries);
  const waterRec = todayFood.find((l) => l.mealType === 'water');
  const glasses = waterRec ? waterRec.glasses : 0;
  const mealsLogged = new Set(todayEntries.map((l) => l.mealType)).size;

  const todayAct = act.items.filter((l) => l.date === today);
  const steps = sum(todayAct, 'steps');
  const minutes = Math.round(sum(todayAct, 'durationMin'));
  const burned = Math.round(sum(todayAct, 'estKcal'));

  const activeDays = new Set(act.items.map((l) => l.date)).size;
  const foodDays = new Set(food.items.filter((l) => l.mealType !== 'water').map((l) => l.date)).size;
  const weekSteps = sum(act.items, 'steps');

  const todayPlan = plan[todayName] || {};
  const labHighlights = DEMO_REPORT.tests.filter((t) => ['HbA1c', 'Fasting Blood Sugar (FBS)', 'Postprandial Blood Sugar (PPBS)', 'LDL'].includes(t.name));

  return (
    <Screen title={`Hello, ${name}`} subtitle={dateText}>
      <Disclaimer />

      <Card title="Glucose monitoring">
        {latestGlucose ? (
          <View>
            <Text style={styles.glucose}>{latestGlucose.value} <Text style={styles.hint}>mg/dL</Text></Text>
            <Text style={styles.hint}>
              {latestGlucose.type === 'Other' && latestGlucose.context ? latestGlucose.context : latestGlucose.type} · {prettyDate(latestGlucose.date)} at {latestGlucose.time}
            </Text>
            {glucoseLevel === 'urgent' && <Text style={styles.urgent}>Beyond the urgent limit your doctor set. Follow your medical action plan now.</Text>}
            {glucoseLevel === 'outside' && <Text style={styles.warn}>Outside the range your doctor set. Follow your medical action plan.</Text>}
          </View>
        ) : (
          <EmptyState icon="water-outline" text="No glucose reading recorded in the last 30 days. Add one in the Glucose tab." />
        )}
      </Card>

      <Card title="Activity tracking">
        <View style={styles.stats}>
          <Stat label="Steps" value={String(steps)} />
          <Stat label="Active" value={`${minutes} min`} />
          <Stat label="Burned (est.)" value={`${burned} kcal`} />
        </View>
        <Text style={styles.hint}>
          {todayAct.length === 0 ? 'Nothing logged today. Add a walk in the Activity tab.' : 'From your logged activity today. Calories burned are a rough estimate.'}
        </Text>
      </Card>

      <Card title="Food consumption">
        <View style={styles.stats}>
          <Stat label="Eaten (est.)" value={`${eaten.kcal} kcal`} />
          <Stat label="Water" value={`${glasses} glasses`} />
        </View>
        <ProgressBar label="Meals logged" value={mealsLogged} goal={MEAL_SLOTS.length} />
        <Text style={styles.hint}>Food calories only. Not reduced by activity calories.</Text>
      </Card>

      <Card title={`Today’s meal schedule (${todayName})`} right={<Badge label="YOUR PLAN" tone="ok" />}>
        {MEAL_SLOTS.map((slot) => {
          const items = todayPlan[slot.key] || [];
          const logged = todayEntries.some((l) => l.mealType === slot.key);
          return (
            <View key={slot.key} style={styles.mealRow}>
              <Text style={styles.mealTime}>{slot.time}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{slot.label}{logged ? '  ✓ logged' : ''}</Text>
                <Text style={styles.hint}>{items.map((e) => e.name).join(', ') || 'No foods planned'}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      <Card title="Daily routine: medication reminders">
        {todaysReminders.length === 0 ? (
          <EmptyState icon="alarm-outline" text="No reminders for today. Set them in Profile, then Medication reminders." />
        ) : (
          todaysReminders.map((r) => (
            <View key={r.id} style={styles.labRow}>
              <Text style={styles.mealName}>{r.time}  {r.label}</Text>
              <Text style={styles.hint}>{daysSummary(r.days)}</Text>
            </View>
          ))
        )}
        <TouchableOpacity onPress={() => router.push('/reminders')} style={{ paddingTop: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Manage reminders</Text>
        </TouchableOpacity>
      </Card>

      {latestReport ? (
        <Card title="Latest lab report" right={<Badge label="HISTORICAL" />}>
          <Text style={styles.hint}>{latestReport.labName} · {isoToDMY(latestReport.reportDate)}. Report values, not today’s readings.</Text>
          {reportHighlights.map((t, i) => (
            <View key={`${t.name}-${i}`} style={styles.labRow}>
              <Text style={styles.mealName}>{t.name}</Text>
              <Text style={styles.labValue}>{t.value} {t.unit}</Text>
            </View>
          ))}
        </Card>
      ) : demo ? (
        <Card title="Latest lab report" right={<Badge label="DEMO DATA · IMPORTED" />}>
          <Text style={styles.hint}>{DEMO_REPORT.lab} · {DEMO_REPORT.date}. Historical values, not today’s readings.</Text>
          {labHighlights.map((t) => (
            <View key={t.name} style={styles.labRow}>
              <Text style={styles.mealName}>{t.name}</Text>
              <Text style={styles.labValue}>{t.value} {t.unit}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card title="Latest lab report">
          <EmptyState icon="document-text-outline" text="No lab report saved yet. Add one from the Glucose tab." />
        </Card>
      )}

      <Card title="Weekly progress">
        <Text style={styles.line}>Food logged on {foodDays} of 7 days</Text>
        <Text style={styles.line}>Activity logged on {activeDays} of 7 days</Text>
        <Text style={styles.line}>Steps logged this week: {weekSteps}</Text>
        <Text style={styles.hint}>Only what you recorded is counted. Days without entries are not assumed to be zero.</Text>
      </Card>
    </Screen>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stat: { flex: 1, backgroundColor: colors.light, borderRadius: 12, padding: 10, marginRight: 8 },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.dark },
  statLabel: { fontSize: 11, color: colors.muted },
  hint: { color: colors.muted, fontSize: 12 },
  line: { color: colors.text, marginBottom: 4 },
  mealRow: { flexDirection: 'row', paddingVertical: 6, gap: 10 },
  mealTime: { width: 64, color: colors.primary, fontWeight: '700', fontSize: 12 },
  mealName: { color: colors.text, fontWeight: '600' },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.light },
  labValue: { color: colors.dark, fontWeight: '800' },
  glucose: { fontSize: 30, fontWeight: '800', color: colors.dark },
  urgent: { color: colors.danger, fontSize: 12, marginTop: 6 },
  warn: { color: colors.warnText, fontSize: 12, marginTop: 6 },
});
