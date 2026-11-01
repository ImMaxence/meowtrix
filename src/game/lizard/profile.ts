import { curve, type Key } from '../body/curve';

/**
 * Body proportions of the standard lizard. Every length is a fraction of its total length
 * (snout tip = 0, tail tip = 1), and the whole lizard is 1 world unit long.
 */
const S_EYE = 0.062;
const S_SHOULDER = 0.17;
const S_HIP = 0.4;
/** Where the tail starts on the standard lizard. */
const S_TAIL = 0.44;

/** The belly is flatter than the back: bottom half-height = top half-height * BELLY. */
export const BELLY = 0.55;

const HALF_WIDTH: Key[] = [
  [0, 0.003], [0.006, 0.013], [0.018, 0.023], [0.035, 0.032], [0.06, 0.041], [0.088, 0.046],
  [0.112, 0.039], [0.14, 0.039], [0.18, 0.054], [0.25, 0.064], [0.33, 0.061], [0.39, 0.049],
  [0.44, 0.036], [0.55, 0.027], [0.7, 0.017], [0.85, 0.009], [0.96, 0.004], [1, 0.0012],
];

/** Half-height as a ratio of half-width. */
const HEIGHT_RATIO: Key[] = [
  [0, 0.55], [0.04, 0.6], [0.09, 0.72], [0.13, 0.82], [0.2, 0.64], [0.36, 0.64], [0.46, 0.88], [1, 1],
];

const stdWidth = (s: number): number => Math.max(0.0008, curve(HALF_WIDTH, s));

/** One kind of lizard: its shape, and how it maps onto the standard lizard the skins are painted for. */
export interface LizardBuild {
  id: string;
  /** Snout to tail tip, in world units. */
  length: number;
  /** Head, body and legs size, relative to the standard lizard. */
  scale: number;
  sEye: number;
  sShoulder: number;
  sHip: number;
  halfWidth(s: number): number;
  halfHeight(s: number): number;
  /** The matching body position on the standard lizard. */
  toStd(s: number): number;
  /** Simulated spine points, the driven neck point, and rendered rings. */
  spine: number;
  neck: number;
  rings: number;
}

export const LIZARD_BUILD: LizardBuild = {
  id: 'lizard', length: 1, scale: 1, sEye: S_EYE, sShoulder: S_SHOULDER, sHip: S_HIP,
  halfWidth: stdWidth,
  halfHeight: (s) => stdWidth(s) * curve(HEIGHT_RATIO, s),
  toStd: (s) => s,
  spine: 64, neck: 8, rings: 96,
};

/** A slender grass lizard: smaller head and body, and a tail twice as long. */
function longTailed(length: number, scale: number, slim: number): LizardBuild {
  const body = S_TAIL * scale;
  const toStd = (s: number) => {
    const a = s * length;
    return a < body ? a / scale : S_TAIL + ((a - body) / (length - body)) * (1 - S_TAIL);
  };
  const halfWidth = (s: number) => Math.max(0.0008, stdWidth(toStd(s)) * scale * slim);
  return {
    id: 'longtail', length, scale,
    sEye: (S_EYE * scale) / length, sShoulder: (S_SHOULDER * scale) / length, sHip: (S_HIP * scale) / length,
    halfWidth,
    halfHeight: (s) => halfWidth(s) * curve(HEIGHT_RATIO, toStd(s)),
    toStd,
    spine: 96, neck: 7, rings: 128,
  };
}

export const LONGTAIL_BUILD = longTailed(1.5, 0.85, 0.85);
