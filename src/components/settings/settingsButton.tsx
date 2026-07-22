import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { Pressable, StyleSheet } from "react-native";

// A plain labelled action button for the settings footer.
export function SettingsButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundSelected" style={styles.button}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
