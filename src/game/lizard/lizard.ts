import * as THREE from 'three';
import { placeSegment, solveTwoBone } from '../body/limbs';
import { makeFrame, Spine } from '../body/spine';
import { Tube } from '../body/tube';
import { GroundCreature, placeHead, type Locomotion, type SampleFn } from '../creature';
import { damp, rand, smoothstep, TAU } from '../math';
import { BELLY, type LizardBuild } from './profile';
import { limbBump, skinTextures, type SkinPreset } from './skin';

/** Vertices per rendered cross-section. */
const SIDES = 20;
/** Fraction of a gait cycle each foot spends in the air. */
const SWING = 0.4;
const BOB_TIME = 0.42;
const FLICK_TIME = 0.3;
const EYE_RADIUS = 0.0135;

const MOTION: Locomotion = { accel: 12, decel: 9, turnBase: 0.9, turnPerSpeed: 3.2, lookLimit: 0.55 };

interface LegDef {
  s: number;
  side: 1 | -1;
  front: boolean;
  /** Gait phase offset: diagonal pairs move together. */
  phase: number;
  upper: number;
  lower: number;
  /** Rest position of the foot, sideways and forward from the leg root. */
  span: number;
  forward: number;
}

/** Legs of a lizard built like `b`: the standard leg sizes, scaled with the body. */
function legDefs(b: LizardBuild): LegDef[] {
  const k = b.scale;
  const front = { s: b.sShoulder, front: true, upper: 0.065 * k, lower: 0.08 * k, span: 0.085 * k, forward: 0.035 * k };
  const hind = { s: b.sHip, front: false, upper: 0.075 * k, lower: 0.085 * k, span: 0.095 * k, forward: -0.02 * k };
  return [
    { ...front, side: 1, phase: 0 },
    { ...front, side: -1, phase: 0.5 },
    { ...hind, side: 1, phase: 0.5 },
    { ...hind, side: -1, phase: 0 },
  ];
}

interface Leg {
  def: LegDef;
  foot: THREE.Vector3;
  lift: THREE.Vector3;
  target: THREE.Vector3;
  swinging: boolean;
  upper: THREE.Mesh;
  root: THREE.Mesh;
  knee: THREE.Mesh;
  lower: THREE.Mesh;
  paw: THREE.Group;
}

/**
 * Lateral bending of the trunk: a standing wave with nodes at the shoulders and hips,
 * carried smoothly into the neck and the tail base.
 */
