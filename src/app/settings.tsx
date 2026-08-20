import ThemedContainer from "@/components/common/themedContainer";
import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { OptionSelector } from "@/components/settings/optionSelector";
import { ReminderTimeRow } from "@/components/settings/reminderTimeRow";
import { SelectAlbums } from "@/components/settings/selectAlbums";
import { SettingsButton } from "@/components/settings/settingsButton";
import { SettingToggle } from "@/components/settings/settingToggle";
import { Spacing } from "@/constants/theme";
import {
  useUserContext,
  type Language,
  type ThemePreference,
} from "@/contexts/userContext";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import {
  cancelDailyReminder,
  ensureNotificationPermission,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";

const THEMES: ThemePreference[] = ["system", "light", "dark"];
const LANGUAGES: Language[] = ["en", "de"];

// Language pills read in their own language, so they aren't run through the
// translator.
const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  de: "Deutsch",
};

// Presented as a full-screen modal from the root Stack — the "Settings" title
// comes from the route options there, not from this screen.
export default function Settings() {
  const { settings, setSetting, loaded } = useUserContext();
  const { t } = useTranslation();
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
      Alert.alert(t("settings.notifOffTitle"), t("settings.notifOffBody"));
      return;
    }

    await setSetting("dailyReminderEnabled", true);
    await scheduleDailyReminder(settings.dailyReminderTime, settings.language);
  }

  // Persist the new time and, if the reminder is live, reschedule it to match.
  async function changeReminderTime(time: string) {
    await setSetting("dailyReminderTime", time);
    if (settings.dailyReminderEnabled) {
      await scheduleDailyReminder(time, settings.language);
    }
  }

  // Avoids rendering the defaults for a frame and letting a stray tap write
  // them over what's actually stored.
  if (!loaded) return <ThemedContainer />;

  return (
    <ThemedContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <AboutRow onPress={() => router.push("/about")} />

        <OptionSelector
          label={t("settings.themeLabel")}
          hint={t("settings.themeHint")}
          options={THEMES}
          selected={settings.themePreference}
          onSelect={(preference) => setSetting("themePreference", preference)}
          renderLabel={(preference) => t(`settings.themeOption.${preference}`)}
        />

        <OptionSelector
          label={t("settings.languageLabel")}
          hint={t("settings.languageHint")}
          options={LANGUAGES}
          selected={settings.language}
          onSelect={(language) => setSetting("language", language)}
          renderLabel={(language) => LANGUAGE_LABELS[language]}
        />

        <SelectAlbums />

        <SettingToggle
          label={t("settings.reminderLabel")}
          hint={t("settings.reminderHint")}
          value={settings.dailyReminderEnabled}
          onValueChange={toggleReminder}
        />

        {settings.dailyReminderEnabled && (
          <ReminderTimeRow
            time={settings.dailyReminderTime}
            onTimeChange={changeReminderTime}
          />
        )}
        {isPresented && (
          <ThemedView style={styles.footer}>
            <SettingsButton
              label={t("settings.done")}
              onPress={() => router.back()}
            />
          </ThemedView>
        )}
      </ScrollView>
    </ThemedContainer>
  );
}

// A prominent, tappable card at the top of Settings that opens the About
// screen. Made explicit — an icon, a title, a one-line description and a
// chevron — rather than a plain footer button, so new users notice it.
function AboutRow({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundElement" style={styles.aboutRow}>
        <ThemedText style={styles.aboutIcon}>ℹ️</ThemedText>
        <ThemedView style={styles.aboutText}>
          <ThemedText type="smallBold">{t("settings.aboutTitle")}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t("settings.aboutDesc")}
          </ThemedText>
        </ThemedView>
        <ThemedText type="subtitle" style={{ color: theme.textSecondary }}>
          ›
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.five,
    paddingVertical: Spacing.four,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  aboutIcon: {
    fontSize: 24,
  },
  aboutText: {
    flex: 1,
    backgroundColor: "transparent",
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.three,
  },
});
