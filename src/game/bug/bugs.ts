import type { Locomotion } from '../creature';
import { banded, type Variant } from '../variant';

/** An ellipsoid of the body, in model units (the bug is 1 long, nose toward +z). */
export interface BodyPart {
  z: number;
  y: number;
  /** Half width, half height, half length. */
  size: readonly [number, number, number];
  material: 'head' | 'pronotum' | 'shell';
}

/** One kind of walking insect. */
export interface BugBuild {
  id: string;
  /** Length in world units. */
  length: number;
  parts: readonly BodyPart[];
  /** Body half width, for hit tests (model units). */
  width: number;
  /** Leg pairs from front to back, for side +1: hip (x, y, z), foot (x, z) and knee height. */
  legs: readonly { hip: readonly [number, number, number]; foot: readonly [number, number]; knee: number }[];
  legRadius: number;
  antenna: { length: number; spread: number; droop: number };
  /** Rear spikes (cockroach). Big jaws (stag beetle) come with the colours. */
  cerci: boolean;
  motion: Locomotion;
  /** Gait phase (radians) per body length travelled. */
  cadence: number;
}

export interface BugColors extends Variant {
  shell: string;
  pronotum: string;
  head: string;
  legs: string;
  /** Metallic, iridescent shell (rose chafer, dor beetle). */
  metal: number;
  mandibles?: string;
}

export const ROACH_BUILD: BugBuild = {
  id: 'roach', length: 0.24, width: 0.22,
  parts: [
    { z: 0.42, y: 0.08, size: [0.09, 0.06, 0.07], material: 'head' },
    { z: 0.3, y: 0.1, size: [0.2, 0.045, 0.14], material: 'pronotum' },
    { z: -0.1, y: 0.1, size: [0.21, 0.06, 0.42], material: 'shell' },
  ],
  legs: [
    { hip: [0.08, 0.07, 0.24], foot: [0.38, 0.5], knee: 0.16 },
    { hip: [0.1, 0.07, 0.08], foot: [0.48, 0.02], knee: 0.16 },
    { hip: [0.09, 0.07, -0.06], foot: [0.44, -0.5], knee: 0.16 },
  ],
  legRadius: 0.014,
  antenna: { length: 1.1, spread: 0.55, droop: 0.04 },
  cerci: true,
  motion: { accel: 30, decel: 22, turnBase: 7, turnPerSpeed: 5, lookLimit: 0 },
  cadence: 26,
};

export const BEETLE_BUILD: BugBuild = {
  id: 'beetle', length: 0.22, width: 0.26,
  parts: [
    { z: 0.38, y: 0.11, size: [0.11, 0.07, 0.08], material: 'head' },
    { z: 0.24, y: 0.15, size: [0.19, 0.11, 0.12], material: 'pronotum' },
    { z: -0.1, y: 0.15, size: [0.25, 0.17, 0.33], material: 'shell' },
  ],
  legs: [
    { hip: [0.1, 0.09, 0.22], foot: [0.3, 0.4], knee: 0.17 },
    { hip: [0.13, 0.08, 0.04], foot: [0.38, 0.0], knee: 0.17 },
    { hip: [0.12, 0.08, -0.1], foot: [0.34, -0.38], knee: 0.17 },
  ],
  legRadius: 0.022,
  antenna: { length: 0.28, spread: 0.7, droop: 0.02 },
  cerci: false,
  motion: { accel: 10, decel: 12, turnBase: 2.4, turnPerSpeed: 4, lookLimit: 0 },
  cadence: 22,
};

const bug = (c: Omit<BugColors, 'swatch'>): BugColors => ({ ...c, swatch: banded(c.shell, c.pronotum, c.shell) });

export const BUG_COLORS = {
  roaches: [
    bug({ id: 'brown', shell: '#8a5428', pronotum: '#b98a52', head: '#5a3518', legs: '#7a4c26', metal: 0 }),
    bug({ id: 'black', shell: '#2a1a12', pronotum: '#33221a', head: '#1c120c', legs: '#3a261a', metal: 0 }),
  ],
  beetles: [
    bug({ id: 'rose', shell: '#2f8a3a', pronotum: '#2c7d36', head: '#256b2e', legs: '#1f3d22', metal: 0.75 }),
    bug({ id: 'stag', shell: '#5a2e1a', pronotum: '#2a1a12', head: '#2a1a12', legs: '#1e1410', metal: 0.1, mandibles: '#7a3a1e' }),
    bug({ id: 'dung', shell: '#23306a', pronotum: '#1f2a5a', head: '#1a2148', legs: '#141a30', metal: 0.8 }),
    bug({ id: 'gold', shell: '#c69a2c', pronotum: '#b08422', head: '#8a6418', legs: '#5a4214', metal: 0.85 }),
  ],
} satisfies Record<string, readonly BugColors[]>;
