import ThemedContainer from "@/components/common/themedContainer";
import { ThemedView } from "@/components/common/themedView";
import { OptionSelector } from "@/components/settings/optionSelector";
import { ReminderTimeRow } from "@/components/settings/reminderTimeRow";
import { SelectAlbums } from "@/components/settings/selectAlbums";
import { SettingsButton } from "@/components/settings/settingsButton";
import { SettingToggle } from "@/components/settings/settingToggle";
import { Spacing } from "@/constants/theme";
import { useUserContext, type ThemePreference } from "@/contexts/userContext";
import {
  cancelDailyReminder,
  ensureNotificationPermission,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet } from "react-native";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

// Presented as a full-screen modal from the root Stack — the "Settings" title
// comes from the route options there, not from this screen.
export default function Settings() {
  const { settings, setSetting, resetSettings, loaded } = useUserContext();
  // False when the modal is deep-linked into directly, where there's nothing
  // to go back to.
  const isPresented = router.canGoBack();

  // Turning the reminder on needs notification permission first — if the user
  // denies it, keep the toggle off rather than leaving it "on" with nothing
  // behind it. Turning it off just cancels the scheduled notification.
  async function toggleReminder(enabled: boolean) {
    if (!enabled) {
      await setSetting("dailyReminderEnabled", false);
      await cancelDailyReminder();
      return;
    }

    const granted = await ensureNotificationPermission();
    if (!granted) {
      Alert.alert(
        "Notifications are off",
        "Enable notifications for SwipeAndThrow in your device settings to get a daily reminder.",
      );
      return;
    }

    await setSetting("dailyReminderEnabled", true);
    await scheduleDailyReminder(settings.dailyReminderTime);
  }

  // Persist the new time and, if the reminder is live, reschedule it to match.
  async function changeReminderTime(time: string) {
    await setSetting("dailyReminderTime", time);
    if (settings.dailyReminderEnabled) {
      await scheduleDailyReminder(time);
    }
  }

  // Avoids rendering the defaults for a frame and letting a stray tap write
  // them over what's actually stored.
  if (!loaded) return <ThemedContainer />;

  return (
    <ThemedContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <OptionSelector
          label="Theme"
          hint="Overrides your device's appearance."
          options={THEMES}
          selected={settings.themePreference}
          onSelect={(preference) => setSetting("themePreference", preference)}
        />

        <SelectAlbums />

        <SettingToggle
          label="Daily reminder"
          hint="Get a daily notification to review and clean up your photos."
          value={settings.dailyReminderEnabled}
          onValueChange={toggleReminder}
        />

        {settings.dailyReminderEnabled && (
          <ReminderTimeRow
            time={settings.dailyReminderTime}
            onTimeChange={changeReminderTime}
          />
        )}

        <ThemedView style={styles.footer}>
          <SettingsButton label="Reset to defaults" onPress={resetSettings} />
          {isPresented && (
            <SettingsButton label="Done" onPress={() => router.back()} />
          )}
        </ThemedView>
      </ScrollView>
    </ThemedContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.five,
    paddingVertical: Spacing.four,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.three,
  },
});
