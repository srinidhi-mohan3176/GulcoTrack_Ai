import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export default function Loading() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
