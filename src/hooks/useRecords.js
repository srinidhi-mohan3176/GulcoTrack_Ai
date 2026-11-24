import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { listByDates, listByUser } from '../services/records';

// 'demo' in demo mode, the Firebase uid when signed in, otherwise null.
export function useUid() {
  const { user, demo } = useAuth();
  if (demo) return 'demo';
  return user ? user.uid : null;
}

// Loads records for the given dates and reloads whenever the screen comes into focus.
export function useRecords(col, dates) {
  const uid = useUid();
  const key = dates.join(',');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError('');
    try {
      setItems(await listByDates(col, uid, key.split(',')));
    } catch (e) {
      setError('Could not load your records. Check your connection and that the latest Firestore rules are published.');
    } finally {
      setLoading(false);
    }
  }, [col, uid, key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { items, loading, error, reload, uid };
}

// Loads every record the user owns in a collection (for example lab reports) and reloads on focus.
export function useUserRecords(col) {
  const uid = useUid();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError('');
    try {
      setItems(await listByUser(col, uid));
    } catch (e) {
      setError('Could not load your records. Check your connection and that the latest Firestore rules are published.');
    } finally {
      setLoading(false);
    }
  }, [col, uid]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { items, loading, error, reload, uid };
}
