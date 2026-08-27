import { describe, expect, it } from "vitest";
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

// Stand-in for expo-media-library's Asset — the buffer only touches `id`.
type TestAsset = { id: string };
const asset = (id: string): TestAsset => ({ id });

describe("decisionBuffer", () => {
  it("starts empty", () => {
    expect(emptyBuffer<TestAsset>()).toEqual({
      decisions: [],
      skippedIds: [],
      history: [],
    });
  });

  it("appends a keep to decisions and history without touching skips", () => {
    const next = applyDecision(emptyBuffer<TestAsset>(), "keep", asset("a"));
    expect(next.decisions).toEqual([{ action: "keep", asset: asset("a") }]);
    expect(next.history).toEqual(["keep"]);
    expect(next.skippedIds).toEqual([]);
  });

  it("appends a throw to decisions and history", () => {
    const next = applyDecision(emptyBuffer<TestAsset>(), "throw", asset("b"));
    expect(next.decisions).toEqual([{ action: "throw", asset: asset("b") }]);
    expect(next.history).toEqual(["throw"]);
  });

  it("appends a skip to skippedIds and history without touching decisions", () => {
    const next = applySkip(emptyBuffer<TestAsset>(), asset("c"));
    expect(next.skippedIds).toEqual(["c"]);
    expect(next.history).toEqual(["skip"]);
    expect(next.decisions).toEqual([]);
  });

  it("does not mutate the previous state", () => {
    const prev = emptyBuffer<TestAsset>();
    applyDecision(prev, "keep", asset("a"));
    expect(prev).toEqual({ decisions: [], skippedIds: [], history: [] });
  });

  describe("applyUndo", () => {
    it("reverses the last keep", () => {
      let state = applyDecision(emptyBuffer<TestAsset>(), "keep", asset("a"));
      state = applyUndo(state);
      expect(state).toEqual(emptyBuffer<TestAsset>());
    });

    it("reverses the last throw", () => {
      let state = applyDecision(emptyBuffer<TestAsset>(), "throw", asset("a"));
      state = applyUndo(state);
      expect(state).toEqual(emptyBuffer<TestAsset>());
    });

    it("reverses the last skip, popping from skippedIds not decisions", () => {
      let state = applyDecision(emptyBuffer<TestAsset>(), "keep", asset("a"));
      state = applySkip(state, asset("b"));
      state = applyUndo(state);
      expect(state.skippedIds).toEqual([]);
      expect(state.decisions).toEqual([{ action: "keep", asset: asset("a") }]);
      expect(state.history).toEqual(["keep"]);
    });

    it("undoes swipes in reverse order regardless of kind", () => {
      let state = emptyBuffer<TestAsset>();
      state = applyDecision(state, "keep", asset("a"));
      state = applySkip(state, asset("b"));
      state = applyDecision(state, "throw", asset("c"));

      state = applyUndo(state); // undo throw c
      expect(state.decisions.map((d) => d.asset.id)).toEqual(["a"]);
      expect(state.history).toEqual(["keep", "skip"]);

      state = applyUndo(state); // undo skip b
      expect(state.skippedIds).toEqual([]);
      expect(state.history).toEqual(["keep"]);

      state = applyUndo(state); // undo keep a
      expect(state).toEqual(emptyBuffer<TestAsset>());
    });

    it("is a no-op on an empty buffer", () => {
      const empty = emptyBuffer<TestAsset>();
      expect(applyUndo(empty)).toBe(empty);
    });
  });

  describe("clearApplied", () => {
    it("removes only applied decisions and resets history, keeping skips", () => {
      let state = emptyBuffer<TestAsset>();
      state = applyDecision(state, "keep", asset("a"));
      state = applyDecision(state, "throw", asset("b"));
      state = applySkip(state, asset("s"));

      const next = clearApplied(state, new Set(["a"]));
      expect(next.decisions.map((d) => d.asset.id)).toEqual(["b"]);
      expect(next.skippedIds).toEqual(["s"]);
      expect(next.history).toEqual([]);
    });

    it("clears history even when nothing was applied", () => {
      let state = applyDecision(emptyBuffer<TestAsset>(), "keep", asset("a"));
      const next = clearApplied(state, new Set());
      expect(next.decisions.map((d) => d.asset.id)).toEqual(["a"]);
      expect(next.history).toEqual([]);
    });
  });

  it("resetHistory clears history but keeps decisions and skips", () => {
    let state = emptyBuffer<TestAsset>();
    state = applyDecision(state, "keep", asset("a"));
    state = applySkip(state, asset("s"));
    const next = resetHistory(state);
    expect(next.history).toEqual([]);
    expect(next.decisions.map((d) => d.asset.id)).toEqual(["a"]);
    expect(next.skippedIds).toEqual(["s"]);
  });

  describe("selectors", () => {
    const state: BufferState<TestAsset> = {
      decisions: [
        { action: "keep", asset: asset("k1") },
        { action: "throw", asset: asset("t1") },
        { action: "keep", asset: asset("k2") },
      ],
      skippedIds: [],
      history: [],
    };

    it("selectPendingKeep returns keep assets in order", () => {
      expect(selectPendingKeep(state.decisions).map((a) => a.id)).toEqual([
        "k1",
        "k2",
      ]);
    });

    it("selectPendingDelete returns throw assets in order", () => {
      expect(selectPendingDelete(state.decisions).map((a) => a.id)).toEqual([
        "t1",
      ]);
    });
  });
});
