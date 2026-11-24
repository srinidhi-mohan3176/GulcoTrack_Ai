import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Card from '../components/Card';
import { colors, radius } from '../constants/theme';
import { parseReportText } from '../utils/reportParser';
import { setDraft, clearDraft } from '../utils/reportDraft';

// Paste text copied from a lab report. The same checker finds tests and values, then you review everything.
export default function PasteReport() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const findValues = () => {
    if (!text.trim()) { setError('Paste some report text first.'); return; }
    const parsed = parseReportText(text.split('\n'));
    if (parsed.tests.length === 0) {
      setError('No tests were recognised. Check that the text includes test names with values, or enter the report manually.');
      return;
    }
    setDraft({ method: 'text', ...parsed, notes: '' });
    router.replace('/add-lab-report');
  };

  const manual = () => { clearDraft(); router.replace('/add-lab-report'); };

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card title="Paste report text">
        <Text style={styles.text}>
          Copy the text from your report (for example from a digital report or by selecting text in your phone’s viewer) and paste it here.
          The app looks for common tests such as HbA1c, fasting and post-meal sugar, cholesterol, creatinine and urea.
          Nothing leaves your phone, and nothing is saved until you check and confirm every value.
        </Text>
        <TextInput
          style={styles.area}
          multiline
          placeholder={'Report Date: 14/11/2026\nHbA1c 8.5 %\nFasting Blood Sugar 150 mg/dL'}
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={(v) => { setText(v); setError(''); }}
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={findValues}>
          <Text style={styles.btnText}>Find values</Text>
        </TouchableOpacity>
      </Card>

      <TouchableOpacity style={styles.outline} onPress={manual}>
        <Text style={styles.outlineText}>Enter values manually instead</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  text: { color: colors.text, fontSize: 13, marginBottom: 12, lineHeight: 19 },
  area: { minHeight: 160, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 11, color: colors.text, textAlignVertical: 'top', marginBottom: 12 },
  err: { color: colors.danger, marginBottom: 10 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '800' },
  outline: { alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white },
  outlineText: { color: colors.primary, fontWeight: '700' },
});
