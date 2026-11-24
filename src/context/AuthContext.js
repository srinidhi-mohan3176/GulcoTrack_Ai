import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getProfile } from '../services/profileService';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [demo, setDemo] = useState(false); // demo mode works without Firebase

  const loadProfile = useCallback(async (uid) => {
    try {
      setProfile(await getProfile(uid));
    } catch (e) {
      setProfile(null); // missing profile or no access: the Profile screen handles it
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return undefined;
    }
    // Firebase calls this on app start, sign-in and sign-out.
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await loadProfile(u.uid);
      else setProfile(null);
      setInitializing(false);
    });
  }, [loadProfile]);

  const value = {
    user,
    profile,
    initializing,
    demo,
    signedIn: Boolean(user) || demo,
    enterDemo: () => setDemo(true),
    refreshProfile: async () => {
      if (auth && auth.currentUser) await loadProfile(auth.currentUser.uid);
    },
    logout: async () => {
      setDemo(false);
      if (auth && auth.currentUser) await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
