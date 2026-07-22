import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { Pressable, StyleSheet } from "react-native";

// A single pill in a row of mutually exclusive choices. Flexes to share the
// row width evenly with its siblings.
export function SettingOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <ThemedView
        type={selected ? "backgroundSelected" : "backgroundElement"}
        style={styles.option}
      >
        <ThemedText
          type={selected ? "smallBold" : "small"}
          themeColor={selected ? "text" : "textSecondary"}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  option: {
    alignItems: "center",
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
