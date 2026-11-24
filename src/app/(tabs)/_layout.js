import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Loading from '../../components/Loading';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const tab = (name, title, icon) => (
  <Tabs.Screen
    name={name}
    options={{
      title,
      tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} />,
    }}
  />
);

export default function TabsLayout() {
  const { initializing, signedIn } = useAuth();

  // Route guard: private screens are only for signed-in users (or demo mode).
  if (initializing) return <Loading />;
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 8, backgroundColor: colors.white },
      }}
    >
      {tab('home', 'Home', 'home')}
      {tab('diet', 'Diet', 'restaurant')}
      {tab('activity', 'Activity', 'walk')}
      {tab('glucose', 'Glucose', 'water')}
      {tab('insights', 'Insights', 'sparkles')}
      {tab('profile', 'Profile', 'person')}
    </Tabs>
  );
}
