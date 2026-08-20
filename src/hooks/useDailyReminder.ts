import { useUserContext } from "@/contexts/userContext";
import {
  cancelDailyReminder,
  configureNotifications,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { useEffect } from "react";

// Keeps the OS-scheduled reminder in sync with the stored settings on every
// launch. Android drops locally-scheduled notifications on reboot, so
// rescheduling here is what makes the reminder survive a restart. Also repairs
// the schedule if the time or enabled flag changed while the app was closed.
export function useDailyReminder() {
  const { settings, loaded } = useUserContext();

  // Configure the handler and Android channel before anything schedules. Re-runs
  // on a language change so the channel name follows the chosen language.
  useEffect(() => {
    configureNotifications(settings.language);
  }, [settings.language]);

  useEffect(() => {
    // Wait for stored settings so we don't reconcile against the defaults and
    // clobber a real reminder for a frame.
    if (!loaded) return;

    if (settings.dailyReminderEnabled) {
      scheduleDailyReminder(settings.dailyReminderTime, settings.language);
    } else {
      cancelDailyReminder();
    }
    // Language is included so switching it re-bakes the reminder's text.
  }, [
    loaded,
    settings.dailyReminderEnabled,
    settings.dailyReminderTime,
    settings.language,
  ]);
}
