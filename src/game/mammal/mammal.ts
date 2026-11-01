import * as THREE from 'three';
import { curve } from '../body/curve';
import { placeSegment, solveTwoBone } from '../body/limbs';
import { makeFrame, Spine } from '../body/spine';
import { Tube } from '../body/tube';
import { GroundCreature, placeHead, type SampleFn } from '../creature';
import { damp, rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import type { Coat, LegSize, MammalBuild } from './builds';
import { furTexture } from './fur';

const SWING = 0.45;

interface PawDef {
  s: number;
  side: 1 | -1;
  front: boolean;
  phase: number;
  size: LegSize;
}

interface Paw {
  def: PawDef;
  foot: THREE.Vector3;
  lift: THREE.Vector3;
  target: THREE.Vector3;
  swinging: boolean;
  upper: THREE.Mesh;
  lower: THREE.Mesh;
  knee: THREE.Mesh;
  mesh: THREE.Mesh;
}

interface Ear {
  group: THREE.Group;
  side: 1 | -1;
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const anchor = new THREE.Vector3();
const home = new THREE.Vector3();
const ankle = new THREE.Vector3();
const pole = new THREE.Vector3();
const joint = new THREE.Vector3();
const end = new THREE.Vector3();

const SPHERE = new THREE.SphereGeometry(1, 16, 12);
/** A pointed ear: base on the head, tip one unit up. */
const EAR_CONE = new THREE.ConeGeometry(0.5, 1, 14).translate(0, 0.5, 0);

/** Soft fur: a velvety sheen, kept low so light coats don't look washed out. */
const SHEEN = 0.55;
const fur = (color: string, sheen: string) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.9, sheen: SHEEN, sheenRoughness: 0.5, sheenColor: new THREE.Color(sheen) });

/**
 * A procedural mammal (mouse, squirrel): a furry body lofted along a spine, two-bone legs
 * stepping on their own, ears, eyes, nose, whiskers and tail. It trots, sniffs and rears up.
 */
export class Mammal extends GroundCreature {
  protected readonly spine: Spine;

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
  private readonly hw: (s: number) => number;
  private readonly hh: (s: number) => number;
  private readonly tube: Tube;
  private readonly eyes: THREE.Mesh[];
  private readonly ears: Ear[];
  private readonly nose: THREE.Mesh;
  private readonly whiskers: THREE.LineSegments;
  private readonly paws: Paw[];

