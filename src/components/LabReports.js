import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Badge from './Badge';
import Disclaimer from './Disclaimer';
import EmptyState from './EmptyState';
import { colors, radius } from '../constants/theme';
import { DEMO_REPORT } from '../constants/demoData';
import { useAuth } from '../context/AuthContext';
import { useUserRecords } from '../hooks/useRecords';
import { clearDraft } from '../utils/reportDraft';
import { isoToDMY } from '../utils/dates';

const METHOD = { manual: 'Manual', text: 'Pasted text', pdf: 'PDF', image: 'Image' };

export default function LabReports() {
  const router = useRouter();
  const { demo } = useAuth();
  const { items, loading, error } = useUserRecords('labReports');
  const reports = [...items].sort((a, b) => (a.reportDate < b.reportDate ? 1 : a.reportDate > b.reportDate ? -1 : 0));

  const manual = () => { clearDraft(); router.push('/add-lab-report'); };

  return (
    <>
      <Disclaimer text="Reports are stored for your records only. The app does not diagnose from a report. Discuss results with your doctor." />

      <TouchableOpacity style={styles.primary} onPress={manual}>
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.primaryText}>Enter Report Manually</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.outline, { marginBottom: 14 }]} onPress={() => router.push('/paste-report')}>
        <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
        <Text style={styles.outlineText}>Paste Report Text</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {demo && <Text style={styles.demo}>Demo mode: reports are kept only until you close the app.</Text>}

      <Text style={styles.heading}>Report history</Text>
      {reports.length === 0 && !demo && (
        <Card><EmptyState icon="document-text-outline" text={loading ? 'Loading…' : 'No saved reports yet. Add one above.'} /></Card>
      )}

      {reports.map((r) => (
        <TouchableOpacity key={r.id} onPress={() => router.push({ pathname: '/report-detail', params: { id: r.id } })} activeOpacity={0.8}>
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.labName}</Text>
                <Text style={styles.small}>{isoToDMY(r.reportDate)} · {r.tests.length} tests · {r.patientName}</Text>
              </View>
              <Badge label={METHOD[r.entryMethod] || 'Manual'} tone="ok" />
              <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ marginLeft: 6 }} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      {demo && (
        <Card title="Sample report" right={<Badge label="DEMO DATA" />}>
          <Text style={styles.title}>{DEMO_REPORT.lab}</Text>
          <Text style={styles.small}>Report date {DEMO_REPORT.date} · imported historical values</Text>
          {DEMO_REPORT.tests.map((t) => (
            <View key={t.name} style={styles.labRow}>
              <Text style={styles.labName}>{t.name}</Text>
              <Text style={styles.labVal}>{t.value} {t.unit}</Text>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  primary: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, padding: 15, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  two: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  outline: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', padding: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white },
  outlineText: { color: colors.primary, fontWeight: '700' },
  heading: { fontSize: 16, fontWeight: '800', color: colors.dark, marginBottom: 8 },
  error: { color: colors.danger, marginBottom: 10 },
  demo: { backgroundColor: colors.warnBg, color: colors.warnText, padding: 10, borderRadius: radius.md, fontSize: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '700', color: colors.dark },
  small: { color: colors.muted, fontSize: 12 },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.light },
  labName: { color: colors.text, flex: 1 },
  labVal: { color: colors.dark, fontWeight: '800' },
});
