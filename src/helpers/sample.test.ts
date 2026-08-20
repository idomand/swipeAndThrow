import { afterEach, describe, expect, it, vi } from "vitest";
import { sample } from "./sample";

describe("sample", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns exactly k items when the pool is larger", () => {
    expect(sample([1, 2, 3, 4, 5], 3)).toHaveLength(3);
  });

  it("returns the whole pool when k exceeds its length", () => {
    const result = sample([1, 2, 3], 10);
    expect(result).toHaveLength(3);
    expect([...result].sort()).toEqual([1, 2, 3]);
  });

  it("returns an empty array for k = 0", () => {
    expect(sample([1, 2, 3], 0)).toEqual([]);
  });

  it("returns an empty array for an empty pool", () => {
    expect(sample([], 5)).toEqual([]);
  });

  it("never produces duplicates", () => {
    const result = sample([1, 2, 3, 4, 5, 6, 7, 8], 5);
    expect(new Set(result).size).toBe(result.length);
  });

  it("only draws from the given items", () => {
    const pool = ["a", "b", "c", "d"];
    for (const item of sample(pool, 2)) {
      expect(pool).toContain(item);
    }
  });

  it("does not mutate the input array", () => {
    const pool = [1, 2, 3, 4, 5];
    const copy = [...pool];
    sample(pool, 3);
    expect(pool).toEqual(copy);
  });

  it("is deterministic under a fixed Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    // With random() === 0, the partial Fisher–Yates swaps each position with
    // itself, so the first k items come out in their original order.
    expect(sample([10, 20, 30, 40], 2)).toEqual([10, 20]);
  });
});
