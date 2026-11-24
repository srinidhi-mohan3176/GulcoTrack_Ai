import { Redirect } from 'expo-router';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';

// Decides where to go on app start: wait for Firebase to restore the session, then route.
export default function Index() {
  const { initializing, signedIn } = useAuth();
  if (initializing) return <Loading />;
  return <Redirect href={signedIn ? '/home' : '/login'} />;
}
