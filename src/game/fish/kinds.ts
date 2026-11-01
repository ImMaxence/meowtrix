import type { Key } from '../body/curve';
import type { Locomotion } from '../creature';
import { banded, halves, type Variant } from '../variant';

export type TailKind = 'fork' | 'fan' | 'shark';

/** One kind of fish. Lengths in world units (the lizard is 1); s from the snout (0) to the tail tip (1). */
export interface FishBuild {
  id: string;
  length: number;
  spine: number;
  neck: number;
  halfWidth: Key[];
  /** Half-height as a ratio of half-width: fish are taller than wide. */
  heightRatio: Key[];
  sEye: number;
  eye: number;
  tail: { kind: TailKind; height: number; length: number };
  /** Fin along the back, from s to s, and its height (world units). */
  dorsal: { from: number; to: number; height: number; pointed: boolean };
  /** Small fin between the dorsal fin and the tail (trout, salmon). */
  adipose: boolean;
  pectoral: { s: number; length: number; width: number };
  /** Swimming height range above the bottom. */
  depth: readonly [number, number];
  motion: Locomotion;
  /** Tail beats per second at rest, and per body length per second of speed. */
  beat: readonly [number, number];
  /** Side-to-side swing of the tail when swimming fast, in body lengths. */
  swing: number;
}

export type FishPattern = 'plain' | 'patches' | 'spots' | 'rainbow' | 'marbled' | 'redhead' | 'scales' | 'whale' | 'leopard';

export interface FishColors extends Variant {
  back: string;
  side: string;
  belly: string;
  fins: string;
  /** Darker fin tips (blacktip shark). */
  finTips?: string;
  pattern: FishPattern;
  marks?: string;
  marks2?: string;
  /** Metallic sheen: gold koi, silver sardines. */
  metal: number;
}

const streamlined = (tail: number): Key[] => [
  [0, 0.15], [0.04, 0.42], [0.1, 0.72], [0.2, 0.95], [0.32, 1], [0.5, 0.82], [0.7, 0.48], [0.86, 0.22], [tail, 0.14], [1, 0.1],
];

/** Builds a half-width curve (world units) from relative widths and a body width. */
const widths = (w: number, keys: Key[]): Key[] => keys.map(([s, k]) => [s, k * w]);

