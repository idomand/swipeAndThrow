import { DecisionButton } from "@/components/home/decisionButton";
import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { StyleSheet } from "react-native";

// Everything below the deck: the "photos remaining" counter, the paired
// Throw/Keep row, the centered Skip row, and the Undo/Apply row. Fully
// controlled — the screen owns the decision state and hands down the gating
// flags, the pending counts, and the tap handlers.
export function DecisionControls({
  hasCard,
  remaining,
  canSwipe,
  canUndo,
  hasDecisions,
  applying,
  pendingKeepCount,
  pendingDeleteCount,
  decisionCount,
  onThrow,
  onKeep,
  onSkip,
  onUndo,
  onApply,
}: {
  hasCard: boolean;
  remaining: number;
  canSwipe: boolean;
  canUndo: boolean;
  hasDecisions: boolean;
  applying: boolean;
  pendingKeepCount: number;
  pendingDeleteCount: number;
  decisionCount: number;
  onThrow: () => void;
  onKeep: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onApply: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        {hasCard ? t("home.remaining", { n: remaining }) : ""}
      </ThemedText>

      <ThemedView style={styles.decisionRow}>
        <DecisionButton
          label={t("home.throw")}
          iconName={{ ios: "trash", android: "delete", web: "delete" }}
          iconTint="#ff3b30"
          badge={pendingDeleteCount}
          disabled={!canSwipe}
          onPress={onThrow}
        />
        <DecisionButton
          label={t("home.keep")}
          iconName={{ ios: "checkmark", android: "check", web: "check" }}
          iconTint="#34c759"
          badge={pendingKeepCount}
          disabled={!canSwipe}
          onPress={onKeep}
        />
      </ThemedView>

      <ThemedView style={styles.skipRow}>
        <DecisionButton
          label={t("home.skip")}
          iconName={{
            ios: "arrow.up",
            android: "arrow_upward",
            web: "arrow_upward",
          }}
          iconTint={theme.text}
          variant="selected"
          disabled={!canSwipe}
          fill={false}
          contentStyle={styles.skipButtonInline}
          onPress={onSkip}
        />
      </ThemedView>

      <ThemedView style={styles.pendingRow}>
        <DecisionButton
          label={t("home.undo")}
          iconName={{ ios: "arrow.uturn.backward", android: "undo", web: "undo" }}
          iconTint={theme.text}
          disabled={!canUndo}
          dimWhenDisabled
          onPress={onUndo}
        />
        <DecisionButton
          label={applying ? t("home.applying") : t("home.apply", { n: decisionCount })}
          variant="selected"
          disabled={!hasDecisions || applying}
          dimWhenDisabled
          onPress={onApply}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  decisionRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignSelf: "stretch",
  },
  // Skip sits on its own line, centered — it shrinks to its content rather
  // than filling the width like the paired Throw/Keep buttons.
  skipRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  // Extra horizontal padding so the content-sized Skip button isn't cramped.
  skipButtonInline: {
    paddingHorizontal: Spacing.five,
  },
  pendingRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignSelf: "stretch",
  },
});
