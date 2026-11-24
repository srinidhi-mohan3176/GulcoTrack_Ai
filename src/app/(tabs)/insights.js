import { Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Disclaimer from '../../components/Disclaimer';
import InsightCard from '../../components/InsightCard';
import { colors, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRecords, useUserRecords } from '../../hooks/useRecords';
import { lastNDates, isoToDMY } from '../../utils/dates';
import { targetsFromProfile } from '../../utils/glucose';
import { buildSummary, generateLocalInsights, reportText } from '../../utils/insights';

// Weekly report built on the phone from the user's own records. No AI service, no billing, no internet needed for the analysis.
export default function Insights() {
  const { demo, profile } = useAuth();
  const dates = lastNDates(7);
  const gl = useRecords('glucoseReadings', dates);
  const fd = useRecords('foodLogs', dates);
  const ac = useRecords('activityLogs', dates);
  const lr = useUserRecords('labReports');

  const targets = demo ? {} : targetsFromProfile(profile);
  const goals = demo ? {} : { steps: profile && profile.activityGoalSteps };
  const summary = buildSummary({ dates, glucose: gl.items, food: fd.items, activity: ac.items, reports: lr.items, targets, goals });
  const insights = generateLocalInsights(summary);

  const loading = gl.loading || fd.loading || ac.loading;
  const noData = summary.glucose.count === 0 && summary.food.daysLogged === 0 && summary.activity.daysActive === 0 && summary.labs.length === 0;

  const share = () => Share.share({ message: reportText(insights, summary.period, null) }).catch(() => {});

  return (
    <Screen title="Insights" subtitle={`Weekly report: ${isoToDMY(summary.period.from)} to ${isoToDMY(summary.period.to)}`}>
      <Disclaimer text="Insights describe only what you recorded. They never diagnose, prescribe, change medicines or insulin, give insulin doses, or predict glucose. Discuss your readings and patterns with your doctor." />
      {demo && <Text style={styles.demo}>Demo mode: insights are built from entries you added in this session only.</Text>}

      <Card title="Data this week">
        <Text style={styles.line}>Glucose readings: {summary.glucose.count} on {summary.glucose.days} of 7 days</Text>
        <Text style={styles.line}>Food logged on {summary.food.daysLogged} of 7 days</Text>
        <Text style={styles.line}>Activity logged on {summary.activity.daysActive} of 7 days</Text>
        <Text style={styles.line}>Lab reports saved: {lr.items.length}</Text>
        {loading && <Text style={styles.small}>Loading your records…</Text>}
        <Text style={styles.small}>Made on your phone from your own records. No data is sent to any AI service.</Text>
      </Card>

      {noData && !loading && (
        <Card title="Not enough data yet">
          <Text style={styles.text}>
            There is nothing recorded in the last 7 days to summarise. Add glucose readings, food and activity, and your weekly report will appear here. A few readings cannot show a reliable pattern, so the app waits for enough data.
          </Text>
        </Card>
      )}

      {insights.map((i) => <InsightCard key={i.id} insight={i} />)}

      <TouchableOpacity style={styles.outline} onPress={share}>
        <Ionicons name="share-outline" size={20} color={colors.primary} />
        <Text style={styles.outlineText}>Share weekly report</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demo: { backgroundColor: colors.warnBg, color: colors.warnText, padding: 10, borderRadius: radius.md, fontSize: 12, marginBottom: 12 },
  line: { color: colors.text, marginBottom: 3 },
  text: { color: colors.text, lineHeight: 20 },
  small: { color: colors.muted, fontSize: 12, marginTop: 4 },
  outline: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white, marginBottom: 14 },
  outlineText: { color: colors.primary, fontWeight: '700' },
});
