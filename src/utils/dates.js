const pad = (n) => String(n).padStart(2, '0');

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Local date as YYYY-MM-DD (not UTC, so a late-night entry lands on the right day).
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const mondayIndex = (d) => (d.getDay() + 6) % 7;

// Monday-to-Sunday dates of the week containing today, shifted by weekOffset weeks (0 = this week, -1 = last week).
export function weekDates(weekOffset = 0) {
  const monday = addDays(new Date(), -mondayIndex(new Date()) + weekOffset * 7);
  return DAY_NAMES.map((name, i) => ({ name, short: name.slice(0, 3), iso: toISO(addDays(monday, i)) }));
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function prettyDate(iso) {
  return parseISO(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// The last n days ending today, oldest first.
export function lastNDates(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => toISO(addDays(now, i - (n - 1))));
}

// Report dates are typed as DD-MM-YYYY and stored as YYYY-MM-DD.
export const DMY_RE = /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-((?:19|20)\d{2})$/;
export const dmyToISO = (s) => {
  const [d, m, y] = s.split('-');
  return `${y}-${m}-${d}`;
};
export const isoToDMY = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
// True for real calendar dates (rejects 31-02-2026).
export function isRealDMY(s) {
  if (!DMY_RE.test(s)) return false;
  const [d, m, y] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
