import {
  collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc, getDocs,
  query, where, serverTimestamp, deleteField,
} from 'firebase/firestore';
import { db } from './firebase';

// Data layer for user-owned records.
// - Signed in: Firestore (every document carries userId, and the security rules enforce ownership).
// - Demo mode (uid === 'demo'): kept in memory only. It disappears when the app closes.

const mem = {};
let counter = 1;
const table = (col) => (mem[col] = mem[col] || new Map());
const isDemo = (uid) => uid === 'demo';
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function requireDb() {
  if (!db) throw new Error('FIREBASE_NOT_CONFIGURED');
  return db;
}

// All records whose `date` (YYYY-MM-DD) is in the list. Uses userId == uid plus date "in", which needs no custom index.
export async function listByDates(col, uid, dates) {
  if (isDemo(uid)) return [...table(col).values()].filter((r) => dates.includes(r.date));
  const out = [];
  for (let i = 0; i < dates.length; i += 30) {
    const q = query(
      collection(requireDb(), col),
      where('userId', '==', uid),
      where('date', 'in', dates.slice(i, i + 30))
    );
    const snap = await getDocs(q);
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  }
  return out;
}

export async function addRecord(col, uid, data) {
  const body = clean({ ...data, userId: uid });
  if (isDemo(uid)) {
    const id = `demo_${counter++}`;
    table(col).set(id, { id, ...body });
    return id;
  }
  const ref = await addDoc(collection(requireDb(), col), {
    ...body,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// Fields set to undefined in `patch` are removed from the record.
export async function updateRecord(col, uid, id, patch) {
  if (isDemo(uid)) {
    const cur = table(col).get(id) || { id };
    const next = { ...cur };
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined) delete next[k];
      else next[k] = v;
    });
    table(col).set(id, next);
    return;
  }
  const body = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
  await updateDoc(doc(requireDb(), col, id), { ...body, updatedAt: serverTimestamp() });
}

export async function removeRecord(col, uid, id) {
  if (isDemo(uid)) {
    table(col).delete(id);
    return;
  }
  await deleteDoc(doc(requireDb(), col, id));
}

export async function getRecord(col, uid, id) {
  if (isDemo(uid)) return table(col).get(id) || null;
  const snap = await getDoc(doc(requireDb(), col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Create or fully replace a record with a known id (diet plan, daily water count).
export async function setRecord(col, uid, id, data) {
  const body = clean({ ...data, userId: uid });
  if (isDemo(uid)) {
    table(col).set(id, { id, ...body });
    return;
  }
  await setDoc(doc(requireDb(), col, id), { ...body, updatedAt: serverTimestamp() });
}

// All records owned by the user (no date filter). Used for lab reports.
export async function listByUser(col, uid) {
  if (isDemo(uid)) return [...table(col).values()];
  const snap = await getDocs(query(collection(requireDb(), col), where('userId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
