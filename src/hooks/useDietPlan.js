import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getRecord, setRecord, removeRecord } from '../services/records';
import { defaultPlan } from '../utils/nutrition';
import { useUid } from './useRecords';

// The weekly plan: the user's saved plan if there is one, otherwise the sample plan.
export function useDietPlan() {
  const uid = useUid();
  const [plan, setPlan] = useState(defaultPlan);
  const [customized, setCustomized] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (uid) {
        getRecord('dietPlans', uid, uid)
          .then((rec) => {
            if (alive && rec && rec.days) {
              setPlan(rec.days);
              setCustomized(true);
            }
          })
          .catch(() => {});
      }
      return () => {
        alive = false;
      };
    }, [uid])
  );

  const savePlan = async (days) => {
    await setRecord('dietPlans', uid, uid, { days });
    setPlan(days);
    setCustomized(true);
  };

  const resetPlan = async () => {
    await removeRecord('dietPlans', uid, uid);
    setPlan(defaultPlan());
    setCustomized(false);
  };

  return { plan, customized, savePlan, resetPlan, uid };
}
