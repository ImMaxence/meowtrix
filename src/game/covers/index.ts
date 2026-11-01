import type * as THREE from 'three';
import type { Walker } from '../creature';
import { clamp, rand } from '../math';
import type { Bounds } from '../world';
import { BOOT_SCALE, makeBoot } from './boot';
import { Cover, type CoverKind } from './cover';
import { makeEgg } from './egg';
import { makeLeaf } from './leaf';
import { makeLilies } from './lily';
import { makePumpkin } from './pumpkin';
import { makeStone } from './stone';
import { makeTulips } from './tulip';
import { GRASS, makeTuft, SEAWEED } from './tuft';

export { Cover, type CoverKind } from './cover';

/** Footprint radius of each kind, for spacing them out. */
const RADIUS: Record<CoverKind, () => number> = {
  leaf: () => rand(0.27, 0.35),
  stone: () => rand(0.3, 0.4),
  boot: () => 0.42 * BOOT_SCALE,
  grass: () => rand(0.5, 0.56),
  tulip: () => 0.3,
  lily: () => 0.32,
  rock: () => rand(0.36, 0.44),
  weed: () => 0.26,
  stocking: () => 0.42 * BOOT_SCALE,
  pumpkin: () => 0.42,
  egg: () => 0.36,
};

const SHAKES: ReadonlySet<CoverKind> = new Set<CoverKind>(['leaf', 'grass', 'tulip', 'lily', 'weed']);

function build(cover: Cover): void {
  switch (cover.kind) {
    case 'leaf': {
      const halfLength = cover.radius * 1.15;
      makeLeaf(cover, halfLength, cover.radius * 2 - halfLength);
      break;
    }
    case 'stone': makeStone(cover, cover.radius); break;
    case 'rock': makeStone(cover, cover.radius, true); break;
    case 'boot': makeBoot(cover); break;
    case 'stocking': makeBoot(cover, true); break;
    case 'pumpkin': makePumpkin(cover); break;
    case 'egg': makeEgg(cover); break;
    case 'grass': makeTuft(cover, GRASS); break;
    case 'weed': makeTuft(cover, SEAWEED); break;
    case 'tulip': makeTulips(cover); break;
    case 'lily': makeLilies(cover); break;
  }
}

/** Lays out the hiding spots over the visible ground. */
export class Covers {
  readonly list: Cover[] = [];
  private kinds: readonly CoverKind[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  setKinds(kinds: readonly CoverKind[], bounds: Bounds): void {
    this.kinds = kinds;
    this.layout(bounds);
  }

  /** Re-lays out only if some cover ended up off screen (after a resize). */
  fit(bounds: Bounds): void {
    if (this.list.some((c) => c.x < bounds.minX || c.x > bounds.maxX || c.z < bounds.minZ || c.z > bounds.maxZ)) {
      this.layout(bounds);
    }
  }

  layout(b: Bounds): void {
    for (const c of this.list) c.dispose();
    this.list.length = 0;
    if (!this.kinds.length) return;

    const area = (b.maxX - b.minX) * (b.maxZ - b.minZ);
    const count = clamp(Math.round(area / 2.2), 2, 8);
    // Every chosen kind gets its turn, starting from a random one; the biggest are placed first
    // so a boot still finds room on a crowded screen.
    const first = Math.floor(Math.random() * this.kinds.length);
    const picks = Array.from({ length: count }, (_, k) => {
      const kind = this.kinds[(first + k) % this.kinds.length];
      return { kind, radius: RADIUS[kind]() };
    }).sort((a, b) => b.radius - a.radius);
    for (const { kind, radius } of picks) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const inset = radius * 0.6 + 0.15;
        if (b.maxX - b.minX < 2 * inset || b.maxZ - b.minZ < 2 * inset) break;
        const x = rand(b.minX + inset, b.maxX - inset), z = rand(b.minZ + inset, b.maxZ - inset);
        if (this.list.some((c) => c.distanceTo(x, z) < c.radius + radius + 0.3)) continue;
        const cover = new Cover(kind, x, z, radius, SHAKES.has(kind));
        build(cover);
        this.scene.add(cover.object);
        this.list.push(cover);
        break;
      }
    }
  }

  touch(x: number, z: number): void {
    for (const c of this.list) if (c.distanceTo(x, z) < c.radius * 1.1) c.shake(1);
  }

  update(dt: number, walkers: readonly Walker[]): void {
    for (const c of this.list) {
      for (const w of walkers) {
        if (w.speed > 0.25 && c.distanceTo(w.pos.x, w.pos.y) < c.radius) c.shake(Math.min(0.6, w.speed * 0.3));
      }
      c.update(dt, walkers);
    }
  }
}
