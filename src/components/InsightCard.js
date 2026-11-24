import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Badge from './Badge';
import { colors, radius } from '../constants/theme';

const Part = ({ label, text, list }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.label}>{label}</Text>
    {text ? <Text style={styles.text}>{text}</Text> : null}
    {list ? list.map((l, i) => <Text key={i} style={styles.bullet}>• {l}</Text>) : null}
  </View>
);

// One insight in the app's fixed five-part format.
export default function InsightCard({ insight }) {
  return (
    <Card title={insight.title} right={<Badge label="ON YOUR PHONE" tone="ok" />}>
      <Part label="Observation" text={insight.observation} />
      {insight.data && insight.data.length > 0 && <Part label="Supporting recorded data" list={insight.data} />}
      <Part label="Confidence / data limitations" text={insight.limitations} />
      <Part label="Educational suggestion" text={insight.suggestion} />
      <View style={styles.notice}>
        <Ionicons name="information-circle" size={16} color={colors.warnText} />
        <Text style={styles.noticeText}>{insight.notice}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', color: colors.primary, marginBottom: 3, textTransform: 'uppercase' },
  text: { color: colors.text, lineHeight: 20 },
  bullet: { color: colors.text, lineHeight: 20, marginLeft: 4 },
  notice: { flexDirection: 'row', gap: 6, backgroundColor: colors.warnBg, padding: 10, borderRadius: radius.md },
  noticeText: { flex: 1, color: colors.warnText, fontSize: 11, lineHeight: 16 },
});
