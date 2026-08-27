import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

// The top bar: a single cog that opens Settings. Left-aligned, the only thing
// above the deck.
export function HomeHeader({ onPressSettings }: { onPressSettings: () => void }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.header}>
      <Pressable
        onPress={onPressSettings}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <ThemedView type="backgroundElement" style={styles.cogButton}>
          <SymbolView
            tintColor={theme.text}
            name={{ ios: "gearshape", android: "settings", web: "settings" }}
            size={22}
          />
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignSelf: "stretch",
    alignItems: "flex-start",
    paddingVertical: Spacing.two,
  },
  cogButton: {
    padding: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
