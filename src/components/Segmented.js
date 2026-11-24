import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

export default function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <TouchableOpacity key={o} style={[styles.btn, value === o && styles.on]} onPress={() => onChange(o)}
          accessibilityRole="button" accessibilityState={{ selected: value === o }}>
          <Text style={[styles.text, value === o && { color: colors.white }]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.light, borderRadius: radius.pill, padding: 4, marginBottom: 14 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  on: { backgroundColor: colors.primary },
  text: { fontWeight: '700', color: colors.dark, fontSize: 13 },
});
