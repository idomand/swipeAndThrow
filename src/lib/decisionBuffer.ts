// The in-memory decision buffer, as pure state transitions.
//
// A swipe never touches the gallery — it only appends to this buffer, which
// stays fully undoable until the user taps Apply. The state is three ordered
// lists so a single Undo can reverse the last swipe whatever kind it was. This
// module holds that logic with no React or native dependency so it can be unit
// tested; `src/app/index.tsx` mirrors it into `useState`/refs and drives the
// swiper. See the memory-only hard rule in AGENTS.md — nothing here persists.
//
// Generic over the asset type: only `id` is needed here (to record a skip and
// to clear applied decisions), so callers pass their real `Asset` and the
// tests pass a plain `{ id }`.

// A decision that will move a photo when applied: "keep" files it into the
// album, "throw" deletes it. Skips are not decisions — they touch nothing.
export type DecisionAction = "keep" | "throw";

// One swipe made this session, newest last. Used to reverse the last one:
// "keep"/"throw" pop from `decisions`, "skip" pops from `skippedIds`.
export type SwipeAction = "keep" | "throw" | "skip";

export type Decision<A> = { action: DecisionAction; asset: A };

// The whole buffer: ordered decisions, the ids of photos left in place, and the
// per-deck swipe history that tells Undo which list to pop.
export type BufferState<A extends { id: string }> = {
  decisions: Decision<A>[];
  skippedIds: string[];
  history: SwipeAction[];
};

export function emptyBuffer<A extends { id: string }>(): BufferState<A> {
  return { decisions: [], skippedIds: [], history: [] };
}

// Records a keep/throw. Nothing touches the gallery — the decision only joins
// the buffer, so it stays undoable until the batch is applied.
export function applyDecision<A extends { id: string }>(
  state: BufferState<A>,
  action: DecisionAction,
  asset: A,
): BufferState<A> {
  return {
    ...state,
    decisions: [...state.decisions, { action, asset }],
    history: [...state.history, action],
  };
}

// Records a skip. The photo is left exactly where it is; the id just stops it
// coming up again this session.
export function applySkip<A extends { id: string }>(
  state: BufferState<A>,
  asset: A,
): BufferState<A> {
  return {
    ...state,
    skippedIds: [...state.skippedIds, asset.id],
    history: [...state.history, "skip"],
  };
}

// Reverses the most recent swipe, whichever kind it was, by popping the history
// and the list it came from. A no-op when the history is empty.
export function applyUndo<A extends { id: string }>(
  state: BufferState<A>,
): BufferState<A> {
  const last = state.history[state.history.length - 1];
  if (!last) return state;

  const history = state.history.slice(0, -1);
  if (last === "skip") {
    return { ...state, history, skippedIds: state.skippedIds.slice(0, -1) };
  }
  return { ...state, history, decisions: state.decisions.slice(0, -1) };
}

// Clears the decisions that were actually applied to the gallery, keyed by
// asset id, and drops the deck's undo history (those swipes are committed now,
// so a spring-back would no longer map to the buffer). Skips are untouched —
// they're never in the applied set. Decisions whose id isn't in `appliedIds`
// stay buffered for a retry.
export function clearApplied<A extends { id: string }>(
  state: BufferState<A>,
  appliedIds: Set<string>,
): BufferState<A> {
  return {
    ...state,
    decisions: state.decisions.filter(
      (decision) => !appliedIds.has(decision.asset.id),
    ),
    history: [],
  };
}

// Resets the per-deck swipe history without touching the pending decisions or
// skips. Called when a fresh batch loads: the swiper can only spring back a
// card still on screen.
export function resetHistory<A extends { id: string }>(
  state: BufferState<A>,
): BufferState<A> {
  return { ...state, history: [] };
}

// The pending keep/delete sets, derived by filtering the ordered decisions.
export function selectPendingKeep<A extends { id: string }>(
  decisions: Decision<A>[],
): A[] {
  return decisions.filter((d) => d.action === "keep").map((d) => d.asset);
}

export function selectPendingDelete<A extends { id: string }>(
  decisions: Decision<A>[],
): A[] {
  return decisions.filter((d) => d.action === "throw").map((d) => d.asset);
}
