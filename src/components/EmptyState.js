import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export default function EmptyState({ icon = 'leaf-outline', text }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={28} color={colors.muted} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 14 },
  text: { color: colors.muted, textAlign: 'center', marginTop: 6, fontSize: 13 },
});
