import { Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

export default function Badge({ label = 'DEMO DATA', tone = 'warn' }) {
  const bg = tone === 'warn' ? colors.warnBg : colors.light;
  const fg = tone === 'warn' ? colors.warnText : colors.dark;
  return <Text style={[styles.badge, { backgroundColor: bg, color: fg }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
});
