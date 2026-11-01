import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import { damp, rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import { banded, dotted, type Variant } from '../variant';
import { Hopper, type HopStyle } from './hopper';

export interface FrogColors extends Variant {
  back: string;
  belly: string;
  spots: string;
  /** Spot density, 0 for plain skin. */
  spotty: number;
  eye: string;
  sac: string;
}

const frog = (c: Omit<FrogColors, 'swatch'>, swatch?: string): FrogColors =>
  ({ ...c, swatch: swatch ?? banded(c.back, c.spots, c.back) });

export const FROG_COLORS: readonly FrogColors[] = [
  frog({ id: 'green', back: '#6f9a3c', belly: '#e6e2b8', spots: '#2f4a1c', spotty: 0.5, eye: '#c9a43a', sac: '#e9e6d6' }),
  frog({ id: 'tree', back: '#56c234', belly: '#f2f0dc', spots: '#3a2a1c', spotty: 0, eye: '#d8a43a', sac: '#f0e2b0' }),
  frog({ id: 'common', back: '#9a7148', belly: '#e9dcc0', spots: '#4a3020', spotty: 0.6, eye: '#b88a3a', sac: '#e2d6c0' }),
  frog({ id: 'dart', back: '#2a62d8', belly: '#1e3e98', spots: '#0c0e18', spotty: 0.75, eye: '#0c0c10', sac: '#3a6ae0' }, dotted('#2a62d8', '#0c0e18')),
];

const STYLE: HopStyle = {
  length: 0.32, width: 0.09, minHop: 0.08, maxHop: 0.95, perSpeed: 0.38,
  airTime: [0.16, 0.24], arc: 0.35, turnRate: 6, rest: [0.15, 0.7],
};

/** Model units: the frog is about 1 long, nose toward +z. */
const SCALE = STYLE.length;
const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const LIMB = new THREE.CylinderGeometry(0.7, 1, 1, 8);

/** Hind leg joints, folded (sitting) and stretched (mid-leap), for side +1. */
const HIND = {
  hip: [0.13, 0.11, -0.24],
  fold: { knee: [0.34, 0.08, -0.02], ankle: [0.24, 0.05, -0.3], toes: [0.36, 0.01, -0.02] },
  leap: { knee: [0.2, 0.1, -0.52], ankle: [0.22, 0.08, -0.86], toes: [0.24, 0.05, -1.12] },
} as const;
const FRONT = {
  shoulder: [0.14, 0.1, 0.14],
  fold: { elbow: [0.22, 0.05, 0.18], hand: [0.2, 0.01, 0.3] },
  reach: { elbow: [0.18, 0.12, 0.34], hand: [0.17, 0.1, 0.52] },
} as const;

const textures = new Map<string, THREE.CanvasTexture>();

/** Moist skin with irregular dark spots. */
function skinTexture(c: FrogColors): THREE.CanvasTexture {
  let tex = textures.get(c.id);
  if (tex) return tex;
  const W = 128, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const back = rgb(c.back), spots = rgb(c.spots);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = (x / W) * TAU, v = y / H;
      const px = Math.cos(a) * Math.sin(v * Math.PI), pz = Math.sin(a) * Math.sin(v * Math.PI), py = Math.cos(v * Math.PI);
      const n = noise3(px * 5 + 3, py * 5, pz * 5, 31);
      const spot = c.spotty ? smoothstep(1 - c.spotty * 0.42, 1.02 - c.spotty * 0.42, n) : 0;
      const k = 0.88 + 0.22 * noise3(px * 14, py * 14, pz * 14, 32);
      const i = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch++) img.data[i + ch] = (back[ch] + (spots[ch] - back[ch]) * spot) * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(c.id, tex);
  return tex;
}

const v3 = (a: readonly number[], side: number, out: THREE.Vector3) => out.set(a[0] * side, a[1], a[2]);
const tA = new THREE.Vector3(), tB = new THREE.Vector3();
const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();

interface Limb {
  side: 1 | -1;
  segs: THREE.Mesh[];
  hand: THREE.Mesh;
}

/**
 * A frog: sits still a lot, turns with little shuffles, leaps in long arcs with its hind legs
 * stretched out, puffs up its vocal sacs to croak and snaps its tongue.
 */
export class Frog extends Hopper {
  protected readonly style = STYLE;
  private readonly model = new THREE.Group();
  private readonly hind: Limb[] = [];
  private readonly front: Limb[] = [];
  private readonly sacs: THREE.Mesh[] = [];
  private readonly tongue: THREE.Mesh;
  private readonly materials: THREE.Material[] = [];
  private croakLeft = 0;
  private tongueT = -1;
  private breath = 0;

