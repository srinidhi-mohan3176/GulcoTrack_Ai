import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

export default function ProgressBar({ label, value, goal, unit = '' }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value} / {goal} {unit}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: colors.text, fontWeight: '600' },
  value: { color: colors.muted },
  track: { height: 10, backgroundColor: colors.light, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.primary, borderRadius: radius.pill },
});
