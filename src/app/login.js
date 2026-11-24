import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../services/firebase';
import { registerUser, loginUser, sendReset, friendlyAuthError } from '../services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { signedIn, enterDemo, refreshProfile } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (signedIn) return <Redirect href="/home" />;

  const switchMode = (m) => { setMode(m); setError(''); setInfo(''); };

  const submit = async () => {
    setError(''); setInfo('');
    if (!isFirebaseConfigured) { setError(friendlyAuthError(new Error('FIREBASE_NOT_CONFIGURED'))); return; }
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }

    if (mode === 'reset') {
      setBusy(true);
      try {
        await sendReset(email);
        setInfo('If an account exists for this email, a reset link has been sent.');
      } catch (e) { setError(friendlyAuthError(e)); } finally { setBusy(false); }
      return;
    }

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (mode === 'register') {
      if (!name.trim()) { setError('Please enter your name.'); return; }
      if (password !== confirm) { setError('Passwords do not match.'); return; }
      if (!agree) { setError('Please accept the wellness-only notice to continue.'); return; }
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        await registerUser({ name, email, password });
        await refreshProfile();
      } else {
        await loginUser(email, password);
      }
      // onAuthStateChanged in AuthContext updates the state and this screen redirects to Home.
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const titles = { login: 'Sign in', register: 'Create account', reset: 'Reset password' };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}><Ionicons name="pulse" size={40} color={colors.white} /></View>
        <Text style={styles.name}>GlucoTrack AI</Text>
        <Text style={styles.tag}>Your Health, Your Journey.</Text>

        <Text style={styles.heading}>{titles[mode]}</Text>

        {mode === 'register' && (
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.muted}
            value={name} onChangeText={setName} maxLength={100} />
        )}
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.muted}
          autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {mode !== 'reset' && (
          <TextInput style={styles.input} placeholder="Password (min 8 characters)" placeholderTextColor={colors.muted}
            secureTextEntry value={password} onChangeText={setPassword} />
        )}
        {mode === 'register' && (
          <>
            <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor={colors.muted}
              secureTextEntry value={confirm} onChangeText={setConfirm} />
            <TouchableOpacity style={styles.agreeRow} onPress={() => setAgree(!agree)}
              accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
              <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
              <Text style={styles.agreeText}>
                I understand GlucoTrack AI is for wellness tracking and education only. It does not diagnose or treat
                any condition or change my medicines or insulin. I agree to store my health records in my private account.
              </Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>{titles[mode]}</Text>}
        </TouchableOpacity>

        <View style={styles.links}>
          {mode !== 'login' && <Text style={styles.link} onPress={() => switchMode('login')}>Back to sign in</Text>}
          {mode === 'login' && <Text style={styles.link} onPress={() => switchMode('register')}>Create account</Text>}
          {mode === 'login' && <Text style={styles.link} onPress={() => switchMode('reset')}>Forgot password?</Text>}
        </View>

        <TouchableOpacity style={styles.btnOutline} onPress={enterDemo}>
          <Text style={styles.btnOutlineText}>Continue with demo data</Text>
        </TouchableOpacity>
        <Text style={styles.note}>Demo mode needs no account and saves nothing.</Text>
        {!isFirebaseConfigured && (
          <Text style={styles.warn}>Firebase keys not found in .env. Sign-in is unavailable until you add them.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  name: { textAlign: 'center', fontSize: 28, fontWeight: '800', color: colors.dark, marginTop: 12 },
  tag: { textAlign: 'center', color: colors.muted, marginBottom: 20 },
  heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
  input: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border, color: colors.text },
  agreeRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  agreeText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, marginBottom: 10 },
  info: { color: colors.primary, marginBottom: 10 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', marginTop: 4 },
  btnText: { color: colors.white, fontWeight: '700' },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 14 },
  link: { color: colors.primary, fontWeight: '700' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
  note: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 10 },
  warn: { textAlign: 'center', color: colors.warnText, backgroundColor: colors.warnBg, padding: 10, borderRadius: radius.md, fontSize: 12, marginTop: 14 },
});
