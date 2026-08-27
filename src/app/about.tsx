import ThemedContainer from "@/components/common/themedContainer";
import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { SettingsButton } from "@/components/settings/settingsButton";
import { Spacing } from "@/constants/theme";
import { KEEP_ALBUM_TITLE } from "@/constants/values";
import { useTranslation } from "@/hooks/useTranslation";
import { router } from "expo-router";
import { Linking, ScrollView, StyleSheet } from "react-native";

// Explains the app, its photo permission, and the surprising "move" wording the
// Android dialog shows when applying kept photos from apps like WhatsApp. Reached
// from Settings and auto-opened once on first launch (see the home screen).
export default function About() {
  const { t } = useTranslation();
  // False when deep-linked into directly, where there's nothing to go back to.
  const isPresented = router.canGoBack();

  return (
    <ThemedContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">{t("about.aboutTitle")}</ThemedText>
          <ThemedText type="default">{t("about.aboutBody")}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="default" style={styles.heading}>
            {t("about.howHeading")}
          </ThemedText>
          {/* One sentence split around two inline bold words; the translations
              carry the leading/trailing spaces so word order can differ. */}
          <ThemedText type="default">
            {t("about.howRun1")}
            <ThemedText type="smallBold"> {t("about.howApplyWord")}</ThemedText>
            {t("about.howRun2")}
            <ThemedText type="smallBold"> {KEEP_ALBUM_TITLE}</ThemedText>
            {t("about.howRun3")}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="default" style={styles.heading}>
            {t("about.infoHeading")}
          </ThemedText>
          <ThemedText type="default">{t("about.infoBody")}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="default" style={styles.heading}>
            {t("about.permHeading")}
          </ThemedText>
          <ThemedText type="default">{t("about.permBody")}</ThemedText>
          <SettingsButton
            label={t("about.openSettings")}
            onPress={() => Linking.openSettings()}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="default" style={styles.heading}>
            {t("about.applyHeading")}
          </ThemedText>
          <ThemedText type="default">
            {t("about.applyRun1")}{" "}
            <ThemedText type="smallBold">{t("about.applyMoveWord")}</ThemedText>{" "}
            {t("about.applyRun2")}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t("about.applySafe", { album: KEEP_ALBUM_TITLE })}
          </ThemedText>
        </ThemedView>

        {isPresented && (
          <ThemedView style={styles.footer}>
            <SettingsButton
              label={t("about.gotIt")}
              onPress={() => router.back()}
            />
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
