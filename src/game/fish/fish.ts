import * as THREE from 'three';
import { curve } from '../body/curve';
import { makeFrame, Spine } from '../body/spine';
import { Tube } from '../body/tube';
import type { Cover } from '../covers';
import { GroundCreature, type SampleFn } from '../creature';
import { clamp, damp, rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import { SURFACE } from '../water';
import type { FishBuild, FishColors } from './kinds';

/** The belly is a little flatter than the back. */
const BELLY = 0.85;

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const skins = new Map<string, THREE.CanvasTexture>();

/** Back, flanks and belly, scales and the kind's markings. u along the body, v around it (0.25 on the back). */
function skinTexture(b: FishBuild, c: FishColors): THREE.CanvasTexture {
  const key = `${b.id}:${c.id}`;
  let tex = skins.get(key);
  if (tex) return tex;
  const W = 256, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const back = hex(c.back), side = hex(c.side), belly = hex(c.belly);
  const marks = hex(c.marks ?? c.back), marks2 = hex(c.marks2 ?? c.back);
  let r = 0, g = 0, bl = 0;
  const blend = (col: RGB, t: number) => {
    r += (col[0] - r) * t;
    g += (col[1] - g) * t;
    bl += (col[2] - bl) * t;
  };
  for (let y = 0; y < H; y++) {
    const v = 1 - (y + 0.5) / H;
    const top = Math.cos(TAU * (v - 0.25));
    const cy = Math.cos(v * TAU), sy = Math.sin(v * TAU);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W, a = u * b.length * 10;
      r = belly[0]; g = belly[1]; bl = belly[2];
      blend(side, smoothstep(-0.7, -0.2, top));
      blend(back, smoothstep(0.1, 0.7, top));
      const n = (f: number, seed: number) => noise3(a * f, cy * f * 0.6, sy * f * 0.6, seed);
      switch (c.pattern) {
        case 'patches':
          blend(marks, smoothstep(0.55, 0.6, n(0.9, 41)) * smoothstep(-0.4, 0.1, top) * smoothstep(0.03, 0.08, u));
          if (c.marks2) blend(marks2, smoothstep(0.62, 0.66, n(1.1, 42)) * smoothstep(-0.3, 0.2, top));
          break;
        case 'spots':
          blend(marks, smoothstep(0.7, 0.74, n(4, 43)) * smoothstep(-0.2, 0.3, top));
          if (c.marks2) blend(marks2, smoothstep(0.74, 0.77, n(3.4, 44)) * smoothstep(0.3, -0.1, top) * smoothstep(-0.6, -0.3, top));
          break;
        case 'rainbow':
          blend(marks2, Math.exp(-(((top + 0.05) / 0.22) ** 2)) * 0.8 * smoothstep(0.08, 0.2, u));
          blend(marks, smoothstep(0.72, 0.75, n(4.5, 45)) * smoothstep(-0.4, 0.1, top));
          break;
        case 'marbled':
          blend(marks, smoothstep(0.03, 0, Math.abs(n(2.2, 46) - 0.5)) * smoothstep(0.1, 0.6, top));
          blend(marks2, smoothstep(0.76, 0.79, n(3, 47)) * smoothstep(0.2, -0.1, top) * smoothstep(-0.5, -0.2, top));
          break;
        case 'redhead':
          blend(marks, smoothstep(0.2, 0.14, u));
          break;
        case 'whale':
          blend(marks, smoothstep(0.7, 0.73, n(5, 48)) * smoothstep(-0.3, 0.2, top));
          break;
        case 'leopard':
          blend(marks, smoothstep(0.68, 0.72, n(3.2, 49)) * smoothstep(0.06, 0.12, u));
          break;
        case 'scales':
          if (c.marks) blend(marks, smoothstep(-0.2, -0.6, top) * 0.8);
          break;
        case 'plain':
          break;
      }
      // Scales: a fine diamond pattern, slightly shinier on the flanks.
      const su = (a * 6) % 1, sv = (v * 40 + Math.floor(a * 6) * 0.5) % 1;
      const scale = 0.94 + 0.06 * (1 - Math.abs(su - 0.5) * 2) * (1 - Math.abs(sv - 0.5) * 2);
      const i = (y * W + x) * 4;
      img.data[i] = clamp(r * scale, 0, 255);
      img.data[i + 1] = clamp(g * scale, 0, 255);
      img.data[i + 2] = clamp(bl * scale, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapT = THREE.RepeatWrapping;
  skins.set(key, tex);
  return tex;
}

/** A fin as a flat shape in the fish's side plane: z runs back along the body, y up. Coloured darker at the tips. */
function finGeometry(points: readonly (readonly [number, number])[], base: string, tip: string | undefined): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ShapeGeometry(shape, 6);
  // ShapeGeometry lies in xy: turn it so x becomes z (backward) and keep y up.
  geo.rotateY(-Math.PI / 2);
  const p = geo.attributes.position;
  let maxR = 1e-6;
  for (let i = 0; i < p.count; i++) maxR = Math.max(maxR, Math.hypot(p.getY(i), p.getZ(i)));
  const colors = new Float32Array(p.count * 3);
  const a = new THREE.Color(base), b = new THREE.Color(tip ?? base), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    col.copy(a).lerp(b, smoothstep(0.55, 0.95, Math.hypot(p.getY(i), p.getZ(i)) / maxR));
    col.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function tailPoints(kind: FishBuild['tail']['kind'], h: number, l: number): [number, number][] {
  switch (kind) {
    case 'fork': return [[0, h * 0.18], [l * 0.85, h], [l, h * 0.92], [l * 0.55, 0], [l, -h * 0.92], [l * 0.85, -h], [0, -h * 0.18]];
    case 'fan': return [[0, h * 0.2], [l * 0.7, h], [l, h * 0.6], [l * 0.85, 0], [l, -h * 0.6], [l * 0.7, -h], [0, -h * 0.2]];
    case 'shark': return [[0, h * 0.15], [l * 1.1, h * 1.2], [l * 0.95, h * 0.9], [l * 0.45, 0.02], [l * 0.65, -h * 0.55], [l * 0.5, -h * 0.6], [0, -h * 0.15]];
  }
}

const tmpA = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const back = new THREE.Vector3();

/** Where fish look for shade: the covers of the water theme. */
export interface Pond {
  readonly covers: readonly Cover[];
}

/**
 * A fish, swimming at its own depth above the bottom: the body undulates along a spine, the tail
 * beats faster with speed, pectoral fins flutter when it hovers. It rises under lily pads, sinks
 * under rocks, and sometimes comes up to gulp at the surface.
 */
export class Fish extends GroundCreature {
  protected readonly spine: Spine;
  /** Called when the mouth breaks the surface (rings on the water). */
  onSurface: ((x: number, z: number) => void) | null = null;
  /** Depth chosen by a school instead of the fish itself. */
  depthOverride: number | null = null;

  private depth: number;
  private depthTarget: number;
  private nextDepth = rand(3, 8);
  private phase = rand(0, 1);
  private swing = 0;
  private flutter = 0;
  private gulpLeft = 0;
  private gulped = false;
  private wiggle = 0;
  private readonly frame = makeFrame();
  private readonly hw: (s: number) => number;
  private readonly hh: (s: number) => number;
  private readonly tube: Tube;
  private readonly tail: THREE.Mesh;
  private readonly dorsal: THREE.Mesh;
  private readonly adipose: THREE.Mesh | null = null;
  private readonly pectorals: THREE.Mesh[] = [];
  private readonly eyes: THREE.Mesh[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(readonly build: FishBuild, colors: FishColors, private readonly pond: Pond) {
    super();
    const b = build;
    this.hw = (s) => Math.max(0.001, curve(b.halfWidth, s));
    this.hh = (s) => this.hw(s) * curve(b.heightRatio, s);
    this.spine = new Spine(b.spine, b.neck, b.length, (s) => 0.04 + 0.1 * s, 0.4);
    this.depth = this.depthTarget = rand(b.depth[0], b.depth[1]);

    const skin = new THREE.MeshPhysicalMaterial({
      map: skinTexture(b, colors), roughness: 0.35, metalness: colors.metal * 0.6, clearcoat: 0.6, clearcoatRoughness: 0.2,
      iridescence: colors.metal > 0.5 ? 0.5 : 0,
    });
    const finMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.4, transparent: true, opacity: b.id === 'shark' ? 1 : 0.72, side: THREE.DoubleSide,
    });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#0a0a0c', roughness: 0.05, clearcoat: 1 });
    this.materials.push(skin, finMat, eyeMat);

    const rings = Math.round(30 + b.length * 40);
    this.tube = new Tube(Array.from({ length: rings }, (_, r) => r / (rings - 1)), 16);
    const body = new THREE.Mesh(this.tube.geometry, skin);
    body.castShadow = true;
    body.frustumCulled = false;
    this.group.add(body);

    const { kind, height, length } = b.tail;
    this.tail = new THREE.Mesh(finGeometry(tailPoints(kind, height, length), colors.fins, colors.finTips), finMat);
    const d = b.dorsal, span = (d.to - d.from) * b.length;
    this.dorsal = new THREE.Mesh(
      finGeometry(
        d.pointed
          ? [[-span / 2, 0], [-span * 0.1, d.height], [span * 0.05, d.height * 0.9], [span / 2, 0]]
          : [[-span / 2, 0], [-span * 0.3, d.height], [span * 0.25, d.height * 0.75], [span / 2, 0]],
        colors.fins, colors.finTips,
      ),
      finMat,
    );
    if (b.adipose) {
      const h = d.height * 0.35;
      this.adipose = new THREE.Mesh(finGeometry([[-h, 0], [0, h], [h, 0]], colors.fins, undefined), finMat);
    }
    const p = b.pectoral;
    for (const side of [1, -1]) {
      const fin = new THREE.Mesh(
        finGeometry([[0, 0], [p.length * 0.5, p.width], [p.length, p.width * 0.4], [p.length * 0.8, -p.width * 0.2]], colors.fins, colors.finTips),
        finMat,
      );
      fin.userData.side = side;
      this.pectorals.push(fin);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(b.eye, 10, 8), eyeMat);
      this.eyes.push(eye);
    }
    for (const m of [this.tail, this.dorsal, ...this.pectorals, ...this.eyes, ...(this.adipose ? [this.adipose] : [])]) {
      m.castShadow = true;
      m.frustumCulled = false;
      this.group.add(m);
    }
    this.teleport(0, 0, rand(0, TAU));
  }

  /** A flick of the pectoral fins and a little wiggle. */
  fidget(): void {
    this.wiggle = 1;
  }

  /** Comes up to gulp at the surface. */
  display(): number {
    this.gulpLeft = rand(2.5, 3.5);
    this.gulped = false;
    return this.gulpLeft;
  }

  forEachSample(fn: SampleFn): void {
    const n = this.spine.count;
    for (let j = 0; j < n; j += 2) {
      const s = j / (n - 1), p = this.spine.frames[j].pos;
      fn(p.x, p.z, this.hw(s), p.y + this.hh(s) * 2);
    }
  }

  protected halfWidthAt(s: number): number {
    // Fins and the swinging tail make a fish a bigger target than its body.
    return this.hw(s) * 1.6 + 0.01;
  }

  update(dt: number): void {
    const b = this.build;
    this.time += dt;
    this.locomote(dt, b.motion);
    this.wiggle = Math.max(0, this.wiggle - dt * 2);
    this.gulpLeft = Math.max(0, this.gulpLeft - dt);
    this.updateDepth(dt);

    const rate = b.beat[0] + b.beat[1] * (this.speed / b.length) + this.wiggle * 3;
    this.phase += dt * rate;
    const swingTarget = b.swing * b.length * (0.2 + 0.8 * Math.min(1, this.speed / (b.length * 2))) + Math.abs(this.turnRate) * 0.01;
    this.swing += (swingTarget - this.swing) * damp(4, dt);
    this.flutter += ((this.speed < b.length * 0.3 ? 1 : 0.2) - this.flutter) * damp(3, dt);

    this.spine.follow(this.pos, this.heading, this.lookYaw);
    const climb = clamp((this.depthTarget - this.depth) * 2, -0.25, 0.25);
    this.spine.compose(
      (s) => this.swing * Math.sin(TAU * this.phase - 5 * s) * smoothstep(0.1, 1, s) ** 1.4,
      (s) => this.depth + climb * (0.5 - s) * b.length * 0.5 - this.hh(s) * BELLY,
    );
    this.tube.update(this.spine, this.hw, this.hh, BELLY);
    this.placeFins();
  }

  private updateDepth(dt: number): void {
    const b = this.build;
    this.nextDepth -= dt;
    if (this.nextDepth <= 0) {
      this.depthTarget = rand(b.depth[0], b.depth[1]);
      this.nextDepth = rand(4, 10);
    }
    let target = this.depthOverride ?? this.depthTarget;
    // In the shade of a cover, swim at its depth: under lily pads, under a rock, among the weeds.
    // Rocks can't be swum through, so dive before reaching one.
    let rate = 0.7;
    for (const c of this.pond.covers) {
      if (c.depth === null) continue;
      const d = c.distanceTo(this.pos.x, this.pos.y);
      if (d < (c.blocking ? c.radius + 0.3 : c.radius * 0.9)) target = c.depth;
      if (c.blocking && d < c.radius + 0.3) rate = 4;
    }
    if (this.gulpLeft > 0) {
      target = SURFACE - this.hh(0.3) * 0.5;
      if (!this.gulped && this.depth > SURFACE - this.hh(0.3) - 0.03) {
        this.gulped = true;
        const tip = this.spine.frames[0].pos;
        this.onSurface?.(tip.x, tip.z);
      }
    }
    const maxY = SURFACE - this.hh(0.3) * 0.6;
    this.depth += (clamp(target, this.hh(0.3) + 0.03, maxY) - this.depth) * damp(this.gulpLeft > 0 ? 1.6 : rate, dt);
  }

  private placeFins(): void {
    const b = this.build, f = this.frame;
    const at = (s: number, up: number) => {
      this.spine.sample(s, f);
      const h = this.hh(s);
      return tmpA.set(f.pos.x, f.pos.y + h * BELLY + h * up, f.pos.z);
    };
    const orient = (mesh: THREE.Object3D) => {
      // Fin frame: x across, y up, z back along the body.
      back.copy(f.tan).negate();
      mesh.quaternion.setFromRotationMatrix(tmpM.makeBasis(tmpA.copy(f.side).negate(), f.up, back));
    };
    const tailPos = at(0.985, 0).clone();
    orient(this.tail);
    this.tail.position.copy(tailPos);

    const d = b.dorsal;
    const dPos = at((d.from + d.to) / 2, 0.92).clone();
    orient(this.dorsal);
    this.dorsal.position.copy(dPos);
    if (this.adipose) {
      const aPos = at(0.8, 0.85).clone();
      orient(this.adipose);
      this.adipose.position.copy(aPos);
    }

    const pPos = at(b.pectoral.s, -0.45).clone();
    const w = this.hw(b.pectoral.s);
    const beat = this.flutter * 0.5 * Math.sin(this.time * 9) + this.wiggle * 0.4 * Math.sin(this.time * 20);
    for (const fin of this.pectorals) {
      const side = fin.userData.side as number;
      orient(fin);
      fin.position.copy(pPos).addScaledVector(f.side, side * w * 0.85);
      // Laid flat, spread out sideways and swept back (the fin frame's x points inward), flapping when hovering.
      fin.rotateY(-side * (0.9 - 0.4 * Math.min(1, this.speed / b.length)));
      fin.rotateZ(side * (Math.PI / 2 - 0.3 + beat));
    }

    const ePos = at(b.sEye, 0.15).clone();
    const ew = this.hw(b.sEye);
    this.eyes.forEach((eye, i) => {
      eye.position.copy(ePos).addScaledVector(f.side, (i === 0 ? 1 : -1) * ew * 0.82);
    });
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
