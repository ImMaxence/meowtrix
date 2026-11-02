import * as THREE from 'three';
import { curve } from '../body/curve';
import { makeFrame, Spine } from '../body/spine';
import { Tube } from '../body/tube';
import { GroundCreature, placeHead, type Locomotion, type SampleFn } from '../creature';
import { damp, rand, smoothstep, TAU } from '../math';
import { banded, type Variant } from '../variant';

export interface CaterpillarColors extends Variant {
  /** Painted in turn across each body segment. */
  bands: readonly string[];
  head: string;
  eye: string;
}

const caterpillar = (id: string, bands: readonly string[], head: string, eye: string): CaterpillarColors =>
  ({ id, bands, head, eye, swatch: banded(bands[0], bands[bands.length - 1], bands[1] ?? bands[0]) });

export const CATERPILLAR_COLORS: readonly CaterpillarColors[] = [
  caterpillar('green', ['#7fc24a', '#93d25a', '#e9e36a'], '#4f8a2a', '#1e2a14'),
  // A monarch caterpillar: black, yellow and white rings.
  caterpillar('striped', ['#1c1c1c', '#f3d93c', '#1c1c1c', '#f6f1dc'], '#1c1c1c', '#f6f1dc'),
  // A woolly bear: black ends, rust middle.
  caterpillar('woolly', ['#2a2320', '#b8552c'], '#2a2320', '#111111'),
];

const LENGTH = 0.3;
const SEGMENTS = 11;
const COUNT = 16;
const NECK = 1;
const HALF_WIDTH = 0.03;
/** Width along the body: a slightly bigger head, a tapering tail. */
const WIDTH: readonly (readonly [number, number])[] = [[0, 0.55], [0.05, 1], [0.85, 1], [1, 0.35]];
const MOTION: Locomotion = { accel: 2.5, decel: 5, turnBase: 2.2, turnPerSpeed: 3, lookLimit: 0.7 };
/** Body positions of the little feet (three pairs of true legs, five of prolegs). */
const FEET_S = [0.1, 0.17, 0.24, 0.48, 0.58, 0.68, 0.78, 0.92];
const SPHERE = new THREE.SphereGeometry(1, 10, 8);

const tmp = new THREE.Vector3();

