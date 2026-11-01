import * as THREE from 'three';
import type { Spine } from './body/spine';
import { clamp, damp, wrapAngle } from './math';

/** Called with a ground point (x, z), a radius and the height of the top of the body there. */
export type SampleFn = (x: number, z: number, radius: number, top: number) => void;

/**
 * Something that can wear a festive outfit: one anchor per head, at the top of the head,
 * y up and z toward the nose, scaled to the width of the head.
 */
export interface Dressable {
  readonly heads: readonly THREE.Object3D[];
}

/** An animal moving on the ground (or swimming), driven by a Brain. */
export interface Walker extends Dressable {
  readonly group: THREE.Object3D;
  /** Ground position of the steering point (x, z). */
  readonly pos: THREE.Vector2;
  readonly heading: number;
  readonly speed: number;
  /** X of the middle of the body, for stereo panning. */
  readonly bodyX: number;

  targetSpeed: number;
  targetHeading: number;
  /** Head yaw relative to the body, in radians. */
  lookTarget: number;
  /** 0..1: alert posture (front raised). */
  raiseTarget: number;
  /** 0..1: twitching tail tip. */
  tailTwitch: number;
  /** 0..1: breathing faster when scared. */
  arousal: number;
  /** 0..1: extra turning speed for escape turns, decays on its own. */
  turnBoost: number;

  teleport(x: number, z: number, heading: number): void;
  /** Approximate distance from a ground point to the body surface (negative inside). */
  distanceTo(x: number, z: number): number;
  /** Like distanceTo, and writes the closest body point (x, z) into `out`. */
  nearest(x: number, z: number, out: THREE.Vector2): number;
  /** Visits points covering the body, so leaves can drape over it. */
  forEachSample(fn: SampleFn): void;
  /** Small idle gesture: tongue flick (lizard), sniffing (mouse). */
  fidget(): void;
  /** Head-bob display (lizard), rearing up (mouse). Returns its duration in seconds. */
  display(): number;
  update(dt: number): void;
  dispose(): void;
}

export interface Locomotion {
  accel: number;
  decel: number;
  /** Turn rate when standing still, and added per unit of speed (rad/s). */
  turnBase: number;
  turnPerSpeed: number;
  lookLimit: number;
}

/** Shared state and locomotion of the animals driven by a Brain. */
export abstract class Creature implements Walker {
  readonly group = new THREE.Group();
  /** Where an outfit goes; spine bodies move it every frame, rigid ones attach it to their model. */
  readonly head = new THREE.Object3D();
  readonly pos = new THREE.Vector2();
  heading = 0;
  speed = 0;
  turnRate = 0;

  targetSpeed = 0;
  targetHeading = 0;
  lookTarget = 0;
  raiseTarget = 0;
  tailTwitch = 0;
  arousal = 0;
  turnBoost = 0;

  onFootfall: ((intensity: number, x: number) => void) | null = null;

  protected time = 0;
  protected lookYaw = 0;

  abstract readonly bodyX: number;
  abstract teleport(x: number, z: number, heading: number): void;
  abstract nearest(x: number, z: number, out: THREE.Vector2): number;
  abstract forEachSample(fn: SampleFn): void;
  abstract fidget(): void;
  abstract display(): number;
  abstract update(dt: number): void;
  abstract dispose(): void;

  constructor() {
    this.group.add(this.head);
  }

  get heads(): readonly THREE.Object3D[] {
    return [this.head];
  }

  distanceTo(x: number, z: number): number {
    return this.nearest(x, z, NEAREST);
  }

  /** Moves the steering point toward the targets with limited acceleration and turn rate. */
  protected locomote(dt: number, m: Locomotion): void {
    const accel = this.targetSpeed > this.speed ? m.accel : m.decel;
    this.speed += (this.targetSpeed - this.speed) * damp(accel, dt);
    if (this.speed < 0.002) this.speed = 0;
    this.turn(dt, m.turnBase + m.turnPerSpeed * Math.min(this.speed, 2.5));
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.y += Math.cos(this.heading) * this.speed * dt;
    this.lookYaw += (clamp(this.lookTarget, -m.lookLimit, m.lookLimit) - this.lookYaw) * damp(10, dt);
  }

  /** Turns toward the target heading at up to `maxTurn` rad/s, faster during escape turns. */
  protected turn(dt: number, maxTurn: number): void {
    maxTurn += this.turnBoost * 8;
    this.turnBoost = Math.max(0, this.turnBoost - dt * 2.5);
    const step = clamp(wrapAngle(this.targetHeading - this.heading), -maxTurn * dt, maxTurn * dt);
    this.heading = wrapAngle(this.heading + step);
    this.turnRate = dt > 0 ? step / dt : 0;
  }
}

/** A Creature whose body is a Spine: lizards, mammals, fish. */
export abstract class GroundCreature extends Creature {
  protected resetFeet = true;
  protected abstract readonly spine: Spine;
  /** Half width of the body at s, for hit tests. */
  protected abstract halfWidthAt(s: number): number;

  get bodyX(): number {
    return this.spine.frames[Math.round(this.spine.count * 0.3)].pos.x;
  }

  teleport(x: number, z: number, heading: number): void {
    this.pos.set(x, z);
    this.heading = this.targetHeading = heading;
    this.speed = this.targetSpeed = 0;
    this.lookYaw = this.lookTarget = 0;
    this.spine.straighten(x, z, heading);
    this.resetFeet = true;
  }

  nearest(x: number, z: number, out: THREE.Vector2): number {
    let best = Infinity;
    const n = this.spine.count;
    for (let j = 0; j < n; j += 2) {
      const p = this.spine.frames[j].pos;
      const d = Math.hypot(p.x - x, p.z - z) - this.halfWidthAt(j / (n - 1));
      if (d < best) {
        best = d;
        out.set(p.x, p.z);
      }
    }
    return best;
  }
}

/** Distance from (x, z) to a capsule around a rigid body's axis; writes the closest axis point. */
export function capsuleDistance(
  x: number, z: number, cx: number, cz: number, heading: number, halfLength: number, radius: number, out: THREE.Vector2,
): number {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const t = clamp((x - cx) * fx + (z - cz) * fz, -halfLength, halfLength);
  out.set(cx + fx * t, cz + fz * t);
  return Math.hypot(x - out.x, z - out.y) - radius;
}

const NEAREST = new THREE.Vector2();
const HEAD_M = new THREE.Matrix4();

/** Puts a head anchor on top of a spine body: `pos` is the top of the head, the frame gives its orientation. */
export function placeHead(head: THREE.Object3D, pos: THREE.Vector3, side: THREE.Vector3, up: THREE.Vector3, tan: THREE.Vector3, width: number): void {
  head.position.copy(pos);
  head.quaternion.setFromRotationMatrix(HEAD_M.makeBasis(side, up, tan));
  head.scale.setScalar(width);
}
