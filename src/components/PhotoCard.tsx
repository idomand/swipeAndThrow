import { ThemedText } from "@/components/common/themedText";
import { Spacing } from "@/constants/theme";
import { formatPhotoDate } from "@/helpers/formatPhotoDate";
import { useTranslation } from "@/i18n/useTranslation";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { ThemedView } from "./common/themedView";

type Props = {
  // Null for cards outside the render window: the swiper mounts every card at
  // once, so only those near the top of the stack decode their image — the
  // rest stay an empty slot until they come close.
  uri: string | null;
  // Metadata for the tap-to-reveal info overlay. Passed even for out-of-window
  // cards (harmless — the overlay only renders when there's a uri).
  album?: string;
  creationTime?: number | null;
  isFavorite?: boolean;
};

// A single swipeable photo in the deck. Fills its card slot; the swiper handles
// the stacking and gestures around it. Tapping the photo reveals an info
// overlay (album, date, favorite); a drag is a swipe and won't fire onPress, so
// tapping never conflicts with the swiper's pan gesture.
export default function PhotoCard({
  uri,
  album,
  creationTime,
  isFavorite,
}: Props) {
  const { t, language } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));

  // Reset when this slot is recycled to a different photo (or emptied as the
  // card leaves the window), so a card never appears with a stale overlay open.
  // Adjusting state during render on a changed prop is React's recommended
  // alternative to a setState-in-effect here.
  const [prevUri, setPrevUri] = useState(uri);
  if (uri !== prevUri) {
    setPrevUri(uri);
    setShowInfo(false);
  }

  // Fade the overlay in/out on toggle.
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: showInfo ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [showInfo, opacity]);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {uri && (
        <Pressable
          style={styles.pressable}
          onPress={() => setShowInfo((prev) => !prev)}
        >
          <Image source={{ uri }} style={styles.photo} contentFit="contain" />
          {showInfo && (
            <Animated.View
              style={[styles.overlay, { opacity }]}
              pointerEvents="none"
            >
              {!!album && (
                <ThemedText type="small" style={styles.overlayText}>
                  {`${t("card.album")}: ${album}`}
                </ThemedText>
              )}
              <ThemedText type="small" style={styles.overlayText}>
                {formatPhotoDate(
                  creationTime ?? null,
                  language,
                  t("card.unknownDate"),
                )}
              </ThemedText>
              {isFavorite && (
                <ThemedText type="small" style={styles.overlayText}>
                  {`⭐ ${t("card.favorite")}`}
                </ThemedText>
              )}
            </Animated.View>
          )}
        </Pressable>
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
  pressable: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    flex: 1,
    width: "100%",
    borderRadius: Spacing.three,
  },
  // A translucent dark panel over the photo — light text on a dark scrim reads
  // legibly regardless of the app theme, since it sits on top of the image.
  overlay: {
    position: "absolute",
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  overlayText: {
    color: "#ffffff",
  },
});