  constructor(readonly build: MammalBuild, coat: Coat) {
    super();
    const b = build;
    this.hw = (s) => Math.max(0.0012, curve(b.halfWidth, s));
    this.hh = (s) => this.hw(s) * curve(b.heightRatio, s);
    this.spine = new Spine(b.spine, b.neck, b.length, (s) => (s < b.sRump ? b.maxBend[0] : b.maxBend[1]), 0.5);

    const bodyMat = new THREE.MeshPhysicalMaterial({
      map: furTexture(b, coat), roughness: 0.9, sheen: SHEEN, sheenRoughness: 0.5, sheenColor: new THREE.Color(coat.belly),
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: coat.skin, roughness: 0.6 });
    const noseMat = new THREE.MeshPhysicalMaterial({ color: coat.nose ?? coat.skin, roughness: 0.35, clearcoat: 0.6 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: coat.eye, roughness: 0.1, clearcoat: 1 });
    const legMat = fur(coat.fur, coat.belly);
    const pawMat = coat.tail === 'bare' ? skinMat : legMat;

    // Most rings for the body, fewer for the tail.
    const [bodyRings, tailRings] = b.rings;
    const ringS = [
      ...Array.from({ length: bodyRings }, (_, r) => (r / bodyRings) * b.sRump),
      ...Array.from({ length: tailRings }, (_, r) => b.sRump + (r / (tailRings - 1)) * (1 - b.sRump)),
    ];
    this.tube = new Tube(ringS, 18);
    const body = new THREE.Mesh(this.tube.geometry, bodyMat);
    body.castShadow = true;
    body.frustumCulled = false;
    this.group.add(body);

    this.eyes = [0, 1].map(() => {
      const eye = new THREE.Mesh(SPHERE, eyeMat);
      eye.scale.setScalar(b.eye.r);
      this.group.add(eye);
      return eye;
    });

    const earMat = fur(coat.ears ?? coat.fur, coat.belly);
    const innerMat = new THREE.MeshStandardMaterial({ color: coat.skin, roughness: 0.7, side: THREE.DoubleSide });
    const { kind, w, h } = b.ear;
    this.ears = ([1, -1] as const).map((side) => {
      const group = new THREE.Group();
      const outer = new THREE.Mesh(kind === 'pointy' ? EAR_CONE : SPHERE, earMat);
      outer.castShadow = true;
      group.add(outer);
      if (kind === 'round') {
        outer.scale.set(w, h, w * 0.2);
        const inner = new THREE.Mesh(SPHERE, innerMat);
        inner.scale.set(w * 0.73, h * 0.75, w * 0.13);
        inner.position.z = w * 0.1;
        group.add(inner);
      } else {
        outer.scale.set(w, h, w * 0.35);
        const inner = new THREE.Mesh(EAR_CONE, innerMat);
        inner.scale.set(w * 0.62, h * 0.78, w * 0.2);
        inner.position.set(0, h * 0.04, w * 0.08);
        group.add(inner);
      }
      this.group.add(group);
      return { group, side };
    });

    this.nose = new THREE.Mesh(SPHERE, noseMat);
    this.nose.scale.set(b.nose, b.nose * 0.8, b.nose);
    this.group.add(this.nose);

    // Four whiskers per side, in the head's local frame (x side, y up, z forward).
    const root = this.hw(0.02) * 0.8;
    const pts: number[] = [];
    for (const side of [1, -1]) {
      for (let k = 0; k < 4; k++) {
        const a = -0.3 + k * 0.22;
        const len = b.whiskers * (1 + (k % 2) * 0.24);
        pts.push(side * root, 0, 0, side * (root + Math.cos(a) * len), Math.sin(a) * 0.4 * len, Math.sin(a) * len - root * 0.5);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const dark = new THREE.Color(coat.fur).getHSL({ h: 0, s: 0, l: 0 }).l < 0.3;
    this.whiskers = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: dark ? '#d8d4cc' : '#f4f2ee', transparent: true, opacity: 0.7 }),
    );
    this.group.add(this.whiskers);

    const defs: PawDef[] = [
      { s: b.sShoulder, side: 1, front: true, phase: 0, size: b.front },
      { s: b.sShoulder, side: -1, front: true, phase: 0.5, size: b.front },
      { s: b.sHip, side: 1, front: false, phase: 0.5, size: b.hind },
      { s: b.sHip, side: -1, front: false, phase: 0, size: b.hind },
    ];
    this.paws = defs.map((def) => {
      const [r0, r1] = def.size.radius;
      const rm = (r0 + r1) * 0.45;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(rm, r0, 1, 10), legMat);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(r1, rm, 1, 10), legMat);
      const knee = new THREE.Mesh(SPHERE, legMat);
      knee.scale.setScalar(rm);
      const mesh = new THREE.Mesh(SPHERE, pawMat);
      const [px, py, pz] = b.paw;
      mesh.scale.set(px, py, def.front ? pz : pz * 1.3);
      for (const m of [upper, lower, knee, mesh]) {
        m.castShadow = true;
        m.frustumCulled = false;
        this.group.add(m);
      }
      return {
        def, upper, lower, knee, mesh, swinging: false,
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
    const n = this.spine.count, belly = this.build.belly;
    for (let j = 0; j < n; j += 2) {
      const s = j / (n - 1);
      const p = this.spine.frames[j].pos;
      fn(p.x, p.z, this.hw(s), p.y + this.hh(s) * (1 + belly));
    }
    for (const { group } of this.ears) fn(group.position.x, group.position.z, this.build.ear.w, group.position.y + this.build.ear.h);
  }

