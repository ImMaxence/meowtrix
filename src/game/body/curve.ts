/** A key of a 1D curve: value at position s. */
export type Key = readonly [s: number, value: number];

function slope(keys: readonly Key[], k: number): number {
  const a = keys[Math.max(0, k - 1)], b = keys[Math.min(keys.length - 1, k + 1)];
  return (b[1] - a[1]) / (b[0] - a[0]);
}

/** Smooth cubic Hermite interpolation through the keys (sorted by s). */
export function curve(keys: readonly Key[], s: number): number {
  const last = keys.length - 1;
  if (s <= keys[0][0]) return keys[0][1];
  if (s >= keys[last][0]) return keys[last][1];
  let k = 0;
  while (s > keys[k + 1][0]) k++;
  const [x0, y0] = keys[k];
  const [x1, y1] = keys[k + 1];
  const h = x1 - x0;
  const t = (s - x0) / h, t2 = t * t, t3 = t2 * t;
  const m0 = slope(keys, k) * h, m1 = slope(keys, k + 1) * h;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
}
