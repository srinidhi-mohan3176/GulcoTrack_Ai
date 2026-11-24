// All values here are DEMO DATA. Nothing is a live reading.

export const DEMO_PROFILE = {
  name: 'Mr. Mohan',
  age: 50,
  gender: 'Male',
  heightCm: 165,
  weightKg: 85,
  bmi: 31.2,
  diagnosisStatus: 'Not clinically confirmed in profile; clinician confirmation required',
  medication: 'Insulin + other medication (as reported; details need clinician confirmation)',
  goal: 'Track glucose and improve lifestyle',
};

// Imported historical report, NOT today's readings.
export const DEMO_REPORT = {
  lab: 'Meenakshi Labs, Kumbakonam',
  date: '14-11-2026',
  tests: [
    { name: 'HbA1c', category: 'Diabetes Profile', value: '8.5', unit: '%' },
    { name: 'Estimated Average Glucose (eAG)', category: 'Diabetes Profile', value: '197', unit: 'mg/dL' },
    { name: 'Fasting Blood Sugar (FBS)', category: 'Blood Glucose', value: '150', unit: 'mg/dL' },
    { name: 'Postprandial Blood Sugar (PPBS)', category: 'Blood Glucose', value: '240', unit: 'mg/dL' },
    { name: 'Total Cholesterol', category: 'Lipid Profile', value: '143', unit: 'mg/dL' },
    { name: 'Triglycerides', category: 'Lipid Profile', value: '165', unit: 'mg/dL' },
    { name: 'VLDL', category: 'Lipid Profile', value: '33', unit: 'mg/dL' },
    { name: 'HDL', category: 'Lipid Profile', value: '37', unit: 'mg/dL' },
    { name: 'LDL', category: 'Lipid Profile', value: '73', unit: 'mg/dL' },
  ],
};

export const TEST_CATEGORIES = [
  'Blood Glucose', 'Diabetes Profile', 'Lipid Profile', 'Kidney Function',
  'Liver Function', 'Thyroid Profile', 'Complete Blood Count', 'Other',
];

export const COMMON_TESTS = [
  { name: 'HbA1c', unit: '%' },
  { name: 'Fasting Blood Sugar (FBS)', unit: 'mg/dL' },
  { name: 'Postprandial Blood Sugar (PPBS)', unit: 'mg/dL' },
  { name: 'Random Blood Sugar (RBS)', unit: 'mg/dL' },
  { name: 'Estimated Average Glucose (eAG)', unit: 'mg/dL' },
  { name: 'Total Cholesterol', unit: 'mg/dL' },
  { name: 'Triglycerides', unit: 'mg/dL' },
  { name: 'HDL', unit: 'mg/dL' },
  { name: 'LDL', unit: 'mg/dL' },
  { name: 'VLDL', unit: 'mg/dL' },
  { name: 'Creatinine', unit: 'mg/dL' },
  { name: 'Urea', unit: 'mg/dL' },
];

// Estimated nutrition per listed serving (approximate, for demo; a dietitian must review).
const f = (name, qty, kcal, carbs, protein, fat) => ({ name, qty, kcal, carbs, protein, fat });