export const FISH_BUILDS = {
  goldfish: {
    id: 'goldfish', length: 0.36, spine: 32, neck: 4,
    halfWidth: widths(0.05, [[0, 0.2], [0.05, 0.55], [0.14, 0.85], [0.3, 1], [0.48, 0.85], [0.66, 0.45], [0.8, 0.2], [1, 0.12]]),
    heightRatio: [[0, 1.1], [0.3, 1.45], [0.7, 1.3], [1, 1.1]],
    sEye: 0.1, eye: 0.017,
    tail: { kind: 'fan', height: 0.075, length: 0.12 },
    dorsal: { from: 0.28, to: 0.6, height: 0.05, pointed: false },
    adipose: false,
    pectoral: { s: 0.22, length: 0.045, width: 0.025 },
    depth: [0.1, 0.42],
    motion: { accel: 6, decel: 2.2, turnBase: 3, turnPerSpeed: 3, lookLimit: 0.3 },
    beat: [1.2, 1.8], swing: 0.08,
  },
  kois: {
    id: 'koi', length: 0.85, spine: 40, neck: 5,
    halfWidth: widths(0.075, [[0, 0.25], [0.05, 0.6], [0.15, 0.9], [0.32, 1], [0.55, 0.8], [0.75, 0.45], [0.88, 0.22], [1, 0.12]]),
    heightRatio: [[0, 1], [0.3, 1.2], [0.7, 1.15], [1, 1]],
    sEye: 0.09, eye: 0.018,
    tail: { kind: 'fork', height: 0.11, length: 0.15 },
    dorsal: { from: 0.32, to: 0.68, height: 0.06, pointed: false },
    adipose: false,
    pectoral: { s: 0.2, length: 0.11, width: 0.07 },
    depth: [0.12, 0.42],
    motion: { accel: 3, decel: 1.2, turnBase: 1.2, turnPerSpeed: 1.6, lookLimit: 0.25 },
    beat: [0.6, 1.4], swing: 0.06,
  },
  sardines: {
    id: 'sardine', length: 0.2, spine: 24, neck: 3,
    halfWidth: widths(0.014, streamlined(0.92)),
    heightRatio: [[0, 1.2], [0.3, 1.6], [1, 1.3]],
    sEye: 0.09, eye: 0.009,
    tail: { kind: 'fork', height: 0.032, length: 0.04 },
    dorsal: { from: 0.38, to: 0.5, height: 0.016, pointed: true },
    adipose: false,
    pectoral: { s: 0.22, length: 0.02, width: 0.008 },
    depth: [0.2, 0.42],
    motion: { accel: 10, decel: 3, turnBase: 3, turnPerSpeed: 1.5, lookLimit: 0.2 },
    beat: [2, 2.2], swing: 0.05,
  },
  trouts: {
    id: 'trout', length: 0.7, spine: 40, neck: 5,
    halfWidth: widths(0.05, streamlined(0.9)),
    heightRatio: [[0, 1.1], [0.3, 1.45], [0.8, 1.3], [1, 1.2]],
    sEye: 0.08, eye: 0.014,
    tail: { kind: 'fork', height: 0.08, length: 0.1 },
    dorsal: { from: 0.36, to: 0.52, height: 0.05, pointed: false },
    adipose: true,
    pectoral: { s: 0.2, length: 0.06, width: 0.025 },
    depth: [0.08, 0.35],
    motion: { accel: 8, decel: 2.5, turnBase: 2.5, turnPerSpeed: 2.4, lookLimit: 0.2 },
    beat: [1, 1.8], swing: 0.06,
  },
  salmons: {
    id: 'salmon', length: 0.95, spine: 44, neck: 5,
    halfWidth: widths(0.065, streamlined(0.9)),
    heightRatio: [[0, 1.1], [0.3, 1.5], [0.8, 1.3], [1, 1.2]],
    sEye: 0.075, eye: 0.016,
    tail: { kind: 'fork', height: 0.11, length: 0.13 },
    dorsal: { from: 0.36, to: 0.5, height: 0.065, pointed: true },
    adipose: true,
    pectoral: { s: 0.2, length: 0.08, width: 0.03 },
    depth: [0.12, 0.4],
    motion: { accel: 7, decel: 2, turnBase: 1.8, turnPerSpeed: 2, lookLimit: 0.2 },
    beat: [0.9, 1.6], swing: 0.06,
  },
  sharks: {
    id: 'shark', length: 1.2, spine: 48, neck: 6,
    halfWidth: widths(0.075, [[0, 0.12], [0.06, 0.5], [0.14, 0.82], [0.28, 1], [0.45, 0.85], [0.65, 0.45], [0.82, 0.22], [1, 0.08]]),
    heightRatio: [[0, 0.7], [0.15, 0.95], [0.4, 1.05], [0.8, 1.2], [1, 1.2]],
    sEye: 0.08, eye: 0.013,
    tail: { kind: 'shark', height: 0.14, length: 0.17 },
    dorsal: { from: 0.3, to: 0.44, height: 0.13, pointed: true },
    adipose: false,
    pectoral: { s: 0.24, length: 0.17, width: 0.08 },
    depth: [0.1, 0.36],
    motion: { accel: 4, decel: 1.5, turnBase: 1, turnPerSpeed: 1.3, lookLimit: 0.15 },
    beat: [0.7, 1.2], swing: 0.07,
  },
} satisfies Record<string, FishBuild>;

const fish = (c: Omit<FishColors, 'swatch'>, swatch?: string): FishColors =>
  ({ ...c, swatch: swatch ?? banded(c.back, c.marks ?? c.side, c.side) });

