import * as THREE from 'three';
import { curve, type Key } from '../body/curve';
import { placeSegment } from '../body/limbs';
import { makeFrame, Spine } from '../body/spine';
import { Tube } from '../body/tube';
import { GroundCreature, type Locomotion, type SampleFn } from '../creature';
import { damp, rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';

/** Nose to tail tip, in world units (the lizard is 1). */
const LENGTH = 0.8;
const SPINE = 48;
/** Driven point, just behind the ears. */
const NECK = 6;
/** Where the body ends and the tail starts, and the hips (pivot when rearing up). */
const S_RUMP = 0.46;
const S_HIP = 0.37;
const S_EYE = 0.068;
const S_EAR = 0.115;
const BELLY = 0.6;
const SWING = 0.45;

const MOTION: Locomotion = { accel: 16, decel: 12, turnBase: 2, turnPerSpeed: 3.5, lookLimit: 0.7 };

/** Half-width in world units along the body. */
const HALF_WIDTH: Key[] = [
  [0, 0.002], [0.008, 0.009], [0.025, 0.018], [0.05, 0.028], [0.085, 0.037], [0.11, 0.04], [0.14, 0.038],
  [0.18, 0.043], [0.25, 0.055], [0.33, 0.063], [0.39, 0.06], [0.43, 0.045], [0.448, 0.025], [0.458, 0.01],
  [0.47, 0.0085], [0.7, 0.006], [0.95, 0.003], [1, 0.0015],
];
const HEIGHT_RATIO: Key[] = [[0, 0.7], [0.08, 0.82], [0.2, 0.76], [0.4, 0.8], [0.46, 1], [1, 1]];

const halfWidth = (s: number) => Math.max(0.0012, curve(HALF_WIDTH, s));
const halfHeight = (s: number) => halfWidth(s) * curve(HEIGHT_RATIO, s);

export interface MouseCoat {
  fur: string;
  belly: string;
  skin: string;
}

export const MOUSE_COATS: readonly MouseCoat[] = [
  { fur: '#8e8b87', belly: '#d9d3c8', skin: '#d4a8a4' },
  { fur: '#86654a', belly: '#d8c4a8', skin: '#cf9f96' },
  { fur: '#ece8e0', belly: '#f4f1ea', skin: '#eab7b7' },
];

const furTextures = new Map<MouseCoat, THREE.CanvasTexture>();

/** Fur streaks along the body, a paler belly and a bare pink tail. */
function furTexture(coat: MouseCoat): THREE.CanvasTexture {
  const cached = furTextures.get(coat);
  if (cached) return cached;
  const W = 512, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const hex = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const fur = hex(coat.fur), belly = hex(coat.belly), skin = hex(coat.skin);
  for (let y = 0; y < H; y++) {
    const v = 1 - (y + 0.5) / H;
    const top = Math.cos(TAU * (v - 0.25));
    const back = smoothstep(-0.45, 0.1, top);
    const cy = Math.cos(v * TAU), sy = Math.sin(v * TAU);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const tail = smoothstep(0.45, 0.47, u);
      // Streaky noise: fine across the body, long along it.
      const streak = noise3(u * 60, cy * 9, sy * 9, 5) * 0.5 + noise3(u * 25, cy * 30, sy * 30, 6) * 0.5;
      const shade = 0.82 + 0.3 * streak + 0.08 * back;
      const ring = 0.92 + 0.08 * Math.sin(u * 900);
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const body = (belly[c] + (fur[c] - belly[c]) * back) * shade;
        img.data[i + c] = Math.min(255, body + (skin[c] * ring - body) * tail);
      }
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapT = THREE.RepeatWrapping;
  furTextures.set(coat, tex);
  return tex;
}

interface PawDef {
  s: number;
  side: 1 | -1;
  front: boolean;
  phase: number;
}

const PAW_DEFS: PawDef[] = [
  { s: 0.15, side: 1, front: true, phase: 0 },
  { s: 0.15, side: -1, front: true, phase: 0.5 },
  { s: 0.38, side: 1, front: false, phase: 0.5 },
  { s: 0.38, side: -1, front: false, phase: 0 },
];

interface Paw {
  def: PawDef;
  foot: THREE.Vector3;
  lift: THREE.Vector3;
  target: THREE.Vector3;
  swinging: boolean;
  leg: THREE.Mesh;
  mesh: THREE.Mesh;
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const anchor = new THREE.Vector3();
const home = new THREE.Vector3();

const SPHERE = new THREE.SphereGeometry(1, 16, 12);

/**
 * A procedural mouse: pear-shaped furry body, big ears, whiskers and a long bare tail.
 * It trots with quick little steps, rears up on its hind legs and sniffs.
 */
export class Mouse extends GroundCreature {
  protected readonly spine = new Spine(SPINE, NECK, LENGTH, (s) => (s < S_RUMP ? 0.07 : 0.2), 0.5);

  private phase = 0.45;
  private walkLift = 0;
  private rear = 0;
  private rearLeft = 0;
  private raise = 0;
  private sniffLeft = 0;
  private bend = 0;
  private breathPhase = 0;
  private earTwitch = 0;

  private readonly frame = makeFrame();
  private readonly tube: Tube;
  private readonly furMat: THREE.MeshPhysicalMaterial;
  private readonly skinMat: THREE.MeshStandardMaterial;
  private readonly eyeMat: THREE.MeshPhysicalMaterial;
  private readonly eyes: THREE.Mesh[];
  private readonly ears: THREE.Group[];
  private readonly nose: THREE.Mesh;
  private readonly whiskers: THREE.LineSegments;
  private readonly paws: Paw[];

  constructor(coat: MouseCoat) {
    super();
    this.furMat = new THREE.MeshPhysicalMaterial({
      map: furTexture(coat), roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(coat.belly),
    });
    this.skinMat = new THREE.MeshStandardMaterial({ color: coat.skin, roughness: 0.6 });
    this.eyeMat = new THREE.MeshPhysicalMaterial({ color: '#0a0706', roughness: 0.1, clearcoat: 1 });

    // Most rings for the body, fewer for the thin tail.
    const ringS = [
      ...Array.from({ length: 70 }, (_, r) => (r / 70) * S_RUMP),
      ...Array.from({ length: 24 }, (_, r) => S_RUMP + (r / 23) * (1 - S_RUMP)),
    ];
    this.tube = new Tube(ringS, 18);
    const body = new THREE.Mesh(this.tube.geometry, this.furMat);
    body.castShadow = true;
    body.frustumCulled = false;
    this.group.add(body);

    this.eyes = [0, 1].map(() => {
      const eye = new THREE.Mesh(SPHERE, this.eyeMat);
      eye.scale.setScalar(0.0095);
      this.group.add(eye);
      return eye;
    });

    // Plain fur for ears and legs: the body texture is laid out along the body only.
    const plainFur = new THREE.MeshPhysicalMaterial({
      color: coat.fur, roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(coat.belly),
    });
    const earMat = new THREE.MeshStandardMaterial({ color: coat.skin, roughness: 0.7, side: THREE.DoubleSide });
    this.ears = [0, 1].map(() => {
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(SPHERE, plainFur);
      outer.scale.set(0.03, 0.032, 0.006);
      const inner = new THREE.Mesh(SPHERE, earMat);
      inner.scale.set(0.022, 0.024, 0.004);
      inner.position.z = 0.003;
      outer.castShadow = true;
      ear.add(outer, inner);
      this.group.add(ear);
      return ear;
    });

    this.nose = new THREE.Mesh(SPHERE, this.skinMat);
    this.nose.scale.setScalar(0.0065);
    this.group.add(this.nose);

    // Four whiskers per side, in the head's local frame (x side, y up, z forward).
    const w: number[] = [];
    for (const side of [1, -1]) {
      for (let k = 0; k < 4; k++) {
        const a = -0.3 + k * 0.22;
        const len = 0.05 + (k % 2) * 0.012;
        w.push(side * 0.008, 0, 0, side * (0.008 + Math.cos(a) * len), Math.sin(a) * 0.4 * len, Math.sin(a) * len - 0.004);
      }
    }
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(w, 3));
    this.whiskers = new THREE.LineSegments(
      wGeo,
      new THREE.LineBasicMaterial({ color: '#f4f2ee', transparent: true, opacity: 0.7 }),
    );
    this.group.add(this.whiskers);

    this.paws = PAW_DEFS.map((def) => {
      const mesh = new THREE.Mesh(SPHERE, this.skinMat);
      mesh.scale.set(0.009, 0.0045, def.front ? 0.012 : 0.02);
      mesh.castShadow = true;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, def.front ? 0.009 : 0.013, 1, 8), plainFur);
      leg.castShadow = true;
      this.group.add(leg, mesh);
      return {
        def, mesh, leg, swinging: false,
        foot: new THREE.Vector3(), lift: new THREE.Vector3(), target: new THREE.Vector3(),
      };
    });

    this.teleport(0, 0, rand(0, TAU));
  }

  /** Sniffing: twitching nose and whiskers, small head movements. */
  fidget(): void {
    this.sniffLeft = rand(0.8, 1.6);
  }

  /** Rears up on the hind legs to look around. */
  display(): number {
    const d = rand(1.2, 2.2);
    this.rearLeft = d;
    this.sniffLeft = d;
    return d + 0.3;
  }

  forEachSample(fn: SampleFn): void {
    const n = this.spine.count;
    for (let j = 0; j < n; j += 2) {
      const s = j / (n - 1);
      const p = this.spine.frames[j].pos;
      fn(p.x, p.z, halfWidth(s), p.y + halfHeight(s) * (1 + BELLY));
    }
    for (const ear of this.ears) fn(ear.position.x, ear.position.z, 0.03, ear.position.y + 0.03);
  }

  dispose(): void {
    this.group.traverse((o) => {
      if ((o instanceof THREE.Mesh || o instanceof THREE.LineSegments) && o.geometry !== SPHERE) o.geometry.dispose();
    });
    const mats = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) mats.add(o.material as THREE.Material);
    });
    mats.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }

  protected halfWidthAt(s: number): number {
    return halfWidth(s);
  }

  update(dt: number): void {
    this.time += dt;
    this.locomote(dt, MOTION);

    this.walkLift += (Math.min(1, this.speed / 1.2) - this.walkLift) * damp(6, dt);
    this.bend += (Math.min(this.speed / 3, 1) * 0.02 - this.bend) * damp(6, dt);
    this.raise += (this.raiseTarget - this.raise) * damp(5, dt);
    this.rearLeft = Math.max(0, this.rearLeft - dt);
    this.sniffLeft = Math.max(0, this.sniffLeft - dt);
    const rearTarget = this.rearLeft > 0 && this.speed < 0.1 ? 1 : this.raise * 0.25;
    this.rear += (rearTarget - this.rear) * damp(6, dt);
    this.breathPhase += dt * TAU * (1.6 + this.arousal * 2);
    this.earTwitch = Math.max(0, this.earTwitch - dt * 3);
    if (Math.random() < dt * 0.4) this.earTwitch = 1;

    // Quick trot; when standing, finish the steps then rest.
    const moveRate = this.speed + Math.abs(this.turnRate) * 0.06;
    const stride = Math.min(0.12 + 0.03 * this.speed, 0.22);
    if (moveRate > 0.05) this.phase += Math.min(0.3, (dt * moveRate) / stride);
    else {
      const rest = this.phase < 0.45 ? 0.45 : this.phase < 0.5 ? this.phase : this.phase < 0.95 ? 0.95 : this.phase;
      this.phase = Math.min(rest, this.phase + dt * 4);
    }
    this.phase %= 1;

    const sniff = this.sniffLeft > 0 ? 1 : 0;
    this.spine.follow(this.pos, this.heading, this.lookYaw + sniff * 0.12 * Math.sin(this.time * 9));
    this.composeSpine(sniff);
    const breath = 0.04 * Math.sin(this.breathPhase);
    this.tube.update(
      this.spine,
      (s) => halfWidth(s) * (1 + breath * smoothstep(0.15, 0.25, s) * smoothstep(0.45, 0.35, s)),
      halfHeight,
      BELLY,
    );
    this.updatePaws(stride);
    this.updateHead(sniff);
  }

  private composeSpine(sniff: number): void {
    const L = LENGTH;
    const clearance = 0.002 + this.walkLift * 0.006;
    // Gallop rocking: front and back bob in turn.
    const rock = this.walkLift * 0.006 * Math.sin(TAU * this.phase * 2);
    const rear = Math.sin(this.rear * 0.9);
    this.spine.compose(
      (s) =>
        this.bend * Math.sin(TAU * this.phase - 9 * (s - S_RUMP)) * smoothstep(S_RUMP, 0.7, s) * 2 +
        this.tailTwitch * 0.03 * Math.sin(this.time * 11 - s * 14) * smoothstep(0.7, 1, s),
      (s) => {
        let y = clearance * smoothstep(0.62, S_RUMP, s);
        if (s < S_RUMP) y += rock * (S_HIP - s) * 4;
        if (s < S_HIP) y += (S_HIP - s) * L * rear;
        if (s < 0.12) y += sniff * 0.004 * Math.sin(this.time * 23);
        // Tail base slightly raised.
        y += 0.01 * smoothstep(S_RUMP - 0.02, S_RUMP + 0.04, s) * smoothstep(0.7, S_RUMP + 0.04, s);
        return y;
      },
    );
  }

  private updatePaws(stride: number): void {
    for (const paw of this.paws) {
      const def = paw.def;
      const f = this.spine.sample(def.s, this.frame);
      const w = halfWidth(def.s), h = halfHeight(def.s);
      const n = Math.hypot(f.tan.x, f.tan.z) || 1;
      const fx = f.tan.x / n, fz = f.tan.z / n;
      const sx = fz * def.side, sz = -fx * def.side;
      anchor.set(f.pos.x, f.pos.y + h * BELLY, f.pos.z).addScaledVector(f.side, def.side * w * 0.55);
      home.set(anchor.x + sx * w * 0.35 + fx * (def.front ? 0.012 : -0.015), 0, anchor.z + sz * w * 0.35 + fz * (def.front ? 0.012 : -0.015));

      if (this.resetFeet) {
        paw.foot.copy(home);
        paw.swinging = false;
      }
      const fph = (this.phase + def.phase) % 1;
      if (fph < SWING) {
        if (!paw.swinging) {
          paw.swinging = true;
          paw.lift.copy(paw.foot);
        }
        const t = fph / SWING;
        const reach = 0.3 * stride * Math.min(1, this.speed / 0.3 + 0.2);
        paw.target.set(home.x + fx * reach, 0, home.z + fz * reach);
        paw.foot.lerpVectors(paw.lift, paw.target, smoothstep(0, 1, t));
        paw.foot.y = 0.012 * Math.sin(Math.PI * t);
      } else if (paw.swinging) {
        paw.swinging = false;
        paw.foot.set(paw.target.x, 0, paw.target.z);
        if (this.speed > 0.3) this.onFootfall?.(Math.min(1, this.speed / 3) * 0.45, paw.foot.x);
      } else if (paw.foot.distanceToSquared(home) > 0.04) {
        paw.foot.copy(home);
      }

      // Rearing up: the front paws leave the ground and hang in front of the chest.
      tmpA.copy(paw.foot);
      if (def.front && this.rear > 0.05) {
        tmpB.copy(anchor).addScaledVector(f.tan, 0.015).addScaledVector(f.up, -0.02);
        tmpA.lerp(tmpB, smoothstep(0.05, 0.6, this.rear));
      }
      paw.mesh.position.set(tmpA.x, tmpA.y + 0.004, tmpA.z);
      paw.mesh.rotation.y = Math.atan2(fx, fz);
      placeSegment(paw.leg, anchor, tmpA);
    }
    this.resetFeet = false;
  }

  private updateHead(sniff: number): void {
    const f = this.spine.sample(S_EYE, this.frame);
    const w = halfWidth(S_EYE), h = halfHeight(S_EYE);
    this.eyes.forEach((eye, i) => {
      const side = i === 0 ? 1 : -1;
      eye.position.set(f.pos.x, f.pos.y + h * BELLY, f.pos.z)
        .addScaledVector(f.side, side * w * 0.74)
        .addScaledVector(f.up, h * 0.42);
    });

    const e = this.spine.sample(S_EAR, this.frame);
    const ew = halfWidth(S_EAR), eh = halfHeight(S_EAR);
    this.ears.forEach((ear, i) => {
      const side = i === 0 ? 1 : -1;
      ear.position.set(e.pos.x, e.pos.y + eh * BELLY, e.pos.z)
        .addScaledVector(e.side, side * ew * 0.62)
        .addScaledVector(e.up, eh * 1.05);
      // The ear faces forward and outward, cupped toward sounds.
      const twitch = this.earTwitch * 0.3 * Math.sin(this.time * 30);
      const normal = tmpA.copy(e.tan).multiplyScalar(0.85).addScaledVector(e.side, side * (0.45 + twitch)).addScaledVector(e.up, 0.15).normalize();
      const up = tmpB.copy(e.up).addScaledVector(normal, -e.up.dot(normal)).normalize();
      const x = tmpC.crossVectors(up, normal);
      ear.quaternion.setFromRotationMatrix(tmpM.makeBasis(x, up, normal));
    });

    const tip = this.spine.sample(0, this.frame);
    const twitch = sniff * 0.0015 * Math.sin(this.time * 40);
    this.nose.position.set(tip.pos.x, tip.pos.y + halfHeight(0.01) * BELLY, tip.pos.z).addScaledVector(tip.tan, 0.003 + twitch);

    const s = this.spine.sample(0.02, this.frame);
    this.whiskers.position.set(s.pos.x, s.pos.y + halfHeight(0.02) * BELLY, s.pos.z);
    this.whiskers.quaternion.setFromRotationMatrix(tmpM.makeBasis(s.side, s.up, s.tan));
    this.whiskers.rotateX(sniff * 0.12 * Math.sin(this.time * 25));
  }
}