export const FOODS = {
  idli: f('Idli', '3 pieces', 180, 36, 6, 1),
  dosa: f('Dosa', '2 medium', 250, 40, 6, 7),
  adai: f('Adai', '2 pieces', 280, 38, 11, 8),
  ragiDosa: f('Ragi dosa', '2 pieces', 220, 38, 6, 5),
  vegOats: f('Vegetable oats', '1 bowl', 190, 30, 6, 5),
  sambar: f('Sambar', '1 cup', 90, 12, 4, 3),
  rasam: f('Rasam', '1 cup', 40, 6, 1, 1),
  boiledEgg: f('Boiled eggs', '2 eggs', 140, 1, 12, 10),
  omelette: f('Egg omelette', '2-egg omelette', 190, 1, 13, 14),
  paneerBhurji: f('Paneer bhurji (low-fat paneer)', '100 g', 200, 5, 16, 13),
  grilledFish: f('Grilled fish', '100 g', 150, 0, 22, 6),
  fishCurry: f('Fish curry', '1 cup', 180, 6, 20, 9),
  chapati: f('Chapati', '2 pieces', 200, 36, 6, 4),
  curd: f('Curd', '1 cup', 100, 8, 6, 5),
  sundal: f('Chickpea sundal', '1 cup', 160, 24, 9, 3),
  keerai: f('Keerai poriyal', '1/2 cup', 70, 6, 3, 4),
  veg: f('Vegetable poriyal', '1/2 cup', 80, 8, 3, 4),
  rice: f('Rice (controlled portion)', '3/4 cup cooked', 150, 33, 3, 1),
  dal: f('Dal', '1 cup', 150, 22, 9, 3),
  greenGram: f('Green gram (moong)', '1 cup cooked', 210, 38, 14, 1),
  millet: f('Millet (foxtail) rice', '3/4 cup cooked', 160, 32, 4, 2),
  apple: f('Apple (whole fruit)', '1 small', 70, 18, 0, 0),
  guava: f('Guava (whole fruit)', '1 medium', 60, 12, 2, 1),
  upma: f('Vegetable upma', '1 cup', 210, 32, 5, 7),
  pongal: f('Pongal', '1 small bowl', 220, 32, 6, 8),
  buttermilk: f('Buttermilk', '1 glass', 40, 4, 2, 1.5),
  sproutsSalad: f('Sprouts salad', '1 cup', 110, 18, 8, 1),
  cucumberSalad: f('Cucumber salad', '1 cup', 30, 6, 1, 0),
  almonds: f('Almonds', '8 almonds', 55, 2, 2, 5),
  vegSoup: f('Vegetable soup', '1 bowl', 70, 10, 3, 2),
  banana: f('Banana (whole fruit)', '1 small', 90, 23, 1, 0),
  papaya: f('Papaya (whole fruit)', '1 cup cubes', 60, 15, 1, 0),
  orange: f('Orange (whole fruit)', '1 medium', 62, 15, 1, 0),
  chickenCurry: f('Chicken curry', '1 cup', 240, 7, 25, 12),
  teaNoSugar: f('Tea, no sugar (with milk)', '1 cup', 30, 3, 1, 1),
};

export const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', time: '8:00 AM' },
  { key: 'midMorning', label: 'Mid-morning snack', time: '11:00 AM' },
  { key: 'lunch', label: 'Lunch', time: '1:00 PM' },
  { key: 'evening', label: 'Evening snack', time: '5:00 PM' },
  { key: 'dinner', label: 'Dinner', time: '8:00 PM' },
];

export const WEEK_PLAN = {
  Monday:    { breakfast: ['idli', 'sambar', 'boiledEgg'], midMorning: ['apple'], lunch: ['rice', 'dal', 'keerai', 'curd'], evening: ['sundal'], dinner: ['chapati', 'paneerBhurji', 'veg'] },
  Tuesday:   { breakfast: ['ragiDosa', 'sambar'], midMorning: ['guava'], lunch: ['millet', 'fishCurry', 'veg'], evening: ['boiledEgg'], dinner: ['dosa', 'sambar'] },
  Wednesday: { breakfast: ['vegOats', 'boiledEgg'], midMorning: ['apple'], lunch: ['rice', 'rasam', 'greenGram', 'keerai'], evening: ['sundal'], dinner: ['chapati', 'dal', 'veg'] },
  Thursday:  { breakfast: ['adai', 'sambar'], midMorning: ['guava'], lunch: ['millet', 'dal', 'veg', 'curd'], evening: ['boiledEgg'], dinner: ['chapati', 'grilledFish', 'keerai'] },
  Friday:    { breakfast: ['idli', 'sambar', 'omelette'], midMorning: ['apple'], lunch: ['rice', 'fishCurry', 'veg'], evening: ['sundal'], dinner: ['ragiDosa', 'sambar'] },
  Saturday:  { breakfast: ['dosa', 'sambar', 'boiledEgg'], midMorning: ['guava'], lunch: ['rice', 'rasam', 'paneerBhurji', 'keerai'], evening: ['sundal'], dinner: ['chapati', 'dal', 'veg'] },
  Sunday:    { breakfast: ['ragiDosa', 'sambar', 'omelette'], midMorning: ['apple'], lunch: ['millet', 'grilledFish', 'veg', 'curd'], evening: ['boiledEgg'], dinner: ['idli', 'sambar'] },
};

export const DAYS = Object.keys(WEEK_PLAN);

export function mealTotals(keys) {
  return keys.reduce(
    (t, k) => ({
      kcal: t.kcal + FOODS[k].kcal,
      carbs: t.carbs + FOODS[k].carbs,
      protein: t.protein + FOODS[k].protein,
      fat: t.fat + FOODS[k].fat,
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 }
  );
}
