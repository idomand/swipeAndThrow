import ThemedContainer from "@/components/common/themedContainer";
import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { SettingsButton } from "@/components/settings/settingsButton";
import { Spacing } from "@/constants/theme";
import { KEEP_ALBUM_TITLE } from "@/constants/values";
import { router } from "expo-router";
import { Linking, ScrollView, StyleSheet } from "react-native";

// Explains the app, its photo permission, and the surprising "move" wording the
// Android dialog shows when applying kept photos from apps like WhatsApp. Reached
// from Settings and auto-opened once on first launch (see the home screen).
export default function About() {
  // False when deep-linked into directly, where there's nothing to go back to.
  const isPresented = router.canGoBack();

  return (
    <ThemedContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">About SwipeAndThrow</ThemedText>
          <ThemedText type="default">
            A fast, low-friction way to clean up your photos. You&apos;re shown
            one picture at a time — swipe to keep it or throw it away, like a
            deck of cards.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="default" style={styles.heading}>
            How it works
          </ThemedText>
          <ThemedText type="default">
            Swiping never touches your gallery. Every decision just goes into a
            list you can undo, and nothing is moved or deleted until you tap
            <ThemedText type="smallBold"> Apply</ThemedText>. Photos you keep are
            gathered into an album called
            <ThemedText type="smallBold"> {KEEP_ALBUM_TITLE}</ThemedText>, which
            also remembers what you&apos;ve already reviewed across restarts.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="default" style={styles.heading}>
            Permissions
          </ThemedText>
          <ThemedText type="default">
            SwipeAndThrow needs access to your photos to show them and organize
            them into albums. Nothing ever leaves your device. You can review or
            change this permission any time in your device settings.
          </ThemedText>
          <SettingsButton
            label="Open device settings"
            onPress={() => Linking.openSettings()}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="default" style={styles.heading}>
            Applying your decisions
          </ThemedText>
          <ThemedText type="default">
            When you apply, Android asks you to confirm the changes. For photos
            that came from other apps — like WhatsApp or Telegram — the system
            can&apos;t simply re-file them, so keeping one copies it into your
            album and removes the original. Because of that, the confirmation
            dialog may say <ThemedText type="smallBold">&quot;move&quot;</ThemedText>{" "}
            rather than delete.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This is expected and safe — the photos you keep still end up in your
            {" "}
            {KEEP_ALBUM_TITLE} album.
          </ThemedText>
        </ThemedView>

        {isPresented && (
          <ThemedView style={styles.footer}>
            <SettingsButton label="Got it" onPress={() => router.back()} />
          </ThemedView>
        )}
      </ScrollView>
    </ThemedContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.five,
    paddingVertical: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.three,
  },
});
