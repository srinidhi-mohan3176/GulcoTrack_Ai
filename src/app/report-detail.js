import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import { colors, radius } from '../constants/theme';
import { useUid } from '../hooks/useRecords';
import { getRecord, removeRecord } from '../services/records';
import { isoToDMY } from '../utils/dates';

export default function ReportDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const uid = useUid();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (uid && id) {
        getRecord('labReports', uid, id)
          .then((r) => { if (alive) { setReport(r); setLoading(false); } })
          .catch(() => { if (alive) { setError('Could not open this report.'); setLoading(false); } });
      }
      return () => { alive = false; };
    }, [uid, id])
  );

  const confirmDelete = () =>
    Alert.alert('Delete this report?', 'The report and its saved values will be removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await removeRecord('labReports', uid, report.id);
            router.back();
          } catch (e) { Alert.alert('Could not delete', 'Check your connection and try again.'); }
        },
      },
    ]);

  if (loading) return <Loading />;
  if (!report) return <View style={styles.page}><Text style={styles.err}>{error || 'Report not found.'}</Text></View>;

  const groups = {};
  (report.tests || []).forEach((t) => { (groups[t.category || 'Other'] = groups[t.category || 'Other'] || []).push(t); });
  const method = { manual: 'Entered manually', text: 'From pasted text', pdf: 'From PDF', image: 'From image' }[report.entryMethod] || '';

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card title={report.labName} right={<Badge label={method} tone="ok" />}>
        <Text style={styles.small}>Patient: {report.patientName}</Text>
        <Text style={styles.small}>Report date: {isoToDMY(report.reportDate)}</Text>
        {report.notes ? <Text style={[styles.small, { marginTop: 6 }]}>Notes: {report.notes}</Text> : null}
        <Text style={[styles.small, { marginTop: 6 }]}>These are historical report values, not today’s readings.</Text>
      </Card>

      {Object.keys(groups).map((cat) => (
        <Card key={cat} title={cat}>
          {groups[cat].map((t, i) => (
            <View key={`${t.name}-${i}`} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.name}</Text>
                {t.range ? <Text style={styles.small}>Reference: {t.range}</Text> : null}
                {t.notes ? <Text style={styles.small}>{t.notes}</Text> : null}
              </View>
              <Text style={styles.val}>{t.value} {t.unit}</Text>
            </View>
          ))}
        </Card>
      ))}

      <Text style={styles.small}>The app does not diagnose from a report. Discuss these results with your doctor.</Text>

      <TouchableOpacity style={styles.btn} onPress={() => router.push({ pathname: '/add-lab-report', params: { id: report.id } })}>
        <Text style={styles.btnText}>Edit report</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnDanger} onPress={confirmDelete}>
        <Text style={styles.btnDangerText}>Delete report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  err: { color: colors.danger, padding: 16 },
  small: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.light },
  name: { color: colors.text, fontWeight: '600' },
  val: { color: colors.dark, fontWeight: '800' },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', marginTop: 14 },
  btnText: { color: colors.white, fontWeight: '800' },
  btnDanger: { borderWidth: 1.5, borderColor: colors.danger, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 10 },
  btnDangerText: { color: colors.danger, fontWeight: '700' },
});
