/**
 * Body proportions. Every length is a fraction of the lizard's total length
 * (snout tip = 0, tail tip = 1), and the whole lizard is 1 world unit long.
 */
export const S_EYE = 0.062;
export const S_SHOULDER = 0.17;
export const S_HIP = 0.4;

/** The belly is flatter than the back: bottom half-height = top half-height * BELLY. */
export const BELLY = 0.55;

type Key = readonly [s: number, value: number];

const HALF_WIDTH: Key[] = [
  [0, 0.003], [0.006, 0.013], [0.018, 0.023], [0.035, 0.032], [0.06, 0.041], [0.088, 0.046],
  [0.112, 0.039], [0.14, 0.039], [0.18, 0.054], [0.25, 0.064], [0.33, 0.061], [0.39, 0.049],
  [0.44, 0.036], [0.55, 0.027], [0.7, 0.017], [0.85, 0.009], [0.96, 0.004], [1, 0.0012],
];

/** Half-height as a ratio of half-width. */
const HEIGHT_RATIO: Key[] = [
  [0, 0.55], [0.04, 0.6], [0.09, 0.72], [0.13, 0.82], [0.2, 0.64], [0.36, 0.64], [0.46, 0.88], [1, 1],
];

function slope(keys: Key[], k: number): number {
  const a = keys[Math.max(0, k - 1)], b = keys[Math.min(keys.length - 1, k + 1)];
  return (b[1] - a[1]) / (b[0] - a[0]);
}

/** Cubic Hermite interpolation through the keys. */
function curve(keys: Key[], s: number): number {
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

export const halfWidth = (s: number): number => Math.max(0.0008, curve(HALF_WIDTH, s));

export const halfHeight = (s: number): number => halfWidth(s) * curve(HEIGHT_RATIO, s);
