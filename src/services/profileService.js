import { doc, getDoc, setDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from './firebase';

function requireDb() {
  if (!db) throw new Error('FIREBASE_NOT_CONFIGURED');
  return db;
}

// Called once after registration. Records that the user accepted the wellness-only notice.
export async function createUserRecords(uid, { name, email }) {
  const d = requireDb();
  await setDoc(doc(d, 'users', uid), {
    email,
    displayName: name,
    consentAcceptedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(d, 'profiles', uid), {
    userId: uid,
    name,
    diagnosisStatus: 'not_confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(requireDb(), 'profiles', uid));
  return snap.exists() ? snap.data() : null;
}

// merge: true also creates the document if it is missing, and keeps fields we do not send.
export async function saveProfile(uid, data) {
  await setDoc(
    doc(requireDb(), 'profiles', uid),
    { ...data, userId: uid, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ---------- form helpers ----------
const s = (v) => (v === undefined || v === null ? '' : String(v));
const blank = (v) => s(v).trim() === '';
const num = (v) => (blank(v) ? deleteField() : Number(v));
const txt = (v) => (blank(v) ? deleteField() : s(v).trim());

export function profileToForm(p, user) {
  return {
    name: s(p && p.name ? p.name : user && user.displayName),
    age: s(p && p.age),
    heightCm: s(p && p.heightCm),
    weightKg: s(p && p.weightKg),
    medicalHistory: s(p && p.medicalHistory),
    diagnosisStatus: (p && p.diagnosisStatus) || 'not_confirmed',
    medications: ((p && p.medications) || []).join('\n'),
    allergies: s(p && p.allergies),
    doctorName: s(p && p.doctorName),
    doctorPhone: s(p && p.doctorPhone),
    emergencyName: s(p && p.emergencyName),
    emergencyPhone: s(p && p.emergencyPhone),
    targetFastingMin: s(p && p.targetFastingMin),
    targetFastingMax: s(p && p.targetFastingMax),
    targetPostMealMax: s(p && p.targetPostMealMax),
    targetSetBy: s(p && p.targetSetBy),
  };
}

export function formToProfile(f) {
  return {
    name: s(f.name).trim(),
    age: num(f.age),
    heightCm: num(f.heightCm),
    weightKg: num(f.weightKg),
    medicalHistory: txt(f.medicalHistory),
    diagnosisStatus: f.diagnosisStatus || 'not_confirmed',
    medications: s(f.medications).split('\n').map((x) => x.trim()).filter(Boolean),
    allergies: txt(f.allergies),
    doctorName: txt(f.doctorName),
    doctorPhone: txt(f.doctorPhone),
    emergencyName: txt(f.emergencyName),
    emergencyPhone: txt(f.emergencyPhone),
    targetFastingMin: num(f.targetFastingMin),
    targetFastingMax: num(f.targetFastingMax),
    targetPostMealMax: num(f.targetPostMealMax),
    targetSetBy: txt(f.targetSetBy),
  };
}

const inRange = (v, lo, hi) => blank(v) || (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi);

// Returns an error message, or null when the form is valid. Limits match firestore.rules.
export function validateForm(f) {
  if (blank(f.name)) return 'Name is required.';
  if (s(f.name).length > 100) return 'Name is too long.';
  if (!inRange(f.age, 1, 120)) return 'Age must be between 1 and 120.';
  if (!inRange(f.heightCm, 50, 250)) return 'Height must be between 50 and 250 cm.';
  if (!inRange(f.weightKg, 20, 400)) return 'Weight must be between 20 and 400 kg.';
  if (s(f.medicalHistory).length > 2000) return 'Medical history is too long (max 2000 characters).';
  if (s(f.allergies).length > 500) return 'Allergies text is too long (max 500 characters).';
  if (s(f.medications).split('\n').filter((x) => x.trim()).length > 30) return 'Too many medication lines (max 30).';
  for (const k of ['targetFastingMin', 'targetFastingMax', 'targetPostMealMax']) {
    if (!inRange(f[k], 20, 600)) return 'Glucose targets must be between 20 and 600 mg/dL.';
  }
  if (!blank(f.targetFastingMin) && !blank(f.targetFastingMax) && Number(f.targetFastingMin) >= Number(f.targetFastingMax)) {
    return 'Fasting minimum must be lower than the maximum.';
  }
  return null;
}
