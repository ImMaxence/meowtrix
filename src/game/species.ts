import type { Species } from './brain';

/**
 * How each animal driven by a Brain behaves. Speeds are in world units per second
 * (the lizard is 1 long); `size` is the body length and `height` the top of the back.
 */
const species = (
  size: number, height: number, wanderSpeed: readonly [number, number], fleeSpeed: number,
  restInCover: number, edgeLove: number, displayChance: number, callChance: number,
): Species => ({ size, height, wanderSpeed, fleeSpeed, restInCover, edgeLove, displayChance, callChance });

export const LIZARD = species(1, 0.07, [0.6, 1.5], 3, 0.35, 0, 0.25, 0.18);
export const LONGTAIL = species(1.5, 0.06, [0.8, 1.9], 3.6, 0.3, 0, 0.15, 0.05);
export const FROG = species(0.32, 0.08, [0.7, 1.4], 3.4, 0.4, 0.1, 0.3, 0.3);
export const MOUSE = species(0.8, 0.08, [0.8, 1.8], 3.4, 0.45, 0.6, 0.35, 0.12);
export const SQUIRREL = species(1.1, 0.12, [0.9, 2], 3.6, 0.15, 0.2, 0.4, 0.2);
export const ROACH = species(0.24, 0.035, [0.8, 2.2], 4, 0.6, 0.7, 0.05, 0);
export const BEETLE = species(0.22, 0.06, [0.18, 0.45], 0.9, 0.25, 0.1, 0.2, 0);
export const GRASSHOPPER = species(0.26, 0.06, [0.6, 1.3], 4.5, 0.1, 0, 0.3, 0.35);

export const GOLDFISH = species(0.36, 0, [0.25, 0.7], 2.4, 0.35, 0, 0.25, 0.3);
export const KOI = species(0.85, 0, [0.2, 0.5], 2, 0.25, 0, 0.35, 0.2);
export const SARDINES = species(0.9, 0, [0.6, 1.3], 3.5, 0.15, 0.2, 0.1, 0.1);
export const TROUT = species(0.7, 0, [0.4, 1.1], 3.5, 0.5, 0, 0.15, 0.15);
export const SALMON = species(0.95, 0, [0.5, 1.2], 4, 0.2, 0, 0.15, 0.1);
export const SHARK = species(1.2, 0, [0.5, 1], 2.6, 0.1, 0.3, 0.1, 0.05);
