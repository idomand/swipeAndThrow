// A random position in [0, length), avoiding `exclude` so tapping "pick"
// always lands on a different photo when there's more than one to choose from.
export function getRandomIndex(length: number, exclude: number) {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === exclude) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}
