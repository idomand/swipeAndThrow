// Returns a new array with the same items in random order (Fisher–Yates).
// Used to pick a random sample from the eligible photo pool before a batch is
// sliced off, so each deck is a fresh random draw rather than the newest photos.
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
