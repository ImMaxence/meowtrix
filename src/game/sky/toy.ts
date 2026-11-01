import type * as THREE from 'three';
import type { Dressable } from '../creature';
import type { Bounds } from '../world';

/** What a toy knows about the scene. */
export interface ToyHabitat {
  readonly bounds: Bounds;
  readonly speedFactor: number;
  /** 0 … 1: the end of a session is near, toys get slow and easy to catch. */
  readonly tired: number;
}

/** Something that is not an animal but moves like prey: a feather in the wind, a laser dot. */
export interface Toy extends Dressable {
  readonly group: THREE.Object3D;
  /** Position; y is the height above the ground. */
  readonly pos: THREE.Vector3;
  /** A touch at (x, z), projected at the toy's height. True when the paw landed right on it. */
  touch(x: number, z: number): boolean;
  /** A pointer moving over the ground at `speed` units per second. */
  pointer(x: number, z: number, speed: number): void;
  noise(level: 1 | 2): void;
  update(dt: number): void;
  dispose(): void;
}

/** How far a point is outside the visible area (negative when inside). */
export const outside = (b: Bounds, x: number, z: number): number => Math.max(b.minX - x, x - b.maxX, b.minZ - z, z - b.maxZ);
