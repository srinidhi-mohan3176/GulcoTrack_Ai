import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import '../services/reminders'; // sets how notifications are shown
import { colors } from '../constants/theme';

const header = (title) => ({
  headerShown: true,
  title,
  headerTintColor: colors.dark,
  headerStyle: { backgroundColor: colors.white },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="add-lab-report" options={header('Lab Report')} />
        <Stack.Screen name="paste-report" options={header('Paste Report Text')} />
        <Stack.Screen name="report-detail" options={header('Report')} />
        <Stack.Screen name="reminders" options={header('Medication Reminders')} />
        <Stack.Screen name="privacy" options={header('Privacy and Account')} />
      </Stack>
    </AuthProvider>
  );
}