/** The bands of each segment, painted along u (the body). */
function bandTexture(bands: readonly string[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 4;
  const ctx = canvas.getContext('2d')!;
  const seg = canvas.width / SEGMENTS, band = seg / bands.length;
  for (let s = 0; s < SEGMENTS; s++) {
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(s * seg + i * band, 0, band + 0.5, canvas.height);
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/**
 * A caterpillar: a soft segmented body that inches along with a wave running down it, little
 * feet on each side, and a front half that rears up to look around. Slow and easy to catch:
 * made for kittens and old cats.
 */
export class Caterpillar extends GroundCreature {
  protected readonly spine: Spine;

  private wave = 0;
  private rear = 0;
  private rearLeft = 0;
  private raise = 0;
  private sway = 0;

  private readonly frame = makeFrame();
  private readonly tube: Tube;
  private readonly map: THREE.Texture;
  private readonly materials: THREE.Material[];
  private readonly eyes: THREE.Mesh[];
  private readonly feet: THREE.Mesh[];

  constructor(colors: CaterpillarColors) {
    super();
    // Very bendy: it can curl almost into a ring.
    this.spine = new Spine(COUNT, NECK, LENGTH, () => 0.55, 0.6);
    this.map = bandTexture(colors.bands);
    const bodyMat = new THREE.MeshPhysicalMaterial({ map: this.map, roughness: 0.55, clearcoat: 0.35 });
    const headMat = new THREE.MeshPhysicalMaterial({ color: colors.head, roughness: 0.5, clearcoat: 0.4 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: colors.eye, roughness: 0.2, clearcoat: 1 });
    this.materials = [bodyMat, headMat, eyeMat];

    this.tube = new Tube(Array.from({ length: 44 }, (_, r) => r / 43), 12);
    const body = new THREE.Mesh(this.tube.geometry, bodyMat);
    body.castShadow = true;
    body.frustumCulled = false;
    this.group.add(body);

    this.eyes = ([1, -1] as const).map((side) => {
      const eye = new THREE.Mesh(SPHERE, eyeMat);
      eye.scale.setScalar(0.004);
      eye.userData.side = side;
      this.group.add(eye);
      return eye;
    });
    this.feet = FEET_S.flatMap((s) =>
      ([1, -1] as const).map((side) => {
        const foot = new THREE.Mesh(SPHERE, headMat);
        foot.scale.set(0.005, 0.004, 0.006);
        foot.userData.s = s;
        foot.userData.side = side;
        foot.castShadow = true;
        this.group.add(foot);
        return foot;
      }),
    );

    this.teleport(0, 0, rand(0, TAU));
  }

  /** Half width at s: the segments bulge, and a wave of contraction travels down the body. */
  private hw(s: number): number {
    return HALF_WIDTH * curve(WIDTH, s) * (1 + 0.16 * Math.sin(s * TAU * SEGMENTS)) * (1 + 0.08 * Math.sin(s * TAU * 2.5 - this.wave));
  }

  private hh(s: number): number {
    return this.hw(s) * 0.95;
  }

  protected halfWidthAt(s: number): number {
    return this.hw(s);
  }

  /** Sways its head from side to side, feeling around. */
  fidget(): void {
    this.sway = 1;
  }

  /** Rears up its front half and holds still. */
  display(): number {
    this.rearLeft = 1.4;
    return 1.8;
  }

  forEachSample(fn: SampleFn): void {
    const n = this.spine.count;
    for (let j = 0; j < n; j += 2) {
      const f = this.spine.frames[j], s = j / (n - 1);
      fn(f.pos.x, f.pos.z, this.hw(s), f.pos.y + this.hh(s) * 2);
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.locomote(dt, MOTION);
    // The wave runs faster the faster it crawls, and keeps rippling gently at rest.
    this.wave += dt * (3 + this.speed * 40);
    this.rearLeft = Math.max(0, this.rearLeft - dt);
    this.sway = Math.max(0, this.sway - dt * 1.5);
    this.raise += (this.raiseTarget - this.raise) * damp(5, dt);
    const rearTarget = this.rearLeft > 0 && this.speed < 0.05 ? 1 : this.raise * 0.5;
    this.rear += (rearTarget - this.rear) * damp(5, dt);

    this.spine.follow(this.pos, this.heading, this.lookYaw + this.sway * 0.5 * Math.sin(this.time * 7));
    const lift = this.rear * 0.07;
    const front = (s: number) => smoothstep(0.4, 0, s);
    this.spine.compose(() => 0, (s) => 0.002 + lift * front(s), (s) => lift * front(s) * 0.6);
    this.tube.update(this.spine, (s) => this.hw(s), (s) => this.hh(s), 0.35);

    const e = this.spine.sample(0.03, this.frame);
    const ew = this.hw(0.03), eh = this.hh(0.03);
    for (const eye of this.eyes) {
      eye.position.set(e.pos.x, e.pos.y + eh * 0.35, e.pos.z)
        .addScaledVector(e.side, (eye.userData.side as number) * ew * 0.75)
        .addScaledVector(e.up, eh * 0.9)
        .addScaledVector(e.tan, ew * 0.3);
    }
    const h = this.spine.sample(0.05, this.frame);
    const hh = this.hh(0.05);
    tmp.set(h.pos.x, h.pos.y + hh * 0.35 + hh, h.pos.z);
    placeHead(this.head, tmp, h.side, h.up, h.tan, this.hw(0.05) * 2);

    for (const foot of this.feet) {
      const s = foot.userData.s as number, side = foot.userData.side as number;
      const f = this.spine.sample(s, this.frame);
      foot.position.set(f.pos.x, 0.003 + lift * front(s), f.pos.z).addScaledVector(f.side, side * this.hw(s) * 0.85);
    }
  }

  dispose(): void {
    this.tube.geometry.dispose();
    for (const m of this.materials) m.dispose();
    this.map.dispose();
    this.group.removeFromParent();
  }
}
