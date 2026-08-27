import { ThemedView } from "@/components/common/themedView";
import { DecisionControls } from "@/components/home/decisionControls";
import { SwipeDeck } from "@/components/home/swipeDeck";
import { Spacing } from "@/constants/theme";
import { useUserContext } from "@/contexts/userContext";
import { useApplyDecisions } from "@/hooks/useApplyDecisions";
import { useDecisionBuffer } from "@/hooks/useDecisionBuffer";
import { usePhotoDeck } from "@/hooks/usePhotoDeck";
import { StyleSheet } from "react-native";

// The photo-review surface: the swipe deck and the decision controls, plus the
// wiring that binds them. The in-memory decision buffer, the deck-loading
// engine, and the apply pipeline each live in their own hook; they're tied
// together here — the deck reads the buffer's exclusion refs and records swipes
// into it, and applying clears the buffer and invalidates the deck's scan
// caches for whatever actually went through.
export function PhotoReview() {
  const { settings } = useUserContext();

  const buffer = useDecisionBuffer();
  const deck = usePhotoDeck({
    settings,
    decisionsRef: buffer.decisionsRef,
    skippedIdsRef: buffer.skippedIdsRef,
    onBatchLoaded: buffer.resetHistory,
    onDecision: buffer.recordDecision,
    onSkip: buffer.recordSkip,
  });
  const { applying, apply } = useApplyDecisions({
    decisions: buffer.decisions,
    pendingKeep: buffer.pendingKeep,
    pendingDelete: buffer.pendingDelete,
    onApplied: (ids) => {
      buffer.clearApplied(ids);
      if (ids.size > 0) deck.invalidateCaches();
    },
  });

  // Gating flags that span the buffer and the deck. Every swipe and button is
  // locked while a batch is loading or being applied.
  const canSwipe = deck.hasCard && !applying && !deck.loading;
  const canUndo = buffer.history.length > 0 && !applying && !deck.loading;
  const hasDecisions = buffer.decisions.length > 0;

  // Buttons drive the deck through its ref so a tap makes exactly the same
  // swipe a gesture would — a single code path records every decision.
  function handleKeep() {
    if (!canSwipe) return;
    deck.swiperRef.current?.swipeRight();
  }
  function handleThrow() {
    if (!canSwipe) return;
    deck.swiperRef.current?.swipeLeft();
  }
  function handleSkip() {
    if (!canSwipe) return;
    deck.swiperRef.current?.swipeTop();
  }
  // Reverses the most recent swipe and springs that card back to the top of the
  // deck. Limited to the deck on screen — the swiper can't restore a card from a
  // batch it has already replaced.
  function handleUndo() {
    if (!canUndo) return;
    buffer.undo();
    deck.swiperRef.current?.swipeBack();
  }

  return (
    <ThemedView style={styles.actions}>
      <SwipeDeck
        swiperRef={deck.swiperRef}
        data={deck.deckData}
        activeCardIndex={deck.activeCardIndex}
        batchKey={deck.batchKey}
        hasDeck={deck.hasDeck}
        loading={deck.loading}
        applying={applying}
        onSwipeRight={deck.onSwipeRight}
        onSwipeLeft={deck.onSwipeLeft}
        onSwipeTop={deck.onSwipeTop}
        onIndexChange={deck.onIndexChange}
        onSwipedAll={deck.loadBatch}
        onReload={deck.loadBatch}
      />

      <DecisionControls
        hasCard={deck.hasCard}
        remaining={deck.remaining}
        canSwipe={canSwipe}
        canUndo={canUndo}
        hasDecisions={hasDecisions}
        applying={applying}
        pendingKeepCount={buffer.pendingKeep.length}
        pendingDeleteCount={buffer.pendingDelete.length}
        decisionCount={buffer.decisions.length}
        onThrow={handleThrow}
        onKeep={handleKeep}
        onSkip={handleSkip}
        onUndo={handleUndo}
        onApply={apply}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.four,
  },
});
