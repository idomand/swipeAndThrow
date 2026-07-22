import ThemedContainer from "@/components/common/themedContainer";
import { ThemedView } from "@/components/common/themedView";
import { KeepAlbumInput } from "@/components/settings/keepAlbumInput";
import { OptionSelector } from "@/components/settings/optionSelector";
import { SettingsButton } from "@/components/settings/settingsButton";
import { Spacing } from "@/constants/theme";
import { useUserContext, type ThemePreference } from "@/contexts/userContext";
import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";

const BATCH_SIZES = [25, 50, 100, 200];
const THEMES: ThemePreference[] = ["system", "light", "dark"];

// Presented as a full-screen modal from the root Stack — the "Settings" title
// comes from the route options there, not from this screen.
export default function Settings() {
  const { settings, setSetting, resetSettings, loaded } = useUserContext();
  // False when the modal is deep-linked into directly, where there's nothing
  // to go back to.
  const isPresented = router.canGoBack();

  // Avoids rendering the defaults for a frame and letting a stray tap write
  // them over what's actually stored.
  if (!loaded) return <ThemedContainer />;

  return (
    <ThemedContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <OptionSelector
          label="Photos per batch"
          hint="How many photos each gallery query pulls at once."
          options={BATCH_SIZES}
          selected={settings.photoBatchSize}
          onSelect={(size) => setSetting("photoBatchSize", size)}
        />

        <OptionSelector
          label="Theme"
          hint="Overrides your device's appearance."
          options={THEMES}
          selected={settings.themePreference}
          onSelect={(preference) => setSetting("themePreference", preference)}
        />

        <KeepAlbumInput
          value={settings.keepAlbumTitle}
          onChangeText={(text) => setSetting("keepAlbumTitle", text)}
        />

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
