import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

export default function Field({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && { height: 70, textAlignVertical: 'top' }, error && { borderColor: colors.danger }]} />
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 11, color: colors.text },
  err: { color: colors.danger, fontSize: 11, marginTop: 2 },
});
