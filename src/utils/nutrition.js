import { FOODS, WEEK_PLAN, MEAL_SLOTS } from '../constants/demoData';

const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

export const foodList = () => Object.entries(FOODS).map(([id, f]) => ({ id, ...f }));

// An "entry" is one food portion: { name, serving, servings, kcal, carbs, protein, fat } (totals for all servings).
export function scaleFood(food, servings = 1) {
  const s = Number(servings) > 0 ? Number(servings) : 1;
  return {
    name: food.name,
    serving: food.qty || food.serving || '1 serving',
    servings: s,
    kcal: r0(food.kcal * s),
    carbs: r1(food.carbs * s),
    protein: r1(food.protein * s),
    fat: r1(food.fat * s),
  };
}

// Keeps only the fields Firestore rules allow on a food entry.
export function pickEntry(e) {
  return {
    name: e.name,
    serving: e.serving,
    servings: e.servings,
    kcal: e.kcal,
    carbs: e.carbs,
    protein: e.protein,
    fat: e.fat,
  };
}

// Totals for a list of entries. Water records carry no nutrition and are skipped.
export function sumEntries(list) {
  const t = list
    .filter((e) => e.mealType !== 'water')
    .reduce(
      (a, e) => ({
        kcal: a.kcal + (e.kcal || 0),
        carbs: a.carbs + (e.carbs || 0),
        protein: a.protein + (e.protein || 0),
        fat: a.fat + (e.fat || 0),
      }),
      { kcal: 0, carbs: 0, protein: 0, fat: 0 }
    );
  return { kcal: r0(t.kcal), carbs: r1(t.carbs), protein: r1(t.protein), fat: r1(t.fat) };
}

export function describeEntry(e) {
  const mult = e.servings && e.servings !== 1 ? `${e.servings} × ` : '';
  return `${mult}${e.serving} · ${e.kcal} kcal · C ${e.carbs}g · P ${e.protein}g · F ${e.fat}g`;
}

// The sample weekly plan converted to entries: { Monday: { breakfast: [entry, ...], ... }, ... }
export function defaultPlan() {
  const days = {};
  Object.keys(WEEK_PLAN).forEach((day) => {
    days[day] = {};
    MEAL_SLOTS.forEach((slot) => {
      days[day][slot.key] = WEEK_PLAN[day][slot.key].map((k) => scaleFood(FOODS[k], 1));
    });
  });
  return days;
}

// Approximate MET values (energy cost relative to rest). Estimates only.
export const ACTIVITY_TYPES = [
  { type: 'Walking', met: 3.5 },
  { type: 'Brisk walk', met: 4.5 },
  { type: 'Jogging', met: 7 },
  { type: 'Cycling', met: 6.8 },
  { type: 'Yoga', met: 2.5 },
  { type: 'Strength', met: 3.5 },
  { type: 'Other', met: 3 },
];

// kcal ≈ MET × weight (kg) × hours. Returns null when it cannot be estimated.
export function estimateKcal(type, minutes, weightKg) {
  const t = ACTIVITY_TYPES.find((a) => a.type === type);
  if (!t || !minutes || !weightKg) return null;
  return r0(t.met * weightKg * (minutes / 60));
}
