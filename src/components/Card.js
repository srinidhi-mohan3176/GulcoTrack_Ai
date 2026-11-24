import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

export default function Card({ title, right, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.row}>
          <Text style={styles.title}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
});