function trunkShape(s: number, b: LizardBuild): number {
  const u = (s - b.sShoulder) / (b.sHip - b.sShoulder);
  if (u < 0) return Math.PI * u * Math.exp(2 * u);
  if (u <= 1) return Math.sin(Math.PI * u);
  const v = u - 1;
  return -Math.PI * v * Math.exp(-2 * v);
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const LEG_TMP = {
  anchor: new THREE.Vector3(), home: new THREE.Vector3(), ankle: new THREE.Vector3(),
  pole: new THREE.Vector3(), joint: new THREE.Vector3(), end: new THREE.Vector3(),
};

const PALM_GEO = new THREE.SphereGeometry(1, 16, 10);
const TOE_GEO = new THREE.CylinderGeometry(0.0014, 0.0026, 1, 6).translate(0, 0.5, 0).rotateX(Math.PI / 2);
const JOINT_GEO = new THREE.SphereGeometry(1, 12, 8);

function buildPaw(mat: THREE.Material, front: boolean, side: number): THREE.Group {
  const paw = new THREE.Group();
  const palm = new THREE.Mesh(PALM_GEO, mat);
  palm.scale.set(front ? 0.011 : 0.013, 0.005, front ? 0.013 : 0.016);
  palm.position.set(0, 0.004, 0.002);
  palm.castShadow = true;
  paw.add(palm);
  // Toes from the inner side to the outer side; the hind 4th toe is the long one.
  const lengths = front ? [0.013, 0.019, 0.023, 0.024, 0.016] : [0.013, 0.021, 0.028, 0.035, 0.02];
  const angles = front ? [-0.95, -0.45, 0, 0.42, 0.95] : [-1.05, -0.55, -0.12, 0.3, 1.05];
  lengths.forEach((len, i) => {
    const a = angles[i] * side;
    const toe = new THREE.Mesh(TOE_GEO, mat);
    toe.rotation.y = a;
    toe.scale.z = len;
    toe.position.set(Math.sin(a) * 0.006, 0.003, Math.cos(a) * 0.006 + 0.004);
    toe.castShadow = true;
    paw.add(toe);
  });
  return paw;
}

/**
 * A procedural lizard, one world unit long. The neck follows the locomotion controls,
 * the trunk and tail follow the neck's path, and the legs step on their own with IK.
 */
export class Lizard extends GroundCreature {
  protected readonly spine: Spine;

  private walkLift = 0;
  private bendAmp = 0;
  private raise = 0;
  private frontLift = 0;
  private pitch = 0;
  private phase = 0.45;
  private stride = 0.2;
  private footArc = 0.022;
  private breathPhase = 0;
  private bobsLeft = 0;
  private bobT = 0;
  private flicksLeft = 0;
  private flickT = 0;
  private tongueExt = 0;
  private blinkT = -1;
  private nextBlink = 2;
  private eyeOpen = 1;

  private readonly frame = makeFrame();
  private readonly tube: Tube;
  private readonly bodyMat: THREE.MeshStandardMaterial;
  private readonly limbMat: THREE.MeshStandardMaterial;
  private readonly eyeMat: THREE.MeshPhysicalMaterial;
  private readonly eyes: THREE.Mesh[];
  private readonly tongue = new THREE.Group();
  private readonly tongueShaft: THREE.Mesh;
  private readonly tongueFork = new THREE.Group();
  private readonly legs: Leg[];

  constructor(skin: SkinPreset, private readonly anisotropy: number, private readonly build: LizardBuild) {
    super();
    const b = build, k = b.scale;
    this.spine = new Spine(b.spine, b.neck, b.length, (s) => (s < b.sHip ? 0.05 : 0.15), 0.45);
    this.bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, bumpScale: 1.2 });
    this.limbMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, bumpMap: limbBump(), bumpScale: 0.6 });
    this.eyeMat = new THREE.MeshPhysicalMaterial({ roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });

    // Rings are denser near the head, where the shape changes fastest.
    const ringS = Array.from({ length: b.rings }, (_, r) => {
      const t = r / (b.rings - 1);
      return 0.45 * t + 0.55 * t * t;
    });
    this.tube = new Tube(ringS, SIDES);
    const body = new THREE.Mesh(this.tube.geometry, this.bodyMat);
    body.castShadow = true;
    body.frustumCulled = false;
    this.group.add(body);

    this.legs = legDefs(b).map((def) => {
      const rUpper = (def.front ? [0.013, 0.009] : [0.017, 0.011]).map((r) => r * k);
      const rLower = (def.front ? [0.009, 0.006] : [0.01, 0.007]).map((r) => r * k);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(rUpper[1], rUpper[0], 1, 12, 1, true), this.limbMat);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(rLower[1], rLower[0], 1, 12, 1, true), this.limbMat);
      const root = new THREE.Mesh(JOINT_GEO, this.limbMat);
      root.scale.setScalar(rUpper[0]);
      const knee = new THREE.Mesh(JOINT_GEO, this.limbMat);
      knee.scale.setScalar(rUpper[1]);
      const paw = buildPaw(this.limbMat, def.front, def.side);
      paw.scale.setScalar(k);
      for (const m of [upper, lower, root, knee]) {
        m.castShadow = true;
        m.frustumCulled = false;
      }
      this.group.add(upper, lower, root, knee, paw);
      return {
        def, upper, lower, root, knee, paw, swinging: false,
        foot: new THREE.Vector3(), lift: new THREE.Vector3(), target: new THREE.Vector3(),
      };
    });

    const eyeGeo = new THREE.SphereGeometry(1, 16, 12);
    this.eyes = [new THREE.Mesh(eyeGeo, this.eyeMat), new THREE.Mesh(eyeGeo, this.eyeMat)];
    this.group.add(...this.eyes);

    const tongueMat = new THREE.MeshStandardMaterial({ color: '#c2405a', roughness: 0.4 });
    this.tongueShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, 1, 6), tongueMat);
    for (const a of [-0.4, 0.4]) {
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0016, 0.014, 5).translate(0, 0.007, 0), tongueMat);
      tine.rotation.z = a;
      this.tongueFork.add(tine);
    }
    this.tongue.add(this.tongueShaft, this.tongueFork);
    this.tongue.visible = false;
    this.group.add(this.tongue);

    this.setSkin(skin);
    this.teleport(0, 0, rand(0, TAU));
  }

  setSkin(skin: SkinPreset): void {
    const { map, bump } = skinTextures(skin, this.build, this.anisotropy);
    this.bodyMat.map = map;
    this.bodyMat.bumpMap = bump;
    this.bodyMat.needsUpdate = true;
    this.limbMat.color.set(skin.limb);
    this.eyeMat.color.set(skin.eye);
  }

  fidget(): void {
    this.flickTongue();
  }

  display(): number {
    const bobs = 2 + Math.floor(Math.random() * 3);
    this.bobsLeft = bobs;
    this.bobT = 0;
    return bobs * BOB_TIME;
  }

  flickTongue(count = 1 + Math.floor(Math.random() * 3)): void {
    if (this.flicksLeft > 0) return;
    this.flicksLeft = count;
    this.flickT = 0;
  }

  forEachSample(fn: SampleFn): void {
    const n = this.spine.count, b = this.build;
    for (let j = 0; j < n; j += 2) {
      const s = j / (n - 1);
      const p = this.spine.frames[j].pos;
      fn(p.x, p.z, b.halfWidth(s), p.y + b.halfHeight(s) * (1 + BELLY));
    }
    for (const leg of this.legs) fn(leg.knee.position.x, leg.knee.position.z, 0.016, leg.knee.position.y + 0.012);
  }

  /** Frees GPU resources; shared geometries and textures are kept. */
  dispose(): void {
    const shared = new Set<unknown>([PALM_GEO, TOE_GEO, JOINT_GEO]);
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && !shared.has(o.geometry)) o.geometry.dispose();
    });
    for (const m of [this.bodyMat, this.limbMat, this.eyeMat, this.tongueShaft.material as THREE.Material]) m.dispose();
    this.group.removeFromParent();
  }

  protected halfWidthAt(s: number): number {
    return this.build.halfWidth(s);
  }

  update(dt: number): void {
    this.time += dt;
    this.locomote(dt, MOTION);
    this.express(dt);
    this.spine.follow(this.pos, this.heading, this.lookYaw);
    this.advanceGait(dt);
    this.composeSpine();
    const breath = 0.03 * Math.sin(this.breathPhase);
    const b = this.build, chest = b.sShoulder, belly = b.sHip;
    this.tube.update(
      this.spine,
      (s) => b.halfWidth(s) * (1 + breath * smoothstep(chest - 0.02, chest + 0.05, s) * smoothstep(belly + 0.02, belly - 0.08, s)),
      b.halfHeight,
      BELLY,
    );
    this.updateLegs();
    this.updateHead();
  }

  /** Posture, head bobs, breathing, blinking and tongue flicks. */
  private express(dt: number): void {
    this.walkLift += (Math.min(1, this.speed / 1.2) - this.walkLift) * damp(5, dt);
    const bendTarget = Math.min(this.speed / 2.5, 1) * 0.03 + Math.min(Math.abs(this.turnRate) * 0.004, 0.01);
    this.bendAmp += (bendTarget - this.bendAmp) * damp(6, dt);
    this.raise += (this.raiseTarget - this.raise) * damp(4, dt);

    let bob = 0;
    if (this.bobsLeft > 0) {
      this.bobT += dt;
      const n = this.bobT / BOB_TIME;
      if (n >= this.bobsLeft) this.bobsLeft = 0;
      else {
        const f = n % 1;
        bob = f < 0.3 ? smoothstep(0, 0.3, f) : f < 0.45 ? 1 : 1 - smoothstep(0.45, 1, f);
      }
    }
    this.frontLift = Math.max(this.raise * 0.5, bob);
    this.pitch = 0.04 + this.frontLift * 0.28;
    this.breathPhase += dt * TAU * (0.5 + this.arousal * 1.3);

    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blinkT = 0;
      this.nextBlink = rand(2.5, 7);
    }
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const t = this.blinkT;
      this.eyeOpen = t < 0.07 ? 1 - t / 0.07 : t < 0.16 ? (t - 0.07) / 0.09 : 1;
      if (t >= 0.16) this.blinkT = -1;
    }

    this.tongueExt = 0;
    if (this.flicksLeft > 0) {
      this.flickT += dt;
      if (this.flickT >= FLICK_TIME) {
        this.flickT -= FLICK_TIME;
        this.flicksLeft--;
      }
      const f = this.flickT;
      if (this.flicksLeft > 0) this.tongueExt = f < 0.07 ? f / 0.07 : f < 0.12 ? 1 : f < 0.22 ? 1 - (f - 0.12) / 0.1 : 0;
    }
  }

  private advanceGait(dt: number): void {
    const moveRate = this.speed + Math.abs(this.turnRate) * 0.1;
    this.stride = Math.min(0.2 + 0.03 * this.speed, 0.28) * this.build.scale;
    if (moveRate > 0.05) {
      // Capped so a slow frame can never skip a whole swing.
      this.phase += Math.min(0.3, (dt * moveRate) / this.stride);
    } else {
      // Standing still: finish the current steps, then rest with all four feet down.
      const rest = this.phase < 0.4 ? 0.4 : this.phase < 0.5 ? this.phase : this.phase < 0.9 ? 0.9 : this.phase;
      this.phase = Math.min(rest, this.phase + dt * 3.5);
    }
    this.phase %= 1;
    this.footArc = (0.022 + 0.014 * Math.min(this.speed / 3, 1)) * this.build.scale;
  }

  /** Undulation, tail motion and posture on top of the simulated chain. */
  private composeSpine(): void {
    const b = this.build, k = b.scale, L = b.length;
    const wave = Math.sin(TAU * (this.phase - 0.15));
    const tailAmp = this.bendAmp * 1.3;
    const clearance = (0.003 + this.walkLift * 0.012) * k;
    const front = this.frontLift * 0.045 * k;
    const pitch = Math.sin(this.pitch);
    const seg = this.spine.seg, neck = b.neck;

    this.spine.compose(
      (s) =>
        this.bendAmp * k * wave * trunkShape(s, b) +
        tailAmp * Math.sin(TAU * this.phase - 7 * (s - b.sHip) * L) * smoothstep(b.sHip, 0.75, s) +
        this.tailTwitch * 0.03 * Math.sin(this.time * 16 - s * 12 * L) * smoothstep(0.75, 1, s),
      (s, j) =>
        clearance * smoothstep(0.9, 0.5, s) +
        front * smoothstep(b.sHip, b.sShoulder - 0.03 / L, s) +
        (j < neck ? (neck - j) * seg * pitch : 0),
    );
  }

  private updateLegs(): void {
    const { anchor, home, ankle, pole, joint, end } = LEG_TMP;
    for (const leg of this.legs) {
      const def = leg.def;
      const f = this.spine.sample(def.s, this.frame);
      const w = this.build.halfWidth(def.s), h = this.build.halfHeight(def.s);
      const n = Math.hypot(f.tan.x, f.tan.z) || 1;
      const fx = f.tan.x / n, fz = f.tan.z / n;
      const sx = fz * def.side, sz = -fx * def.side;

      anchor.set(f.pos.x, f.pos.y + h * BELLY, f.pos.z)
        .addScaledVector(f.side, def.side * w * 0.72)
        .addScaledVector(f.up, -h * 0.15);
      home.set(anchor.x + sx * def.span + fx * def.forward, 0, anchor.z + sz * def.span + fz * def.forward);

      if (this.resetFeet) {
        leg.foot.copy(home);
        leg.swinging = false;
      }

      const fph = (this.phase + def.phase) % 1;
      if (fph < SWING) {
        if (!leg.swinging) {
          leg.swinging = true;
          leg.lift.copy(leg.foot);
        }
        const t = fph / SWING;
        const reach = 0.3 * this.stride * Math.min(1, this.speed / 0.3 + 0.2);
        leg.target.set(home.x + fx * reach, 0, home.z + fz * reach);
        leg.foot.lerpVectors(leg.lift, leg.target, smoothstep(0, 1, t));
        leg.foot.y = this.footArc * Math.sin(Math.PI * t);
      } else if (leg.swinging) {
        leg.swinging = false;
        leg.foot.set(leg.target.x, 0, leg.target.z);
        if (this.speed > 0.25) this.onFootfall?.(Math.min(1, this.speed / 3), leg.foot.x);
      } else if (leg.foot.distanceToSquared(home) > 0.09) {
        leg.foot.copy(home);
      }

      ankle.set(leg.foot.x, leg.foot.y + 0.006 * this.build.scale, leg.foot.z);
      // Sprawling posture: elbows point back and up, knees forward and up.
      pole.set(sx, 0.9, sz).addScaledVector(tmpA.set(fx, 0, fz), def.front ? -0.5 : 0.5);
      solveTwoBone(anchor, ankle, def.upper, def.lower, pole, joint, end);
      placeSegment(leg.upper, anchor, joint);
      placeSegment(leg.lower, joint, end);
      leg.root.position.copy(anchor);
      leg.knee.position.copy(joint);
      leg.paw.position.set(end.x, end.y - 0.006 * this.build.scale, end.z);
      leg.paw.rotation.y = Math.atan2(fx, fz) + def.side * (def.front ? 0.5 : 1.15);
    }
    this.resetFeet = false;
  }

  private updateHead(): void {
    const b = this.build;
    const f = this.spine.sample(b.sEye, this.frame);
    const w = b.halfWidth(b.sEye), h = b.halfHeight(b.sEye);
    const r = EYE_RADIUS * b.scale;
    tmpQ.setFromRotationMatrix(tmpM.makeBasis(f.side, f.up, f.tan));
    this.eyes.forEach((eye, i) => {
      const side = i === 0 ? 1 : -1;
      eye.position.set(f.pos.x, f.pos.y + h * BELLY, f.pos.z)
        .addScaledVector(f.side, side * w * 0.72)
        .addScaledVector(f.up, h * 0.45);
      eye.quaternion.copy(tmpQ);
      eye.scale.set(r, r * Math.max(0.08, this.eyeOpen), r);
    });
    tmpA.set(f.pos.x, f.pos.y + h * BELLY + h * 0.95, f.pos.z).addScaledVector(f.tan, -w * 0.3);
    placeHead(this.head, tmpA, f.side, f.up, f.tan, w * 2.2);

    this.tongue.visible = this.tongueExt > 0.001;
    if (!this.tongue.visible) return;
    const tip = this.spine.sample(0, this.frame);
    const droop = 0.18 + Math.sin(this.time * 60) * 0.12;
    const dir = tmpA.copy(tip.tan).multiplyScalar(Math.cos(droop)).addScaledVector(tip.up, -Math.sin(droop));
    const x = tmpB.copy(tip.side).addScaledVector(dir, -tip.side.dot(dir)).normalize();
    const z = tmpC.crossVectors(x, dir);
    this.tongue.quaternion.setFromRotationMatrix(tmpM.makeBasis(x, dir, z));
    this.tongue.position.set(tip.pos.x, tip.pos.y + b.halfHeight(0.01) * BELLY * 0.5, tip.pos.z);
    this.tongue.scale.setScalar(b.scale);
    const len = this.tongueExt * 0.075;
    this.tongueShaft.scale.set(1, len, 1);
    this.tongueShaft.position.y = len / 2;
    this.tongueFork.position.y = len;
  }
}