  constructor(colors: FrogColors) {
    super();
    const skin = new THREE.MeshPhysicalMaterial({ map: skinTexture(colors), roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.3 });
    const belly = new THREE.MeshPhysicalMaterial({ color: colors.belly, roughness: 0.5, clearcoat: 0.4 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: colors.eye, roughness: 0.1, clearcoat: 1 });
    const pupilMat = new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.1, clearcoat: 1 });
    const sacMat = new THREE.MeshPhysicalMaterial({ color: colors.sac, roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.85 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: '#d2607a', roughness: 0.4 });
    this.materials.push(skin, belly, eyeMat, pupilMat, sacMat, tongueMat);

    const part = (mat: THREE.Material, s: readonly [number, number, number], p: readonly [number, number, number]) => {
      const m = new THREE.Mesh(SPHERE, mat);
      m.scale.set(...s);
      m.position.set(...p);
      m.castShadow = true;
      this.model.add(m);
      return m;
    };
    part(skin, [0.25, 0.15, 0.3], [0, 0.17, 0.0]);
    part(skin, [0.23, 0.13, 0.2], [0, 0.14, -0.2]);
    part(belly, [0.22, 0.1, 0.32], [0, 0.11, -0.02]);
    part(skin, [0.25, 0.11, 0.2], [0, 0.2, 0.25]);
    for (const side of [1, -1] as const) {
      part(eyeMat, [0.07, 0.07, 0.07], [side * 0.14, 0.29, 0.29]);
      part(pupilMat, [0.03, 0.022, 0.03], [side * 0.16, 0.33, 0.32]);
      const sac = part(sacMat, [0.001, 0.001, 0.001], [side * 0.2, 0.15, 0.3]);
      this.sacs.push(sac);

      const limb = (count: number, radius: number, list: Limb[]) => {
        const segs = Array.from({ length: count }, (_, k) => {
          const m = new THREE.Mesh(LIMB, skin);
          m.userData.radius = radius * (1 - k * 0.22);
          m.castShadow = true;
          this.model.add(m);
          return m;
        });
        const hand = new THREE.Mesh(SPHERE, skin);
        hand.castShadow = true;
        this.model.add(hand);
        list.push({ side, segs, hand });
      };
      limb(3, 0.065, this.hind);
      limb(2, 0.035, this.front);
    }
    this.tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 1, 8).translate(0, 0.5, 0).rotateX(Math.PI / 2), tongueMat);
    this.tongue.position.set(0, 0.17, 0.42);
    this.tongue.visible = false;
    this.model.add(this.tongue);

    this.model.scale.setScalar(SCALE);
    this.group.add(this.model);
    this.teleport(0, 0, rand(0, TAU));
  }

  /** Snaps its tongue at something. */
  fidget(): void {
    if (this.tongueT < 0) this.tongueT = 0;
  }

  /** Puffs up its vocal sacs (the croak itself is the brain's call). */
  display(): number {
    this.croakLeft = rand(1, 1.8);
    return this.croakLeft + 0.2;
  }

  protected pose(dt: number): void {
    this.croakLeft = Math.max(0, this.croakLeft - dt);
    this.breath += dt * TAU * (1.2 + this.arousal * 2.5);
    const t = this.hopT;
    // Legs push off at the start of the leap and fold back before landing.
    const leap = t < 0 ? 0 : Math.sin(Math.PI * Math.min(1, t * 1.25));
    const reach = t < 0 ? 0 : smoothstep(0.3, 0.8, t) * (1 - smoothstep(0.9, 1, t));
    this.model.position.y = this.height;
    // Sitting tilted up; flat and stretched in the air.
    this.model.rotation.x = -0.28 * (1 - leap) - this.raiseTarget * 0.1 + (t < 0 ? 0 : 0.25 * (t - 0.5));
    this.model.rotation.y = this.lookYaw * 0.4;

    for (const limb of this.hind) {
      v3(HIND.hip, limb.side, p0);
      v3(HIND.fold.knee, limb.side, p1).lerp(v3(HIND.leap.knee, limb.side, tA), leap);
      v3(HIND.fold.ankle, limb.side, p2).lerp(v3(HIND.leap.ankle, limb.side, tA), leap);
      v3(HIND.fold.toes, limb.side, p3).lerp(v3(HIND.leap.toes, limb.side, tA), leap);
      this.placeLimb(limb, [p0, p1, p2, p3], 0.09);
    }
    for (const limb of this.front) {
      v3(FRONT.shoulder, limb.side, p0);
      v3(FRONT.fold.elbow, limb.side, p1).lerp(v3(FRONT.reach.elbow, limb.side, tA), reach);
      v3(FRONT.fold.hand, limb.side, p2).lerp(v3(FRONT.reach.hand, limb.side, tA), reach);
      this.placeLimb(limb, [p0, p1, p2], 0.05);
    }

    const puff = this.croakLeft > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 7)) : 0;
    for (const sac of this.sacs) {
      const r = sac.scale.x + ((puff * 0.085 + 0.001) - sac.scale.x) * damp(14, dt);
      sac.scale.setScalar(r);
    }
    this.model.scale.set(SCALE * (1 + 0.015 * Math.sin(this.breath)), SCALE, SCALE);

    if (this.tongueT >= 0) {
      this.tongueT += dt / 0.28;
      const ext = this.tongueT < 0.35 ? this.tongueT / 0.35 : 1 - (this.tongueT - 0.35) / 0.65;
      this.tongue.visible = ext > 0.02;
      this.tongue.scale.set(1, 1, Math.max(0.01, ext * 0.55));
      if (this.tongueT >= 1) {
        this.tongueT = -1;
        this.tongue.visible = false;
      }
    }
  }

  private placeLimb(limb: Limb, joints: THREE.Vector3[], hand: number): void {
    limb.segs.forEach((seg, k) => {
      placeSegment(seg, joints[k], joints[k + 1]);
      const r = seg.userData.radius as number;
      seg.scale.x = seg.scale.z = r;
    });
    const last = joints[joints.length - 1], prev = joints[joints.length - 2];
    // Webbed foot: a flat oval pointing on from the last segment.
    tB.subVectors(last, prev).setY(0).normalize();
    limb.hand.position.copy(last).addScaledVector(tB, hand * 0.6);
    limb.hand.position.y = Math.max(0.01, last.y);
    limb.hand.scale.set(hand * 0.8, 0.012, hand * 1.3);
    limb.hand.rotation.y = Math.atan2(tB.x, tB.z);
  }

  dispose(): void {
    this.tongue.geometry.dispose();
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
