import {
  applyDecision,
  applySkip,
  applyUndo,
  clearApplied,
  emptyBuffer,
  resetHistory,
  selectPendingDelete,
  selectPendingKeep,
  type BufferState,
} from "@/lib/decisionBuffer";
import { Asset } from "expo-media-library";
import { useCallback, useEffect, useRef, useState } from "react";

// Owns the whole decision buffer: the ordered decisions, the ids of photos
// skipped this session, and the current deck's swipe history. Nothing here
// touches the gallery — photos stay in their original folders until the batch
// is applied, so any decision stays undoable up to that point, and the single
// ordered history is what lets one Undo reverse the last swipe whichever kind
// it was. The transitions live in `@/lib/decisionBuffer` so they can be unit
// tested; this hook mirrors them into state and refs.
//
// `decisionsRef`/`skippedIdsRef` exist because `onSwipedAll` fires from a
// worklet reaction that captured an earlier render's closures, and the swipe
// callbacks are memoized — the deck loader reads the exclusion sets through
// these refs so the next batch is filtered against the latest decisions.
export function useDecisionBuffer() {
  const [buffer, setBuffer] = useState<BufferState<Asset>>(emptyBuffer);
  const { decisions, skippedIds, history } = buffer;

  const decisionsRef = useRef(decisions);
  const skippedIdsRef = useRef(skippedIds);

  useEffect(() => {
    decisionsRef.current = decisions;
    skippedIdsRef.current = skippedIds;
  }, [decisions, skippedIds]);

  const pendingKeep = selectPendingKeep(decisions);
  const pendingDelete = selectPendingDelete(decisions);

  // Records a keep/throw decision. Nothing touches the gallery here — both
  // kinds only join the pending buffer, so every one of them stays undoable
  // until the batch is applied.
  const recordDecision = useCallback(
    (action: "keep" | "throw", asset: Asset) => {
      setBuffer((prev) => applyDecision(prev, action, asset));
    },
    [],
  );

  // Records a skip. The photo is left exactly where it is; the id just stops it
  // coming up again this session.
  const recordSkip = useCallback((asset: Asset) => {
    setBuffer((prev) => applySkip(prev, asset));
  }, []);

  // Reverses the most recent swipe, whichever kind it was. The caller springs
  // the card back on screen; this only pops the buffer.
  const undo = useCallback(() => {
    setBuffer((prev) => applyUndo(prev));
  }, []);

  // Clears the deck's undo history — called when a fresh batch loads, since the
  // swiper can only restore a card still on screen.
  const resetBatchHistory = useCallback(() => {
    setBuffer((prev) => resetHistory(prev));
  }, []);

  // Drops the ids that were actually applied and clears the undo history:
  // applied swipes are committed to the gallery now, so a spring-back would no
  // longer map to the buffer. Decisions that failed stay buffered for a retry.
  const clearAppliedIds = useCallback((appliedIds: Set<string>) => {
    setBuffer((prev) => clearApplied(prev, appliedIds));
  }, []);

  return {
    buffer,
    decisions,
    skippedIds,
    history,
    decisionsRef,
    skippedIdsRef,
    pendingKeep,
    pendingDelete,
    recordDecision,
    recordSkip,
    undo,
    resetHistory: resetBatchHistory,
    clearApplied: clearAppliedIds,
  };
}
