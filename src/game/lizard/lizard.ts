import * as THREE from 'three';
import { clamp, damp, rand, smoothstep, TAU, wrapAngle } from '../math';
import { BELLY, S_EYE, S_HIP, S_SHOULDER, halfHeight, halfWidth } from './profile';
import { limbBump, skinTextures, type SkinPreset } from './skin';

/** Simulated spine points from snout (0) to tail tip. */
const SPINE = 64;
const SEG = 1 / (SPINE - 1);
/** The neck point is the one driven by locomotion; points before it form the rigid head. */
const NECK = 8;
/** Rendered cross-sections and vertices per cross-section. */
const RINGS = 96;
const SIDES = 20;
/** Fraction of a gait cycle each foot spends in the air. */
const SWING = 0.4;
const BOB_TIME = 0.42;
const FLICK_TIME = 0.3;
const EYE_RADIUS = 0.0135;

const UP = new THREE.Vector3(0, 1, 0);
const COS = Array.from({ length: SIDES + 1 }, (_, k) => Math.cos((k / SIDES) * TAU));
const SIN = Array.from({ length: SIDES + 1 }, (_, k) => Math.sin((k / SIDES) * TAU));

interface Frame {
  pos: THREE.Vector3;
  /** Points toward the head. */
  tan: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
}

const makeFrame = (): Frame => ({
  pos: new THREE.Vector3(), tan: new THREE.Vector3(), side: new THREE.Vector3(), up: new THREE.Vector3(),
});

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

const FRONT = { s: S_SHOULDER, front: true, upper: 0.065, lower: 0.08, span: 0.085, forward: 0.035 } as const;
const HIND = { s: S_HIP, front: false, upper: 0.075, lower: 0.085, span: 0.095, forward: -0.02 } as const;

const LEG_DEFS: LegDef[] = [
  { ...FRONT, side: 1, phase: 0 },
  { ...FRONT, side: -1, phase: 0.5 },
  { ...HIND, side: 1, phase: 0.5 },
  { ...HIND, side: -1, phase: 0 },
];

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
function trunkShape(s: number): number {
  const u = (s - S_SHOULDER) / (S_HIP - S_SHOULDER);
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
const NEAREST = new THREE.Vector2();
const LEG_TMP = {
  anchor: new THREE.Vector3(), home: new THREE.Vector3(), ankle: new THREE.Vector3(),
  pole: new THREE.Vector3(), joint: new THREE.Vector3(), end: new THREE.Vector3(),
};

/** Two-bone IK: places the joint between `root` and `target`, bending toward `pole`. */
function solveTwoBone(
  root: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3,
  joint: THREE.Vector3, end: THREE.Vector3,
): void {
  const dir = tmpA.subVectors(target, root);
  const dist = clamp(dir.length(), Math.abs(l1 - l2) + 1e-4, (l1 + l2) * 0.999);
  dir.normalize();
  end.copy(root).addScaledVector(dir, dist);
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const perp = tmpB.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (perp.lengthSq() < 1e-10) perp.copy(UP);
  perp.normalize();
  joint.copy(root).addScaledVector(dir, l1 * cosA).addScaledVector(perp, l1 * sinA);
}

/** Stretches a unit-height, Y-aligned mesh between two points. */
function placeSegment(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const dir = tmpC.subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.multiplyScalar(1 / (len || 1)));
  mesh.scale.set(1, len, 1);
}

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
export class Lizard {
  readonly group = new THREE.Group();

  /** Neck position on the ground (x, z). */
  readonly neck = new THREE.Vector2();
  heading = 0;
  speed = 0;
  turnRate = 0;

  // Controls, set by the brain.
  targetSpeed = 0;
  targetHeading = 0;
  /** Head yaw relative to the body, in radians. */
  lookTarget = 0;
  /** 0..1: raises the front of the body (alert posture). */
  raiseTarget = 0;
  /** 0..1: twitching tail tip. */
  tailTwitch = 0;
  /** 0..1: breathing faster when scared. */
  arousal = 0;
  /** 0..1: extra turning speed for escape turns, decays on its own. */
  turnBoost = 0;

