import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { type ReactNode } from "react";
import { StyleSheet } from "react-native";

// One labelled setting: a bold label, a secondary hint, and whatever control
// the caller drops in as children.
export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.setting}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {hint}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  setting: {
    gap: Spacing.two,
  },
});
