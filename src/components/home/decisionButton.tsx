import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

// A single decision button: an optional icon, a label, and an optional `+N`
// pending-count badge, wrapped in a pressable. Used for Throw/Keep/Skip (icon +
// count) and Undo/Apply (the text-only Apply omits the icon). The layout rows
// in `DecisionControls` place these; the button only renders its own contents.
export function DecisionButton({
  label,
  iconName,
  iconTint,
  badge,
  variant = "element",
  disabled = false,
  // Undo/Apply dim to 0.4 when disabled (distinct from the 0.7 press feedback);
  // Throw/Keep/Skip reuse the 0.7 press opacity for their disabled state.
  dimWhenDisabled = false,
  // Throw/Keep/Undo/Apply fill their half of the row; Skip shrinks to content.
  fill = true,
  contentStyle,
  onPress,
}: {
  label: string;
  iconName?: SymbolViewProps["name"];
  iconTint?: string;
  badge?: number;
  variant?: "element" | "selected";
  disabled?: boolean;
  dimWhenDisabled?: boolean;
  fill?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        fill && styles.fill,
        dimWhenDisabled
          ? [pressed && styles.pressed, disabled && styles.disabled]
          : (pressed || disabled) && styles.pressed,
      ]}
    >
      <ThemedView
        type={variant === "selected" ? "backgroundSelected" : "backgroundElement"}
        style={[styles.button, contentStyle]}
      >
        {iconName && (
          <SymbolView tintColor={iconTint} name={iconName} size={18} />
        )}
        <ThemedText type="smallBold">{label}</ThemedText>
        {badge !== undefined && badge > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            +{badge}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
