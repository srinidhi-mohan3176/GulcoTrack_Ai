import { GLUCOSE_TYPES, evaluateReading } from './glucose';
import { sumEntries } from './nutrition';
import { isoToDMY } from './dates';

// Builds weekly insights from what the user recorded. Runs on the phone with no AI service.
// It only DESCRIBES recorded data. It never diagnoses, prescribes, suggests doses, or predicts.

export const STANDARD_NOTICE =
  'Educational information based only on what you recorded. It is not a diagnosis or medical advice. Do not change medicines or insulin because of it. Talk to your doctor.';

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;
const LAB_KEY = /hba1c|glucose|sugar|fbs|ppbs|rbs|cholesterol|triglycerides|hdl|ldl|vldl|creatinine|urea/i;

// ---------- 1. numbers ----------
export function buildSummary({ dates, glucose, food, activity, reports, targets = {}, goals = {} }) {
  const periodDays = dates.length;

  // glucose
  const evals = glucose.map((r) => evaluateReading(r, targets));
  const vals = glucose.map((r) => r.value);
  const byType = {};
  GLUCOSE_TYPES.forEach((t) => {
    const list = glucose.filter((r) => r.type === t);
    if (list.length) {
      const v = list.map((r) => r.value);
      byType[t] = { count: list.length, avg: r0(avg(v)), min: Math.min(...v), max: Math.max(...v) };
    }
  });
  const g = {
    count: glucose.length,
    days: new Set(glucose.map((r) => r.date)).size,
    avg: vals.length ? r0(avg(vals)) : null,
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
    byType,
    targetsSet: ['fastingMin', 'fastingMax', 'postMealMax', 'alertLow', 'alertHigh'].some((k) => targets[k] != null),
    evaluated: evals.filter((e) => e.level !== 'none').length,
    inRange: evals.filter((e) => e.level === 'ok').length,
    outside: evals.filter((e) => e.level === 'outside').length,
    urgent: evals.filter((e) => e.level === 'urgent').length,
  };

  // food
  const entries = food.filter((l) => l.mealType !== 'water');
  const foodDays = dates.filter((d) => entries.some((l) => l.date === d));
  const perDay = foodDays.map((d) => {
    const list = entries.filter((l) => l.date === d);
    return { ...sumEntries(list), meals: new Set(list.map((l) => l.mealType)).size };
  });
  const water = food.filter((l) => l.mealType === 'water');
  const f = {
    daysLogged: foodDays.length,
    avgKcal: perDay.length ? r0(avg(perDay.map((x) => x.kcal))) : null,
    avgCarbs: perDay.length ? r1(avg(perDay.map((x) => x.carbs))) : null,
    avgProtein: perDay.length ? r1(avg(perDay.map((x) => x.protein))) : null,
    avgFat: perDay.length ? r1(avg(perDay.map((x) => x.fat))) : null,
    avgMealsPerLoggedDay: perDay.length ? r1(avg(perDay.map((x) => x.meals))) : null,
    waterDays: water.length,
    avgGlasses: water.length ? r1(avg(water.map((w) => w.glasses || 0))) : null,
  };

  // activity
  const sumK = (k) => activity.reduce((a, l) => a + (Number(l[k]) || 0), 0);
  const activeDates = dates.filter((d) => activity.some((l) => l.date === d));
  const stepsByDay = dates.map((d) => activity.filter((l) => l.date === d).reduce((a, l) => a + (Number(l.steps) || 0), 0));
  const a = {
    daysActive: activeDates.length,
    sessions: activity.length,
    totalSteps: r0(sumK('steps')),
    totalMinutes: r0(sumK('durationMin')),
    totalKm: r1(sumK('distanceKm')),
    goalSteps: goals.steps != null ? goals.steps : null,
    daysMeetingStepGoal: goals.steps ? stepsByDay.filter((s) => s >= goals.steps).length : null,
  };

  // observed association: glucose on days with logged activity vs other days
  const activeSet = new Set(activeDates);
  const withAct = glucose.filter((r) => activeSet.has(r.date));
  const without = glucose.filter((r) => !activeSet.has(r.date));
  const dWith = new Set(withAct.map((r) => r.date)).size;
  const dWithout = new Set(without.map((r) => r.date)).size;
  const pattern =
    dWith >= 2 && dWithout >= 2 && withAct.length >= 3 && without.length >= 3
      ? {
          activeDays: dWith, otherDays: dWithout,
          avgOnActiveDays: r0(avg(withAct.map((r) => r.value))),
          avgOnOtherDays: r0(avg(without.map((r) => r.value))),
        }
      : null;

  // lab reports (latest two), test names and values only
  const labs = [...reports]
    .sort((x, y) => (x.reportDate < y.reportDate ? 1 : -1))
    .slice(0, 2)
    .map((r) => ({
      date: r.reportDate,
      tests: (r.tests || []).filter((t) => LAB_KEY.test(t.name)).slice(0, 12).map((t) => ({ name: t.name, value: t.value, unit: t.unit })),
    }));

  return { period: { from: dates[0], to: dates[periodDays - 1], days: periodDays }, glucose: g, food: f, activity: a, pattern, labs };
}

