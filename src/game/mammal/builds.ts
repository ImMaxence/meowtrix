import type { Key } from '../body/curve';
import type { Locomotion } from '../creature';
import { smoothstep } from '../math';
import { banded, type Variant } from '../variant';

export interface LegSize {
  upper: number;
  lower: number;
  /** Radius at the top and at the paw. */
  radius: readonly [number, number];
}

/** One kind of mammal. Lengths in world units (the lizard is 1); positions s from nose (0) to tail tip (1). */
export interface MammalBuild {
  id: string;
  length: number;
  spine: number;
  neck: number;
  halfWidth: Key[];
  /** Half-height as a ratio of half-width. */
  heightRatio: Key[];
  /** The belly is flatter than the back. */
  belly: number;
  sEye: number;
  sEar: number;
  sShoulder: number;
  sHip: number;
  /** Where the tail starts. */
  sRump: number;
  /** Height of the belly line when standing: the legs' length. */
  stand: number;
  front: LegSize;
  hind: LegSize;
  /** Paw half sizes (x, y, z). */
  paw: readonly [number, number, number];
  eye: { r: number; side: number; up: number };
  ear: { kind: 'round' | 'pointy'; w: number; h: number; side: number; up: number };
  nose: number;
  /** Whisker length. */
  whiskers: number;
  /** Height of the tail at t (0 at the rump, 1 at the tip), given the body height at the rump. */
  tail: (t: number, body: number) => number;
  /** Tail twitch: amplitude and frequency. */
  wag: readonly [amp: number, freq: number];
  maxBend: readonly [body: number, tail: number];
  motion: Locomotion;
  /** Stride at rest and per unit of speed, and its maximum. */
  stride: readonly [number, number, number];
  /** Rings along the body and along the tail. */
  rings: readonly [number, number];
  /** Bushy tails get a fluffy, lumpy outline. */
  fluffy?: boolean;
}

export const MOUSE_BUILD: MammalBuild = {
  id: 'mouse', length: 0.8, spine: 48, neck: 6,
  halfWidth: [
    [0, 0.002], [0.008, 0.009], [0.025, 0.018], [0.05, 0.028], [0.085, 0.037], [0.11, 0.04], [0.14, 0.038],
    [0.18, 0.043], [0.25, 0.055], [0.33, 0.063], [0.39, 0.06], [0.43, 0.045], [0.448, 0.025], [0.458, 0.01],
    [0.47, 0.0085], [0.7, 0.006], [0.95, 0.003], [1, 0.0015],
  ],
  heightRatio: [[0, 0.7], [0.08, 0.82], [0.2, 0.76], [0.4, 0.8], [0.46, 1], [1, 1]],
  belly: 0.6, sEye: 0.068, sEar: 0.115, sShoulder: 0.15, sHip: 0.37, sRump: 0.46, stand: 0.002,
  front: { upper: 0.015, lower: 0.015, radius: [0.006, 0.009] },
  hind: { upper: 0.018, lower: 0.018, radius: [0.008, 0.013] },
  paw: [0.009, 0.0045, 0.014],
  eye: { r: 0.0095, side: 0.74, up: 0.42 },
  ear: { kind: 'round', w: 0.03, h: 0.032, side: 0.62, up: 1.05 },
  nose: 0.0065, whiskers: 0.05,
  // Lies on the ground, the base slightly raised.
  tail: (t, body) => body * smoothstep(0.35, 0, t) + 0.01 * smoothstep(0, 0.1, t) * smoothstep(0.5, 0.1, t),
  wag: [0.03, 1.75],
  maxBend: [0.07, 0.2],
  motion: { accel: 16, decel: 12, turnBase: 2, turnPerSpeed: 3.5, lookLimit: 0.7 },
  stride: [0.12, 0.03, 0.22],
  rings: [70, 24],
};

export const SQUIRREL_BUILD: MammalBuild = {
  id: 'squirrel', length: 1.1, spine: 56, neck: 7,
  halfWidth: [
    [0, 0.004], [0.01, 0.013], [0.03, 0.025], [0.055, 0.034], [0.075, 0.036], [0.1, 0.029], [0.14, 0.04],
    [0.24, 0.05], [0.33, 0.052], [0.41, 0.045], [0.45, 0.03], [0.48, 0.034], [0.6, 0.062], [0.76, 0.074],
    [0.9, 0.064], [0.97, 0.04], [1, 0.012],
  ],
  heightRatio: [[0, 0.8], [0.06, 0.92], [0.14, 0.85], [0.4, 0.9], [0.46, 0.8], [0.6, 0.75], [1, 0.75]],
  belly: 0.65, sEye: 0.048, sEar: 0.085, sShoulder: 0.14, sHip: 0.35, sRump: 0.455, stand: 0.035,
  front: { upper: 0.028, lower: 0.03, radius: [0.011, 0.008] },
  hind: { upper: 0.04, lower: 0.04, radius: [0.017, 0.01] },
  paw: [0.011, 0.006, 0.018],
  eye: { r: 0.012, side: 0.7, up: 0.45 },
  ear: { kind: 'pointy', w: 0.026, h: 0.042, side: 0.55, up: 0.95 },
  nose: 0.006, whiskers: 0.04,
  // The bushy tail arches up behind the back.
  tail: (t, body) => body + 0.2 * (1 - (1 - Math.min(1, t * 1.6)) ** 2) - 0.06 * smoothstep(0.6, 1, t),
  wag: [0.05, 4],
  maxBend: [0.06, 0.12],
  motion: { accel: 14, decel: 11, turnBase: 2, turnPerSpeed: 3.2, lookLimit: 0.7 },
  stride: [0.16, 0.05, 0.32],
  rings: [64, 60],
  fluffy: true,
};

export interface Coat extends Variant {
  fur: string;
  belly: string;
  /** Bare skin: inside the ears, nose, paws and tail of a mouse. */
  skin: string;
  eye: string;
  nose?: string;
  ears?: string;
  /** A bare, ringed tail (mouse) or a tail colour. */
  tail?: 'bare' | string;
}

const coat = (c: Omit<Coat, 'swatch'>): Coat => ({ ...c, swatch: banded(c.fur, c.belly, c.fur) });

export const COATS = {
  mice: [
    coat({ id: 'grey', fur: '#8e8b87', belly: '#d9d3c8', skin: '#d4a8a4', eye: '#0a0706', tail: 'bare' }),
    coat({ id: 'brown', fur: '#86654a', belly: '#d8c4a8', skin: '#cf9f96', eye: '#0a0706', tail: 'bare' }),
    coat({ id: 'white', fur: '#ece8e0', belly: '#f4f1ea', skin: '#eab7b7', eye: '#5a0f14', tail: 'bare' }),
    coat({ id: 'black', fur: '#2b2825', belly: '#45403a', skin: '#c49590', eye: '#0a0706', tail: 'bare' }),
  ],
  squirrels: [
    coat({ id: 'red', fur: '#a8441c', belly: '#f0e3c8', skin: '#6e4a3a', eye: '#0a0706', nose: '#3a2a22', ears: '#963c18', tail: '#9a3c16' }),
    coat({ id: 'grey', fur: '#8c8781', belly: '#efebe3', skin: '#6e5e56', eye: '#0a0706', nose: '#3a302c', tail: '#97918a' }),
    coat({ id: 'black', fur: '#2a2522', belly: '#3d3631', skin: '#4a3a34', eye: '#0a0706', nose: '#1a1412' }),
  ],
} satisfies Record<string, readonly Coat[]>;
