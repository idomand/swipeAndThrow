import type { Language } from "@/contexts/userContext";
import { translate } from "@/i18n/translations";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// A fixed identifier so the app owns exactly one scheduled reminder: scheduling
// again replaces it, and cancelling removes it, with no risk of duplicates
// piling up across relaunches.
const REMINDER_ID = "daily-cleanup-reminder";

// Android requires notifications to belong to a channel. One dedicated channel
// keeps the reminder groupable/mutable in system settings.
const CHANNEL_ID = "daily-reminder";

// Parses a stored "HH:mm" 24-hour string into its parts. Falls back to a safe
// evening default if the value is somehow malformed.
function parseTime(time: string): { hour: number; minute: number } {
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (Number.isInteger(hour) && Number.isInteger(minute)) {
    return { hour, minute };
  }
  return { hour: 20, minute: 0 };
}

// Sets the foreground presentation behaviour and creates the Android channel.
// Safe to call more than once; call once at startup before scheduling. The
// channel name is shown in Android's system settings, so it's localized to the
// current language.
export async function configureNotifications(language: Language) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: translate(language, "notif.channel"),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

// Asks for notification permission if it isn't already granted. Returns whether
// the app ended up with permission, so callers can avoid leaving a toggle "on"
// with nothing behind it.
export async function ensureNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;

  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === "granted";
}

// (Re)schedules the single daily reminder at the given "HH:mm" time. Cancels any
// existing one first so the identifier always maps to one live notification. The
// notification text is baked in now, at the current language — callers reschedule
// when the language changes so a fired reminder matches the app.
export async function scheduleDailyReminder(time: string, language: Language) {
  await cancelDailyReminder();

  const { hour, minute } = parseTime(time);

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: translate(language, "notif.title"),
      body: translate(language, "notif.body"),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

// Removes the scheduled reminder if one exists. A no-op when nothing is
// scheduled under the identifier.
export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}
