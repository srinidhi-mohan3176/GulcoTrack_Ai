export const GLUCOSE_TYPES = ['Fasting', 'Before meal', 'After meal', 'Bedtime', 'Other'];
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const readingTime = (r) => new Date(`${r.date}T${r.time}:00`).getTime();

export function targetsFromProfile(p) {
  return {
    fastingMin: p ? p.targetFastingMin : undefined,
    fastingMax: p ? p.targetFastingMax : undefined,
    postMealMax: p ? p.targetPostMealMax : undefined,
    alertLow: p ? p.alertLow : undefined,
    alertHigh: p ? p.alertHigh : undefined,
    setBy: p ? p.targetSetBy : undefined,
  };
}

export const URGENT_ACTION =
  'Follow your medical action plan now. If you feel unwell, contact your doctor or local emergency services.';
export const OUTSIDE_ACTION =
  'Follow your medical action plan and tell your doctor if this keeps happening. If you feel unwell, get medical help.';

const has = (v) => v !== undefined && v !== null;

// Compares a reading with the ranges YOUR DOCTOR set. The app never invents targets.
// level: 'urgent' | 'outside' | 'ok' | 'none' (no doctor-set target for this reading type)
export function evaluateReading(r, t) {
  const v = r.value;
  if (has(t.alertLow) && v < t.alertLow) {
    return { level: 'urgent', text: `This reading is below the urgent low limit (${t.alertLow} mg/dL) set by your doctor.` };
  }
  if (has(t.alertHigh) && v > t.alertHigh) {
    return { level: 'urgent', text: `This reading is above the urgent high limit (${t.alertHigh} mg/dL) set by your doctor.` };
  }
  if (r.type === 'Fasting' && (has(t.fastingMin) || has(t.fastingMax))) {
    if (has(t.fastingMin) && v < t.fastingMin) return { level: 'outside', text: `Below your doctor's fasting range (${t.fastingMin}–${has(t.fastingMax) ? t.fastingMax : '?'} mg/dL).` };
    if (has(t.fastingMax) && v > t.fastingMax) return { level: 'outside', text: `Above your doctor's fasting range (${has(t.fastingMin) ? t.fastingMin : '?'}–${t.fastingMax} mg/dL).` };
    return { level: 'ok', text: 'Within your doctor-set fasting range.' };
  }
  if (r.type === 'After meal' && has(t.postMealMax)) {
    if (v > t.postMealMax) return { level: 'outside', text: `Above your doctor's after-meal limit (${t.postMealMax} mg/dL).` };
    return { level: 'ok', text: 'Within your doctor-set after-meal limit.' };
  }
  return { level: 'none', text: 'No doctor-set target for this reading type.' };
}

export function stats(list) {
  if (!list.length) return { count: 0, avg: null, min: null, max: null };
  const vals = list.map((r) => r.value);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { count: vals.length, avg: Math.round(avg), min: Math.min(...vals), max: Math.max(...vals) };
}
