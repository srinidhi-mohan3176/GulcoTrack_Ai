import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';

export default function Disclaimer({ text }) {
  return (
    <View style={styles.box}>
      <Ionicons name="information-circle" size={18} color={colors.warnText} />
      <Text style={styles.text}>
        {text ||
          'GlucoTrack AI is a wellness tracking and educational app. It does not diagnose, prescribe, or adjust medicines or insulin. Always follow your doctor’s advice.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 8, backgroundColor: colors.warnBg, padding: 12, borderRadius: radius.md, marginBottom: 16 },
  text: { flex: 1, color: colors.warnText, fontSize: 12, lineHeight: 17 },
});
