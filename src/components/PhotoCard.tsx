import { Spacing } from "@/constants/theme";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { ThemedView } from "./common/themedView";

type Props = {
  // Null for cards outside the render window: the swiper mounts every card at
  // once, so only those near the top of the stack decode their image — the
  // rest stay an empty slot until they come close.
  uri: string | null;
};

// A single swipeable photo in the deck. Fills its card slot; the swiper handles
// the stacking and gestures around it.
export default function PhotoCard({ uri }: Props) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {uri && (
        <Image source={{ uri }} style={styles.photo} contentFit="contain" />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  photo: {
    flex: 1,
    width: "100%",
    borderRadius: Spacing.three,
  },
});
