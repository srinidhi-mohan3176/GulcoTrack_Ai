import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { planTriggers, reminderBody } from '../utils/reminderPlan';

// Local notifications scheduled on the phone (they also work in Expo Go).
const CHANNEL = 'medication-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function hasPermission() {
  const p = await Notifications.getPermissionsAsync();
  return Boolean(p.granted);
}

export async function requestPermission() {
  await ensureChannel(); // the channel must exist before Android shows the permission prompt
  if (await hasPermission()) return true;
  const r = await Notifications.requestPermissionsAsync();
  return Boolean(r.granted);
}

// Replaces everything scheduled on this phone with the enabled reminders in `list`.
export async function syncReminders(list) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!(await hasPermission())) return { scheduled: 0, permission: false };
    await ensureChannel();
    let count = 0;
    for (const r of list) {
      if (!r.enabled) continue;
      for (const t of planTriggers(r)) {
        const trigger =
          t.kind === 'daily'
            ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: t.hour, minute: t.minute, channelId: CHANNEL }
            : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: t.weekday, hour: t.hour, minute: t.minute, channelId: CHANNEL };
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Reminder', body: reminderBody(r), data: { reminderId: r.id } },
          trigger,
        });
        count += 1;
      }
    }
    return { scheduled: count, permission: true };
  } catch (e) {
    return { scheduled: 0, permission: false, error: true };
  }
}

export async function cancelAllReminders() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) { /* nothing to cancel */ }
}
