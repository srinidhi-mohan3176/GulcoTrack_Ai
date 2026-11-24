import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import Card from '../components/Card';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';
import { listByUser, removeRecord, getRecord } from '../services/records';
import { cancelAllReminders } from '../services/reminders';
import { friendlyAuthError } from '../services/authService';

const COLLECTIONS = ['glucoseReadings', 'labReports', 'foodLogs', 'activityLogs', 'medicationReminders', 'dietPlans'];

export default function Privacy() {
  const router = useRouter();
  const { user, demo, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const exportData = async () => {
    setBusy(true);
    try {
      const out = { exportedAt: new Date().toISOString(), account: { email: user.email } };
      for (const col of COLLECTIONS) out[col] = await listByUser(col, user.uid);
      out.profile = await getRecord('profiles', user.uid, user.uid);
      await Share.share({ message: JSON.stringify(out, null, 2) });
    } catch (e) {
      Alert.alert('Could not export', 'Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const reallyDelete = async () => {
    setError('');
    if (!password) { setError('Enter your password to confirm.'); return; }
    setBusy(true);
    try {
      const current = auth.currentUser;
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
      const uid = current.uid;
      for (const col of COLLECTIONS) {
        const docs = await listByUser(col, uid);
        for (let i = 0; i < docs.length; i += 20) {
          await Promise.all(docs.slice(i, i + 20).map((d) => removeRecord(col, uid, d.id)));
        }
      }
      await removeRecord('profiles', uid, uid);
      await removeRecord('users', uid, uid);
      await cancelAllReminders();
      await deleteUser(current);
      router.replace('/login');
    } catch (e) {
      setError(e && e.code ? friendlyAuthError(e) : 'Could not delete everything. Some data may remain. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account and all data?',
      'This permanently deletes your profile, glucose readings, food and activity records, lab reports and reminders. It cannot be undone.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete everything', style: 'destructive', onPress: reallyDelete }]
    );

  const signOut = async () => { await logout(); router.replace('/login'); };

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card title="What this app stores">
        <Text style={styles.text}>
          Your profile, glucose readings, food and activity records, lab report values you enter or paste, and reminders you set. They are stored in this app’s own Firebase project, and the security rules only let you read and change your own records.
        </Text>
        <Text style={[styles.text, { marginTop: 8 }]}>
          Weekly insights are calculated on your phone. Your records are not sent to any AI service or advertiser. Photos and PDF files of reports are not uploaded.
        </Text>
        <Text style={[styles.small, { marginTop: 8 }]}>
          The person who owns this Firebase project (the app’s administrator) can technically see stored data in the Firebase console, so the project should be kept private and protected.
        </Text>
      </Card>

      <Card title="This app is for wellness tracking">
        <Text style={styles.text}>It does not diagnose, prescribe, suggest doses, or replace your doctor.</Text>
      </Card>

      {demo || !user ? (
        <Card title="Account"><Text style={styles.text}>Demo mode has no account. Nothing is stored beyond this session.</Text></Card>
      ) : (
        <>
          <Card title="Your data">
            <Text style={styles.text}>Export a copy of everything stored for you (as text you can save or share).</Text>
            <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={exportData} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Export my data</Text>}
            </TouchableOpacity>
          </Card>

          <Card title="Sign out">
            <TouchableOpacity style={styles.btnOutline} onPress={signOut}><Text style={styles.btnOutlineText}>Sign out</Text></TouchableOpacity>
          </Card>

          <Card title="Delete account and data">
            <Text style={styles.text}>Enter your password, then delete. This removes your records and your sign-in account for good.</Text>
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <TouchableOpacity style={[styles.btnDanger, busy && { opacity: 0.6 }]} onPress={confirmDelete} disabled={busy}>
              <Text style={styles.btnDangerText}>Delete my account and data</Text>
            </TouchableOpacity>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  text: { color: colors.text, lineHeight: 20 },
  small: { color: colors.muted, fontSize: 12 },
  err: { color: colors.danger, marginVertical: 8 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, marginTop: 10 },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 12 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
  btnDanger: { borderWidth: 1.5, borderColor: colors.danger, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 12 },
  btnDangerText: { color: colors.danger, fontWeight: '800' },
});
