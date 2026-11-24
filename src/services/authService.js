import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserRecords } from './profileService';

const MESSAGES = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'No internet connection. Check your network and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in the Firebase console yet.',
  'auth/invalid-api-key': 'The Firebase API key is invalid. Check your .env file and restart Expo with: npx expo start -c',
};

// Safe, generic messages: never include medical data or raw server errors.
export function friendlyAuthError(e) {
  if (e && e.message === 'FIREBASE_NOT_CONFIGURED') {
    return 'Firebase is not configured yet. Add your keys to .env and restart Expo, or use demo data.';
  }
  return MESSAGES[e && e.code] || 'Something went wrong. Please try again.';
}

function requireAuth() {
  if (!auth) throw new Error('FIREBASE_NOT_CONFIGURED');
  return auth;
}

export async function registerUser({ name, email, password }) {
  const a = requireAuth();
  const cred = await createUserWithEmailAndPassword(a, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  // If this step fails (for example Firestore rules are not published), the account still exists.
  // The Profile screen can create the missing profile document on first save.
  await createUserRecords(cred.user.uid, { name: name.trim(), email: email.trim() });
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return cred.user;
}

export async function sendReset(email) {
  await sendPasswordResetEmail(requireAuth(), email.trim());
}
