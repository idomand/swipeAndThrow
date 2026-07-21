import ThemedContainer from "@/components/common/themedContainer";
import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

// Presented as a full-screen modal from the root Stack — the "Settings" title
// comes from the route options there, not from this screen.
export default function Settings() {
  // False when the modal is deep-linked into directly, where there's nothing
  // to go back to.
  const isPresented = router.canGoBack();

  return (
    <ThemedContainer>
      <ThemedView style={styles.content}>
        <ThemedText themeColor="textSecondary">Nothing here yet.</ThemedText>

        {isPresented && (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundSelected" style={styles.doneButton}>
              <ThemedText type="smallBold">Done</ThemedText>
            </ThemedView>
          </Pressable>
        )}
      </ThemedView>
    </ThemedContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.four,
  },
  doneButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
