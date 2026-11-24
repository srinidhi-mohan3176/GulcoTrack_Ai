// Pure helpers for medication reminders. Reminders are alerts the user sets; the app never suggests medicines, doses or times.

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function daysSummary(days) {
  if (!days || days.length === 7) return 'Every day';
  return [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(', ');
}

// Our days: 0 = Monday ... 6 = Sunday. Expo weekdays: 1 = Sunday ... 7 = Saturday.
export const expoWeekday = (d) => (d === 6 ? 1 : d + 2);

// What to schedule on the phone for one reminder.
export function planTriggers(r) {
  const [hour, minute] = r.time.split(':').map(Number);
  if (!r.days || r.days.length === 7) return [{ kind: 'daily', hour, minute }];
  return [...new Set(r.days)].map((d) => ({ kind: 'weekly', weekday: expoWeekday(d), hour, minute }));
}

export function reminderBody(r) {
  return `${r.label}${r.note ? ` · ${r.note}` : ''}. Follow your doctor’s instructions.`;
}

// Returns an error message or null.
export function validateReminder({ label, time, days, note }) {
  if (!String(label || '').trim()) return 'Enter a name for the reminder.';
  if (String(label).length > 60) return 'The name is too long (max 60 characters).';
  if (!TIME_RE.test(String(time || '').trim())) return 'Time must look like 08:30 (24-hour).';
  if (!Array.isArray(days) || days.length < 1) return 'Choose at least one day.';
  if (String(note || '').length > 100) return 'The note is too long (max 100 characters).';
  return null;
}
