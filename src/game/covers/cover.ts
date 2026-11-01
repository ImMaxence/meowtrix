import * as THREE from 'three';
import type { Walker } from '../creature';
import { rand } from '../math';

/** Land: leaf, stone, boot, grass, tulip. Water: lily pads, rock, seaweed. */
export type CoverKind = 'leaf' | 'stone' | 'boot' | 'grass' | 'tulip' | 'lily' | 'rock' | 'weed';

/** What makes a cover come alive: draping over bodies, parting grass, swaying. */
export interface CoverPart {
  update(cover: Cover, dt: number, walkers: readonly Walker[]): void;
}

/** Something an animal can hide under or in: a leaf, a stone, an old boot, a tuft of grass... */
export class Cover {
  readonly object = new THREE.Group();
  /** The animal hiding here (or on its way), so two never pick the same spot. */
  occupant: Walker | null = null;
  removed = false;
  /** Things animals walk around: pebbles under a stone, the walls of a boot (x, z, radius, repeated). */
  readonly solids: number[] = [];
  /** Room underneath: only animals up to that height hide here. */
  clearance = Infinity;
  /** Swimming height of a fish hiding here (water covers). */
  depth: number | null = null;
  /** Too solid to swim through (underwater rocks): only fish hiding beneath may go under it. */
  blocking = false;
  /** A point to go through first, such as the opening of a boot. */
  entry: THREE.Vector2 | null = null;
  /** Where to stop when hiding, if not just past the centre. */
  spot: THREE.Vector2 | null = null;
  part: CoverPart | null = null;
  /** 0..1, set when touched or when an animal runs through; decays on its own. */
  wobble = 0;
  /** Time, for swaying. */
  t = rand(0, 10);

  constructor(
    readonly kind: CoverKind,
    readonly x: number,
    readonly z: number,
    readonly radius: number,
    /** Light covers rustle when touched (leaves, grass, flowers). */
    readonly shakes: boolean,
  ) {
    this.object.position.set(x, 0, z);
  }

  distanceTo(x: number, z: number): number {
    return Math.hypot(x - this.x, z - this.z);
  }

  /** Where an animal coming from (x, z) should stop to be hidden. */
  hideSpot(x: number, z: number, out: THREE.Vector2): THREE.Vector2 {
    if (this.spot) return out.copy(this.spot);
    // Stop just past the centre, so head and body end up underneath.
    let dx = this.x - x, dz = this.z - z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) {
      dx = 1;
      dz = 0;
    } else {
      dx /= len;
      dz /= len;
    }
    return out.set(this.x + dx * 0.08, this.z + dz * 0.08);
  }

  shake(amount: number): void {
    if (this.shakes) this.wobble = Math.max(this.wobble, amount);
  }

  update(dt: number, walkers: readonly Walker[]): void {
    this.t += dt;
    this.wobble *= Math.exp(-dt * 4);
    this.part?.update(this, dt, walkers);
  }

  /** Converts a point of the cover's own frame (rotated by `yaw`) to the ground. */
  toWorld(lx: number, lz: number, yaw: number, out = new THREE.Vector2()): THREE.Vector2 {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return out.set(this.x + lx * c + lz * s, this.z - lx * s + lz * c);
  }

  dispose(): void {
    this.removed = true;
    this.object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        // Geometries shared between covers (tulip cups) stay.
        if (!o.geometry.userData.shared) o.geometry.dispose();
        // Textures are cached and shared; only the materials go.
        (o.material as THREE.Material).dispose();
      }
    });
    this.object.removeFromParent();
  }
}

/** Rock-like colouring helper: a colour from a hex palette, picked at random. */
export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
