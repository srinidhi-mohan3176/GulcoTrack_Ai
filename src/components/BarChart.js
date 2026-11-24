import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

// Simple dependency-free bar chart. data = [{ label: 'Mon', value: 0 }, ...]
export default function BarChart({ data, height = 120 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.wrap}>
      {data.map((d) => (
        <View key={d.label} style={styles.col}>
          <View style={[styles.barArea, { height }]}>
            <View style={[styles.bar, { height: Math.max(3, (d.value / max) * height) }]} />
          </View>
          <Text style={styles.label}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1, alignItems: 'center' },
  barArea: { justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: 16, backgroundColor: colors.primary, borderRadius: radius.sm },
  label: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