  onFootfall: ((intensity: number, x: number) => void) | null = null;

  private time = 0;
  private lookYaw = 0;
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
  private resetFeet = true;

  private readonly chain = Array.from({ length: SPINE }, () => new THREE.Vector2());
  private readonly spine = Array.from({ length: SPINE }, makeFrame);
  private readonly ringS = new Float32Array(RINGS);
  private readonly frame = makeFrame();

  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly bodyMat: THREE.MeshStandardMaterial;
  private readonly limbMat: THREE.MeshStandardMaterial;
  private readonly eyeMat: THREE.MeshPhysicalMaterial;
  private readonly eyes: THREE.Mesh[];
  private readonly tongue = new THREE.Group();
  private readonly tongueShaft: THREE.Mesh;
  private readonly tongueFork = new THREE.Group();
  private readonly legs: Leg[];

  constructor(skin: SkinPreset, private readonly anisotropy: number) {
    this.bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, bumpScale: 1.2 });
    this.limbMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, bumpMap: limbBump(), bumpScale: 0.6 });
    this.eyeMat = new THREE.MeshPhysicalMaterial({ roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });

    // Body tube: rings are denser near the head, where the shape changes fastest.
    const verts = RINGS * (SIDES + 1);
    this.positions = new Float32Array(verts * 3);
    this.normals = new Float32Array(verts * 3);
    const uvs = new Float32Array(verts * 2);
    const index: number[] = [];
    for (let r = 0; r < RINGS; r++) {
      const t = r / (RINGS - 1);
      const s = 0.45 * t + 0.55 * t * t;
      this.ringS[r] = s;
      for (let k = 0; k <= SIDES; k++) {
        const i = r * (SIDES + 1) + k;
        uvs[i * 2] = s;
        uvs[i * 2 + 1] = k / SIDES;
        if (r < RINGS - 1 && k < SIDES) {
          const next = i + SIDES + 1;
          index.push(i, next, i + 1, next, next + 1, i + 1);
        }
      }
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(index);

    const body = new THREE.Mesh(this.geometry, this.bodyMat);
    body.castShadow = true;
    body.frustumCulled = false;
    this.group.add(body);

    this.legs = LEG_DEFS.map((def) => {
      const rUpper = def.front ? [0.013, 0.009] : [0.017, 0.011];
      const rLower = def.front ? [0.009, 0.006] : [0.01, 0.007];
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(rUpper[1], rUpper[0], 1, 12, 1, true), this.limbMat);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(rLower[1], rLower[0], 1, 12, 1, true), this.limbMat);
      const root = new THREE.Mesh(JOINT_GEO, this.limbMat);
      root.scale.setScalar(rUpper[0]);
      const knee = new THREE.Mesh(JOINT_GEO, this.limbMat);
      knee.scale.setScalar(rUpper[1]);
      const paw = buildPaw(this.limbMat, def.front, def.side);
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
    const { map, bump } = skinTextures(skin, this.anisotropy);
    this.bodyMat.map = map;
    this.bodyMat.bumpMap = bump;
    this.bodyMat.needsUpdate = true;
    this.limbMat.color.set(skin.limb);
    this.eyeMat.color.set(skin.eye);
  }

  /** Places the lizard, stretched out straight behind its neck. */
  teleport(x: number, z: number, heading: number): void {
    this.neck.set(x, z);
    this.heading = this.targetHeading = heading;
    this.speed = this.targetSpeed = 0;
    this.lookYaw = this.lookTarget = 0;
    const bx = -Math.sin(heading), bz = -Math.cos(heading);
    for (let i = NECK; i < SPINE; i++) this.chain[i].set(x + bx * (i - NECK) * SEG, z + bz * (i - NECK) * SEG);
    this.resetFeet = true;
  }

  headBob(count: number): void {
    this.bobsLeft = count;
    this.bobT = 0;
  }

  flickTongue(count = 1 + Math.floor(Math.random() * 3)): void {
    if (this.flicksLeft > 0) return;
    this.flicksLeft = count;
    this.flickT = 0;
  }

  get isBobbing(): boolean {
    return this.bobsLeft > 0;
  }

  /** X of the middle of the body, for stereo panning. */
  get bodyX(): number {
    return this.spine[20].pos.x;
  }

  /** Approximate distance from a ground point to the body surface (negative inside). */
  distanceTo(x: number, z: number): number {
    return this.nearest(x, z, NEAREST);
  }

  /** Like distanceTo, and writes the closest spine point (x, z) into `out`. */
  nearest(x: number, z: number, out: THREE.Vector2): number {
    let best = Infinity;
    for (let j = 0; j < SPINE; j += 2) {
      const p = this.spine[j].pos;
      const d = Math.hypot(p.x - x, p.z - z) - halfWidth(j * SEG);
      if (d < best) {
        best = d;
        out.set(p.x, p.z);
      }
    }
    return best;
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

  update(dt: number): void {
    this.time += dt;
    this.locomote(dt);
    this.express(dt);
    this.simulateChain();
    this.advanceGait(dt);
    this.composeSpine();
    this.updateBody();
    this.updateLegs();
    this.updateHead();
  }

  private locomote(dt: number): void {
    const accel = this.targetSpeed > this.speed ? 12 : 9;
    this.speed += (this.targetSpeed - this.speed) * damp(accel, dt);
    if (this.speed < 0.002) this.speed = 0;
    const maxTurn = 0.9 + 3.2 * Math.min(this.speed, 2.5) + this.turnBoost * 8;
    this.turnBoost = Math.max(0, this.turnBoost - dt * 2.5);
    const step = clamp(wrapAngle(this.targetHeading - this.heading), -maxTurn * dt, maxTurn * dt);
    this.heading = wrapAngle(this.heading + step);
    this.turnRate = dt > 0 ? step / dt : 0;
    this.neck.x += Math.sin(this.heading) * this.speed * dt;
    this.neck.y += Math.cos(this.heading) * this.speed * dt;
  }

  /** Posture, head bobs, breathing, blinking and tongue flicks. */
  private express(dt: number): void {
    this.lookYaw += (clamp(this.lookTarget, -0.55, 0.55) - this.lookYaw) * damp(10, dt);
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

  /** Rigid head ahead of the neck; trunk and tail follow the neck with limited bending. */
  private simulateChain(): void {
    const c = this.chain;
    const hd = this.heading + this.lookYaw;
    const hx = Math.sin(hd), hz = Math.cos(hd);
    for (let i = 0; i < NECK; i++) c[i].set(this.neck.x + hx * (NECK - i) * SEG, this.neck.y + hz * (NECK - i) * SEG);
    c[NECK].copy(this.neck);

    let px = -Math.sin(this.heading), pz = -Math.cos(this.heading);
    for (let i = NECK + 1; i < SPINE; i++) {
      const prev = c[i - 1], cur = c[i];
      let dx = cur.x - prev.x, dz = cur.y - prev.y;
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) {
        dx = px;
        dz = pz;
      } else {
        dx /= len;
        dz /= len;
      }
      const s = i * SEG;
      const maxBend = i === NECK + 1 ? 0.45 : s < S_HIP ? 0.05 : 0.15;
      const angle = Math.atan2(px * dz - pz * dx, px * dx + pz * dz);
      if (Math.abs(angle) > maxBend) {
        const a = Math.sign(angle) * maxBend;
        const ca = Math.cos(a), sa = Math.sin(a);
        dx = px * ca - pz * sa;
        dz = px * sa + pz * ca;
      }
      cur.set(prev.x + dx * SEG, prev.y + dz * SEG);
      px = dx;
      pz = dz;
    }
  }

  private advanceGait(dt: number): void {
    const moveRate = this.speed + Math.abs(this.turnRate) * 0.1;
    this.stride = Math.min(0.2 + 0.03 * this.speed, 0.28);
    if (moveRate > 0.05) {
      // Capped so a slow frame can never skip a whole swing.
      this.phase += Math.min(0.3, (dt * moveRate) / this.stride);
    } else {
      // Standing still: finish the current steps, then rest with all four feet down.
      const rest = this.phase < 0.4 ? 0.4 : this.phase < 0.5 ? this.phase : this.phase < 0.9 ? 0.9 : this.phase;
      this.phase = Math.min(rest, this.phase + dt * 3.5);
    }
    this.phase %= 1;
    this.footArc = 0.022 + 0.014 * Math.min(this.speed / 3, 1);
  }

  /** Adds undulation, tail motion and posture on top of the simulated chain. */
  private composeSpine(): void {
    const wave = Math.sin(TAU * (this.phase - 0.15));
    const tailAmp = this.bendAmp * 1.3;
    const clearance = 0.003 + this.walkLift * 0.012;
    const front = this.frontLift * 0.045;
    const pitch = Math.sin(this.pitch);

    for (let j = 0; j < SPINE; j++) {
      const a = this.chain[Math.max(j - 1, 0)], b = this.chain[Math.min(j + 1, SPINE - 1)];
      let tx = a.x - b.x, tz = a.y - b.y;
      const n = Math.hypot(tx, tz) || 1;
      tx /= n;
      tz /= n;
      const s = j * SEG;
      const off =
        this.bendAmp * wave * trunkShape(s) +
        tailAmp * Math.sin(TAU * this.phase - 7 * (s - S_HIP)) * smoothstep(S_HIP, 0.75, s) +
        this.tailTwitch * 0.03 * Math.sin(this.time * 16 - s * 12) * smoothstep(0.75, 1, s);
      const y =
        clearance * smoothstep(0.9, 0.5, s) +
        front * smoothstep(S_HIP, S_SHOULDER - 0.03, s) +
        (j < NECK ? (NECK - j) * SEG * pitch : 0);
      this.spine[j].pos.set(this.chain[j].x + tz * off, y, this.chain[j].y - tx * off);
    }

    for (let j = 0; j < SPINE; j++) {
      const f = this.spine[j];
      f.tan.subVectors(this.spine[Math.max(j - 1, 0)].pos, this.spine[Math.min(j + 1, SPINE - 1)].pos).normalize();
      f.side.crossVectors(UP, f.tan).normalize();
      f.up.crossVectors(f.tan, f.side);
    }
  }

  /** Interpolates a spine frame at body position s. `pos.y` is the belly height. */
  private sample(s: number, out: Frame): Frame {
    const f = clamp(s, 0, 1) * (SPINE - 1);
    const j = Math.min(Math.floor(f), SPINE - 2);
    const t = f - j;
    const a = this.spine[j], b = this.spine[j + 1];
    out.pos.lerpVectors(a.pos, b.pos, t);
    out.tan.lerpVectors(a.tan, b.tan, t).normalize();
    out.side.crossVectors(UP, out.tan).normalize();
    out.up.crossVectors(out.tan, out.side);
    return out;
  }

  private updateBody(): void {
    const breath = 0.03 * Math.sin(this.breathPhase);
    const pos = this.positions;
    for (let r = 0; r < RINGS; r++) {
      const s = this.ringS[r];
      const f = this.sample(s, this.frame);
      const w = halfWidth(s) * (1 + breath * smoothstep(0.15, 0.22, s) * smoothstep(0.42, 0.32, s));
      const h = halfHeight(s);
      const cx = f.pos.x, cy = f.pos.y + h * BELLY, cz = f.pos.z;
      for (let k = 0; k <= SIDES; k++) {
        const sx = COS[k] * w;
        const sy = SIN[k] >= 0 ? SIN[k] * h : SIN[k] * h * BELLY;
        const o = (r * (SIDES + 1) + k) * 3;
        pos[o] = cx + f.side.x * sx + f.up.x * sy;
        pos[o + 1] = cy + f.side.y * sx + f.up.y * sy;
        pos[o + 2] = cz + f.side.z * sx + f.up.z * sy;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // The first and last vertex of each ring coincide: share their normal to hide the seam.
    const nrm = this.normals;
    for (let r = 0; r < RINGS; r++) {
      const a = r * (SIDES + 1) * 3, b = a + SIDES * 3;
      const x = nrm[a] + nrm[b], y = nrm[a + 1] + nrm[b + 1], z = nrm[a + 2] + nrm[b + 2];
      const l = Math.hypot(x, y, z) || 1;
      nrm[a] = nrm[b] = x / l;
      nrm[a + 1] = nrm[b + 1] = y / l;
      nrm[a + 2] = nrm[b + 2] = z / l;
    }
  }

  private updateLegs(): void {
    const { anchor, home, ankle, pole, joint, end } = LEG_TMP;
    for (const leg of this.legs) {
      const def = leg.def;
      const f = this.sample(def.s, this.frame);
      const w = halfWidth(def.s), h = halfHeight(def.s);
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

      ankle.set(leg.foot.x, leg.foot.y + 0.006, leg.foot.z);
      // Sprawling posture: elbows point back and up, knees forward and up.
      pole.set(sx, 0.9, sz).addScaledVector(tmpA.set(fx, 0, fz), def.front ? -0.5 : 0.5);
      solveTwoBone(anchor, ankle, def.upper, def.lower, pole, joint, end);
      placeSegment(leg.upper, anchor, joint);
      placeSegment(leg.lower, joint, end);
      leg.root.position.copy(anchor);
      leg.knee.position.copy(joint);
      leg.paw.position.set(end.x, end.y - 0.006, end.z);
      leg.paw.rotation.y = Math.atan2(fx, fz) + def.side * (def.front ? 0.5 : 1.15);
    }
    this.resetFeet = false;
  }

  private updateHead(): void {
    const f = this.sample(S_EYE, this.frame);
    const w = halfWidth(S_EYE), h = halfHeight(S_EYE);
    tmpQ.setFromRotationMatrix(tmpM.makeBasis(f.side, f.up, f.tan));
    this.eyes.forEach((eye, i) => {
      const side = i === 0 ? 1 : -1;
      eye.position.set(f.pos.x, f.pos.y + h * BELLY, f.pos.z)
        .addScaledVector(f.side, side * w * 0.72)
        .addScaledVector(f.up, h * 0.45);
      eye.quaternion.copy(tmpQ);
      eye.scale.set(EYE_RADIUS, EYE_RADIUS * Math.max(0.08, this.eyeOpen), EYE_RADIUS);
    });

    this.tongue.visible = this.tongueExt > 0.001;
    if (!this.tongue.visible) return;
    const tip = this.sample(0, this.frame);
    const droop = 0.18 + Math.sin(this.time * 60) * 0.12;
    const dir = tmpA.copy(tip.tan).multiplyScalar(Math.cos(droop)).addScaledVector(tip.up, -Math.sin(droop));
    const x = tmpB.copy(tip.side).addScaledVector(dir, -tip.side.dot(dir)).normalize();
    const z = tmpC.crossVectors(x, dir);
    this.tongue.quaternion.setFromRotationMatrix(tmpM.makeBasis(x, dir, z));
    this.tongue.position.set(tip.pos.x, tip.pos.y + halfHeight(0.01) * BELLY * 0.5, tip.pos.z);
    const len = this.tongueExt * 0.075;
    this.tongueShaft.scale.set(1, len, 1);
    this.tongueShaft.position.y = len / 2;
    this.tongueFork.position.y = len;
  }
}