export const FISH_COLORS = {
  goldfish: [
    fish({ id: 'orange', back: '#f07a1a', side: '#f39a3a', belly: '#f8d29a', fins: '#f5902e', pattern: 'scales', metal: 0.25 }),
    fish(
      { id: 'redwhite', back: '#f4efe8', side: '#f6f2ea', belly: '#faf8f2', fins: '#f6efe6', pattern: 'patches', marks: '#e2361c', metal: 0.15 },
      halves('#e2361c', '#f4efe8'),
    ),
    fish({ id: 'black', back: '#1c1a1a', side: '#2a2626', belly: '#4a4038', fins: '#262222', pattern: 'scales', metal: 0.2 }),
    fish(
      { id: 'calico', back: '#8aa6c4', side: '#b4c6d8', belly: '#e6e8ea', fins: '#c6d0dc', pattern: 'patches', marks: '#e2562a', marks2: '#1e1c1e', metal: 0.1 },
      `linear-gradient(135deg, #1e1c1e 0 30%, #e2562a 30% 62%, #8aa6c4 62% 100%)`,
    ),
  ],
  kois: [
    fish(
      { id: 'kohaku', back: '#f6f2ea', side: '#f6f2ea', belly: '#faf7f0', fins: '#f6f0e8', pattern: 'patches', marks: '#d8341c', metal: 0.1 },
      halves('#d8341c', '#f6f2ea'),
    ),
    fish(
      { id: 'showa', back: '#1e1c1c', side: '#2a2626', belly: '#f2eee6', fins: '#2a2626', pattern: 'patches', marks: '#d8341c', marks2: '#f2eee6', metal: 0.1 },
      `linear-gradient(135deg, #1e1c1c 0 34%, #d8341c 34% 66%, #f2eee6 66% 100%)`,
    ),
    fish({ id: 'ogon', back: '#e6b23a', side: '#f0c454', belly: '#f6dc8a', fins: '#f0c454', pattern: 'scales', metal: 0.85 }),
    fish(
      { id: 'asagi', back: '#5a7088', side: '#8aa0b4', belly: '#e0582a', fins: '#e0804a', pattern: 'scales', marks: '#e0582a', metal: 0.15 },
      banded('#5a7088', '#8aa0b4', '#e0582a'),
    ),
  ],
  sardines: [
    fish({ id: 'silver', back: '#2f4f6e', side: '#c8d2da', belly: '#eef2f4', fins: '#9aa8b4', pattern: 'spots', marks: '#22384e', metal: 0.8 }),
  ],
  trouts: [
    fish({ id: 'rainbow', back: '#5a6a3a', side: '#c8c2a8', belly: '#efeae0', fins: '#9a9070', pattern: 'rainbow', marks: '#1e1c18', marks2: '#d8687a', metal: 0.3 }),
    fish({ id: 'brown', back: '#6a5430', side: '#c4a464', belly: '#efe2c0', fins: '#8a7048', pattern: 'spots', marks: '#2a2016', marks2: '#c8381e', metal: 0.2 }),
    fish({ id: 'brook', back: '#3a4a30', side: '#7a8a5a', belly: '#e8742a', fins: '#e8742a', pattern: 'marbled', marks: '#c8c87a', marks2: '#d83a2a', metal: 0.15 }),
  ],
  salmons: [
    fish({ id: 'atlantic', back: '#3e5468', side: '#c6ccd2', belly: '#f0f2f2', fins: '#7a8894', pattern: 'spots', marks: '#1e2228', metal: 0.7 }),
    fish(
      { id: 'sockeye', back: '#c8321e', side: '#d23a22', belly: '#e86a4a', fins: '#3a5a3a', pattern: 'redhead', marks: '#3f6a3e', metal: 0.15 },
      halves('#3f6a3e', '#c8321e'),
    ),
  ],
  sharks: [
    fish({ id: 'blacktip', back: '#6e7c86', side: '#8e9aa2', belly: '#eef0f0', fins: '#6e7c86', finTips: '#1a1c1e', pattern: 'plain', metal: 0.1 }),
    fish({ id: 'leopard', back: '#c8a46a', side: '#d6b47c', belly: '#f0e4ca', fins: '#c8a46a', pattern: 'leopard', marks: '#3a2a1a', metal: 0 }),
    fish({ id: 'whale', back: '#3c5266', side: '#4e6478', belly: '#e8ecee', fins: '#3c5266', pattern: 'whale', marks: '#e8eef2', metal: 0 }),
  ],
} satisfies Record<string, readonly FishColors[]>;
