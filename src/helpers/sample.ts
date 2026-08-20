// Returns up to `k` items drawn at random from `items`, as a new array. A
// uniform random sample (partial Fisher–Yates): only the first `k` positions
// are shuffled, so drawing a 20-photo batch from a pool of tens of thousands
// doesn't shuffle the whole pool. Order of the returned items is itself random.
// Used to pick a random batch from the eligible photo pool, so each deck is a
// fresh random draw rather than the newest photos.
export function sample<T>(items: readonly T[], k: number): T[] {
  const result = [...items];
  const count = Math.min(k, result.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (result.length - i));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, count);
}