  dispose(): void {
    const mats = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
      if (o.geometry !== SPHERE && o.geometry !== EAR_CONE) o.geometry.dispose();
      mats.add(o.material as THREE.Material);
    });
    mats.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }

  protected halfWidthAt(s: number): number {
    return this.hw(s);
  }

  update(dt: number): void {
    const b = this.build, size = b.length / 0.8;
    this.time += dt;
    this.locomote(dt, b.motion);

    this.walkLift += (Math.min(1, this.speed / (1.2 * Math.sqrt(size))) - this.walkLift) * damp(6, dt);
    this.bend += (Math.min(this.speed / 3, 1) * 0.02 * size - this.bend) * damp(6, dt);
    this.raise += (this.raiseTarget - this.raise) * damp(5, dt);
    this.rearLeft = Math.max(0, this.rearLeft - dt);
    this.sniffLeft = Math.max(0, this.sniffLeft - dt);
    const rearTarget = this.rearLeft > 0 && this.speed < 0.1 ? 1 : this.raise * 0.25;
    this.rear += (rearTarget - this.rear) * damp(6, dt);
    this.breathPhase += dt * TAU * ((1.6 + this.arousal * 2) / Math.sqrt(size));
    this.earTwitch = Math.max(0, this.earTwitch - dt * 3);
    if (Math.random() < dt * 0.4) this.earTwitch = 1;

    // Trot; when standing, finish the steps then rest.
    const [s0, sv, smax] = b.stride;
    const moveRate = this.speed + Math.abs(this.turnRate) * 0.06 * size;
    const stride = Math.min(s0 + sv * this.speed, smax);
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
    const L = b.length;
    // A bushy tail: tufts of fur make its outline lumpy.
    const tuft = (s: number) => (b.fluffy && s > b.sRump ? 0.97 + 0.08 * noise3(s * L * 60, 0, 0, 13) : 1);
    this.tube.update(
      this.spine,
      (s) => this.hw(s) * tuft(s) * (1 + breath * smoothstep(b.sShoulder, b.sShoulder + 0.1, s) * smoothstep(b.sRump, b.sHip - 0.02, s)),
      this.hh,
      b.belly,
    );
    this.updatePaws(stride);
    this.updateHead(sniff);
  }

  private composeSpine(sniff: number): void {
    const b = this.build, L = b.length, size = L / 0.8;
    const lift = b.stand + this.walkLift * 0.0075 * L;
    // Gallop rocking: front and back bob in turn.
    const rock = this.walkLift * 0.0075 * L * Math.sin(TAU * this.phase * 2);
    const angle = this.rear * 0.9;
    const wagging = this.tailTwitch * b.wag[0];
    const bodyAt = (s: number) => {
      let y = lift;
      if (s < b.sRump) y += rock * (b.sHip - s) * 4;
      if (s < b.sHip) y += (b.sHip - s) * L * Math.sin(angle);
      if (s < 0.12) y += sniff * 0.004 * size * Math.sin(this.time * 23);
      return y;
    };
    const rump = bodyAt(b.sRump);
    this.spine.compose(
      (s) =>
        this.bend * Math.sin(TAU * this.phase - 9 * (s - b.sRump) * size) * smoothstep(b.sRump, 0.7 + 0.3 * b.sRump, s) * 2 +
        wagging * Math.sin(this.time * TAU * b.wag[1] - s * 14) * smoothstep(b.sRump, 1, s),
      (s) => {
        if (s <= b.sRump) return bodyAt(s);
        const t = (s - b.sRump) / (1 - b.sRump);
        return Math.max(0.004 * size, b.tail(t, rump));
      },
      // Rearing up shortens the body on the ground instead of stretching it.
      (s) => (s < b.sHip ? (b.sHip - s) * L * (1 - Math.cos(angle)) : 0),
    );
  }

  private updatePaws(stride: number): void {
    const b = this.build, size = b.length / 0.8;
    for (const paw of this.paws) {
      const def = paw.def;
      const f = this.spine.sample(def.s, this.frame);
      const w = this.hw(def.s), h = this.hh(def.s);
      const n = Math.hypot(f.tan.x, f.tan.z) || 1;
      const fx = f.tan.x / n, fz = f.tan.z / n;
      const sx = fz * def.side, sz = -fx * def.side;
      anchor.set(f.pos.x, f.pos.y + h * b.belly, f.pos.z).addScaledVector(f.side, def.side * w * 0.55);
      const fwd = (def.front ? 0.015 : -0.019) * size;
      home.set(anchor.x + sx * w * 0.35 + fx * fwd, 0, anchor.z + sz * w * 0.35 + fz * fwd);

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
        paw.foot.y = 0.012 * size * Math.sin(Math.PI * t);
      } else if (paw.swinging) {
        paw.swinging = false;
        paw.foot.set(paw.target.x, 0, paw.target.z);
        if (this.speed > 0.3) this.onFootfall?.(Math.min(1, this.speed / 3) * 0.45, paw.foot.x);
      } else if (paw.foot.distanceToSquared(home) > (0.2 * size) ** 2) {
        paw.foot.copy(home);
      }

      // Rearing up: the front paws leave the ground and hang in front of the chest.
      ankle.copy(paw.foot);
      if (def.front && this.rear > 0.05) {
        tmpB.copy(anchor).addScaledVector(f.tan, (def.size.upper + def.size.lower) * 0.5).addScaledVector(f.up, -(def.size.upper + def.size.lower) * 0.5);
        ankle.lerp(tmpB, smoothstep(0.05, 0.6, this.rear));
      }
      ankle.y += b.paw[1];
      pole.set(-fx, 0.15, -fz);
      solveTwoBone(anchor, ankle, def.size.upper, def.size.lower, pole, joint, end);
      placeSegment(paw.upper, anchor, joint);
      placeSegment(paw.lower, joint, end);
      paw.knee.position.copy(joint);
      paw.mesh.position.set(end.x + fx * b.paw[2] * 0.4, end.y - b.paw[1] * 0.4, end.z + fz * b.paw[2] * 0.4);
      paw.mesh.rotation.y = Math.atan2(fx, fz);
    }
    this.resetFeet = false;
  }

  private updateHead(sniff: number): void {
    const b = this.build;
    const f = this.spine.sample(b.sEye, this.frame);
    const w = this.hw(b.sEye), h = this.hh(b.sEye);
    this.eyes.forEach((eye, i) => {
      const side = i === 0 ? 1 : -1;
      eye.position.set(f.pos.x, f.pos.y + h * b.belly, f.pos.z)
        .addScaledVector(f.side, side * w * b.eye.side)
        .addScaledVector(f.up, h * b.eye.up);
    });

    const e = this.spine.sample(b.sEar, this.frame);
    const ew = this.hw(b.sEar), eh = this.hh(b.sEar);
    // The hat sits between the ears.
    tmpA.set(e.pos.x, e.pos.y + eh * b.belly + eh * 0.95, e.pos.z);
    placeHead(this.head, tmpA, e.side, e.up, e.tan, ew * 2);
    for (const { group, side } of this.ears) {
      group.position.set(e.pos.x, e.pos.y + eh * b.belly, e.pos.z)
        .addScaledVector(e.side, side * ew * b.ear.side)
        .addScaledVector(e.up, eh * b.ear.up);
      const twitch = this.earTwitch * 0.3 * Math.sin(this.time * 30);
      // The ear faces forward and outward, cupped toward sounds.
      const out = b.ear.kind === 'pointy' ? 0.3 : 0.45;
      const normal = tmpA.copy(e.tan).multiplyScalar(0.85).addScaledVector(e.side, side * (out + twitch)).addScaledVector(e.up, 0.15).normalize();
      const up = tmpB.copy(e.up).addScaledVector(e.side, side * (b.ear.kind === 'pointy' ? 0.25 : 0));
      up.addScaledVector(normal, -up.dot(normal)).normalize();
      const x = tmpC.crossVectors(up, normal);
      group.quaternion.setFromRotationMatrix(tmpM.makeBasis(x, up, normal));
    }

    const tip = this.spine.sample(0, this.frame);
    const twitch = sniff * 0.0015 * Math.sin(this.time * 40) * (b.length / 0.8);
    this.nose.position.set(tip.pos.x, tip.pos.y + this.hh(0.01) * b.belly, tip.pos.z)
      .addScaledVector(tip.tan, b.nose * 0.4 + twitch)
      .addScaledVector(tip.up, this.hh(0.01) * 0.5);

    const s = this.spine.sample(0.02, this.frame);
    this.whiskers.position.set(s.pos.x, s.pos.y + this.hh(0.02) * b.belly, s.pos.z);
    this.whiskers.quaternion.setFromRotationMatrix(tmpM.makeBasis(s.side, s.up, s.tan));
    this.whiskers.rotateX(sniff * 0.12 * Math.sin(this.time * 25));
  }
}
