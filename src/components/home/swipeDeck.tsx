import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import PhotoCard from "@/components/PhotoCard";
import SwipeLabel from "@/components/SwipeLabel";
import { Spacing } from "@/constants/theme";
import { type DeckItem } from "@/hooks/usePhotoDeck";
import { useTranslation } from "@/i18n/useTranslation";
import { useCallback, type RefObject } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Swiper, type SwiperCardRefType } from "rn-swiper-list";

// Fixed overlay badges the swiper fades in as a card is dragged, one per
// direction. Defined at module scope so their identity is stable.
function KeepLabel() {
  const { t } = useTranslation();
  return <SwipeLabel text={t("home.keep")} color="#34c759" align="right" />;
}
function ThrowLabel() {
  const { t } = useTranslation();
  return <SwipeLabel text={t("home.throw")} color="#ff3b30" align="left" />;
}
function SkipLabel() {
  const { t } = useTranslation();
  return <SwipeLabel text={t("home.skip")} color="#8e8e93" align="center" />;
}

// The deck frame: the swiper stack when there's a deck, or a placeholder with a
// "check again" prompt when there isn't. Owns the render window — the swiper
// mounts every card up front, so only cards near the top of the stack decode
// their image.
export function SwipeDeck({
  swiperRef,
  data,
  activeCardIndex,
  batchKey,
  hasDeck,
  loading,
  applying,
  onSwipeRight,
  onSwipeLeft,
  onSwipeTop,
  onIndexChange,
  onSwipedAll,
  onReload,
}: {
  swiperRef: RefObject<SwiperCardRefType | null>;
  data: DeckItem[];
  activeCardIndex: number;
  batchKey: number;
  hasDeck: boolean;
  loading: boolean;
  applying: boolean;
  onSwipeRight: (index: number) => void;
  onSwipeLeft: (index: number) => void;
  onSwipeTop: (index: number) => void;
  onIndexChange: (index: number) => void;
  onSwipedAll: () => void;
  onReload: () => void;
}) {
  const { t } = useTranslation();

  // Renders a card's contents. The swiper mounts every card in the batch up
  // front, so decoding all ~50 full-size images at once would blow memory and
  // leave later cards blank. Only cards near the top of the stack get their
  // image; the window reaches a few ahead so the next photo is already decoded
  // when it surfaces.
  const renderCard = useCallback(
    (item: DeckItem, index: number) => {
      const near = index >= activeCardIndex - 1 && index <= activeCardIndex + 3;
      return (
        <PhotoCard
          uri={near ? item.uri : null}
          album={item.album}
          creationTime={item.creationTime}
          isFavorite={item.isFavorite}
        />
      );
    },
    [activeCardIndex],
  );

  return (
    <ThemedView style={styles.deck}>
      {hasDeck ? (
        <Swiper
          key={batchKey}
          ref={swiperRef}
          data={data}
          keyExtractor={(item) => item.id}
          renderCard={renderCard}
          prerenderItems={3}
          cardStyle={styles.card}
          onSwipeRight={onSwipeRight}
          onSwipeLeft={onSwipeLeft}
          onSwipeTop={onSwipeTop}
          onIndexChange={onIndexChange}
          onSwipedAll={onSwipedAll}
          disableBottomSwipe
          disableRightSwipe={applying}
          disableLeftSwipe={applying}
          disableTopSwipe={applying}
          OverlayLabelRight={KeepLabel}
          OverlayLabelLeft={ThrowLabel}
          OverlayLabelTop={SkipLabel}
        />
      ) : (
        <ThemedView type="backgroundElement" style={styles.placeholder}>
          <ThemedText type="small" themeColor="textSecondary">
            {loading ? t("home.loading") : t("home.noPhotos")}
          </ThemedText>
          {!loading && (
            <Pressable
              onPress={onReload}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundSelected" style={styles.skipButton}>
                <ThemedText type="small">{t("home.checkAgain")}</ThemedText>
              </ThemedView>
            </Pressable>
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    alignSelf: "stretch",
    // Clip cards to the frame so a swiped card disappears at the deck's edge
    // instead of flying across the rest of the screen — the next card stays
    // centered in a fixed photo frame.
    overflow: "hidden",
    borderRadius: Spacing.four,
  },
  card: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  skipButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