// ---------- 2. wording ----------
const dataLevel = (n) => (n >= 10 ? 'Moderate amount of recorded data' : n >= 5 ? 'Limited recorded data' : 'Very limited recorded data');
const mk = (id, title, observation, data, limitations, suggestion) => ({
  id, title, observation, data, limitations, suggestion, notice: STANDARD_NOTICE, source: 'local',
});

export function generateLocalInsights(s) {
  const out = [];
  const P = s.period.days;
  const { glucose: g, food: f, activity: a } = s;

  // glucose
  if (g.count < 3) {
    out.push(mk('glucose', 'Glucose summary',
      'There are not enough glucose readings this week to summarise.',
      [`${g.count} reading${g.count === 1 ? '' : 's'} recorded in the last ${P} days`],
      'At least 3 readings are needed. A few readings cannot show a reliable pattern.',
      'Keep recording readings at the times your doctor recommends.'));
  } else {
    const data = [`Average of recorded readings: ${g.avg} mg/dL`];
    Object.keys(g.byType).forEach((t) => {
      const x = g.byType[t];
      data.push(`${t}: ${x.count} reading${x.count === 1 ? '' : 's'}, average ${x.avg} mg/dL (range ${x.min}–${x.max})`);
    });
    if (g.targetsSet && g.evaluated > 0) {
      data.push(`Of ${g.evaluated} readings that have a doctor-set target: ${g.inRange} within range, ${g.outside} outside range, ${g.urgent} beyond an urgent limit`);
    }
    out.push(mk('glucose', 'Glucose summary',
      `Your recorded glucose readings ranged from ${g.min} to ${g.max} mg/dL across ${g.count} readings on ${g.days} of ${P} days.`,
      data,
      `${dataLevel(g.count)}. Averages hide day-to-day variation, and readings taken at different times of day are not directly comparable.` +
        (g.targetsSet ? '' : ' No doctor-set targets are entered, so readings are not compared with any range.'),
      g.outside + g.urgent > 0
        ? 'Share the readings outside your doctor’s range with your doctor, and follow your medical action plan.'
        : 'Keep recording, and bring this log to your next appointment so your doctor can review it.'));
  }
  if (g.urgent > 0) {
    out.push(mk('urgent', 'Readings beyond your urgent limits',
      `${g.urgent} recorded reading${g.urgent === 1 ? ' was' : 's were'} beyond an urgent limit set by your doctor.`,
      ['See the Glucose tab for the dates and times'],
      'Only the readings you recorded are counted.',
      'Follow your medical action plan, and tell your doctor about these readings. If you feel unwell, get medical help.'));
  }

  // association with activity
  if (s.pattern) {
    const p = s.pattern;
    out.push(mk('pattern', 'Glucose and activity',
      `Average recorded glucose was ${p.avgOnActiveDays} mg/dL on ${p.activeDays} days with logged activity and ${p.avgOnOtherDays} mg/dL on ${p.otherDays} other days.`,
      [`Days with logged activity: ${p.activeDays}`, `Other days with readings: ${p.otherDays}`],
      'This is an observed association over a small number of days, not proof that activity caused the difference. Meals, medicines, illness, stress and when readings were taken also matter.',
      'Note any patterns you see and discuss them with your doctor.'));
  } else if (g.count >= 3 && a.daysActive > 0) {
    out.push(mk('pattern', 'Glucose and activity',
      'There are not enough days with readings on both active and other days to compare.',
      [`Active days: ${a.daysActive}`, `Days with glucose readings: ${g.days}`],
      'Comparing needs at least 2 days with readings in each group and several readings.',
      'Keep recording both. A comparison can appear when there is more data.'));
  }

  // food
  if (f.daysLogged < 2) {
    out.push(mk('food', 'Food summary',
      'There is not enough food logging this week to summarise.',
      [`Food logged on ${f.daysLogged} of ${P} days`],
      'At least 2 days of food records are needed.',
      'Log meals and snacks as you eat them so the summary can be useful.'));
  } else {
    const data = [`Food logged on ${f.daysLogged} of ${P} days`, `Meals logged per logged day: ${f.avgMealsPerLoggedDay}`];
    if (f.avgGlasses != null) data.push(`Water recorded on ${f.waterDays} days, about ${f.avgGlasses} glasses on those days`);
    out.push(mk('food', 'Food summary',
      `On the ${f.daysLogged} days you logged food, recorded intake averaged about ${f.avgKcal} kcal per day (carbs ${f.avgCarbs} g, protein ${f.avgProtein} g, fat ${f.avgFat} g).`,
      data,
      'Only logged food is counted, so unlogged meals or snacks make totals look lower than what you ate. Portions are estimates. Calories burned in activity are tracked separately and are not subtracted.',
      'Logging every meal and snack makes this more useful. Review your eating pattern with your dietitian or doctor, and do not skip meals or change carbohydrates or insulin without their advice.'));
  }

  // activity
  if (a.daysActive === 0) {
    out.push(mk('activity', 'Activity summary',
      `No activity was logged in the last ${P} days.`,
      [],
      'Activity is entered by you, so days you did not log are not counted as inactive.',
      'If you walk or exercise, log it so it appears here. Ask your doctor what activity is right for you.'));
  } else {
    const parts = [`${a.sessions} session${a.sessions === 1 ? '' : 's'}`, `about ${a.totalMinutes} minutes`];
    if (a.totalSteps) parts.push(`${a.totalSteps} steps`);
    if (a.totalKm) parts.push(`${a.totalKm} km`);
    const data = [`Activity logged on ${a.daysActive} of ${P} days`];
    if (a.goalSteps) data.push(`${a.daysMeetingStepGoal} of ${P} days reached your steps goal of ${a.goalSteps}`);
    out.push(mk('activity', 'Activity summary',
      `You logged activity on ${a.daysActive} of ${P} days: ${parts.join(', ')}.`,
      data,
      'Activity is entered by you, so days you did not log are not counted as inactive. Calorie estimates are rough.',
      'Keep logging. Exercise can change glucose levels, so ask your doctor how to plan activity around meals and medicines.'));
  }

  // lab history
  if (s.labs.length) {
    const [latest, prev] = s.labs;
    const data = latest.tests.slice(0, 6).map((t) => `${t.name}: ${t.value} ${t.unit}`.trim());
    if (prev) {
      latest.tests.forEach((t) => {
        const p = prev.tests.find((x) => x.name === t.name);
        if (p && p.value !== t.value) data.push(`${t.name}: ${p.value} ${p.unit} (${isoToDMY(prev.date)}) → ${t.value} ${t.unit} (${isoToDMY(latest.date)})`.replace(/\s+\(/g, ' ('));
      });
    }
    out.push(mk('labs', 'Laboratory report history',
      `Your latest saved report is dated ${isoToDMY(latest.date)}.${prev ? ` The one before it is dated ${isoToDMY(prev.date)}.` : ''} These are historical report values, not current readings.`,
      data,
      'Reports from different labs or on different days may not be directly comparable. Only your doctor can interpret lab results.',
      'Bring your reports to appointments and ask your doctor what the values mean for you.'));
  }

  // logging consistency
  out.push(mk('logging', 'Your logging this week',
    `You recorded glucose on ${g.days}, food on ${f.daysLogged} and activity on ${a.daysActive} of the last ${P} days.`,
    [],
    'Insights are only as complete as your records. Days with no records are unknown, not zero.',
    'Regular logging, as your doctor recommends, gives the most useful picture.'));

  return out;
}

// ---------- 3. shareable text ----------
export function reportText(insights, period, aiInsights) {
  const lines = [`GlucoTrack AI weekly report: ${isoToDMY(period.from)} to ${isoToDMY(period.to)}`, ''];
  const add = (list, heading) => {
    if (!list || !list.length) return;
    if (heading) lines.push(heading, '');
    list.forEach((i) => {
      lines.push(i.title, `Observation: ${i.observation}`);
      (i.data || []).forEach((d) => lines.push(`  - ${d}`));
      lines.push(`Limitations: ${i.limitations}`, `Suggestion: ${i.suggestion}`, '');
    });
  };
  add(insights, null);
  add(aiInsights, 'AI-assisted insights');
  lines.push(STANDARD_NOTICE);
  return lines.join('\n');
}
