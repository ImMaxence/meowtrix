import * as THREE from 'three';
import type { Cover } from '../covers';
import { chance, clamp, damp, rand, TAU, wrapAngle } from '../math';
import type { Bounds } from '../world';

export interface FlyerHabitat {
  readonly bounds: Bounds;
  readonly covers: readonly Cover[];
  readonly speedFactor: number;
  /** 0 … 1: near the end of a session, flyers land more and stop leaving the screen (see Habitat). */
  readonly tired: number;
}

/** The sound of one flyer: a buzz or a flutter while flying, and an optional call. */
export interface FlyerSound {
  /** `level` 0..1 (0 = landed), `pitch` around 1, `pan` -1..1. */
  update(level: number, pitch: number, pan: number): void;
  /** A chirp now and then while landed, or an alarm call when it takes off scared. */
  call?(pan: number, alarm: boolean): void;
  dispose(): void;
}

/** What the body needs to pose its wings, legs and head. */
export interface FlyerPose {
  /** 1 landed … 0 flying. */
  ground: number;
  /** Taking a step right now, and the step cycle. */
  walking: boolean;
  walkPhase: number;
  /** Seconds into grooming (or pecking), -1 otherwise. */
  grooming: number;
  /** Horizontal speed and climb rate. */
  speed: number;
  climb: number;
  time: number;
}

export interface FlyerBody {
  readonly group: THREE.Group;
  /** Outfit anchors (see Dressable). */
  readonly heads: readonly THREE.Object3D[];
  /** Pitch of the body in flight. */
  readonly airPitch: number;
  pose(p: FlyerPose, dt: number): void;
  dispose(): void;
}

/** How a flyer behaves. Speeds in world units per second, times in seconds. */
export interface FlightStyle {
  speed: readonly [number, number];
  /** Erratic wobble across the flight path (a fly zigzags, a bird flies straight). */
  wobble: number;
  altitude: readonly [number, number];
  /** Chance of hovering on the spot for a moment. */
  hover: number;
  flightTime: readonly [number, number];
  walkTime: readonly [number, number];
  walkSpeed: number;
  /** Walking bursts and pauses between them, and how much it turns between bursts. */
  stepTime: readonly [number, number];
  pauseTime: readonly [number, number];
  stepTurn: number;
  groomChance: number;
  groomTime: readonly [number, number];
  /** Distance at which something scares it, landed and flying. */
  scare: readonly [number, number];
  /** Fear above which it leaves the screen for a while. */
  awayFear: number;
  /** Calls per second while landed. */
  callRate: number;
}

type State = 'fly' | 'land' | 'walk' | 'groom' | 'away';

const tA = new THREE.Vector3(), tB = new THREE.Vector3();

/**
 * An animal that flies around and lands (fly, ladybird, bird): flights between random points,
 * landings on open ground, walking or hopping, grooming or pecking, and escapes when something
 * comes near. The look comes from its FlyerBody.
 */
export class Flyer {
  /** Position; y is the altitude. */
  readonly pos = new THREE.Vector3();
  fear = 0;

  private readonly vel = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private heading = rand(0, TAU);
  private state: State = 'walk';
  private t = 0;
  private dur = 0;
  private retarget = 0;
  private speed = 1.5;
  private boost = 0;
  private ground = 1;
  private moveLeft = 0;
  private pauseLeft = 0;
  private walkPhase = 0;
  private hiddenLeft = 0;
  /** A visitor on its way home: once off screen, it stays there (see gone). */
  private leaving = false;
  private readonly seed = rand(0, 100);
  private readonly poseInfo: FlyerPose = { ground: 1, walking: false, walkPhase: 0, grooming: -1, speed: 0, climb: 0, time: 0 };

  constructor(
    private readonly habitat: FlyerHabitat,
    private readonly body: FlyerBody,
    private readonly style: FlightStyle,
    private readonly sound: FlyerSound,
  ) {
    body.group.rotation.order = 'YXZ';
    this.placeOnGround();
  }

  get group(): THREE.Group {
    return this.body.group;
  }

  get heads(): readonly THREE.Object3D[] {
    return this.body.heads;
  }

  /** A visitor: starts off screen and flies in. */
  arrive(): void {
    this.reenter();
  }

  /** A visitor going home: flies off screen for good (see gone). */
  leave(): void {
    this.leaving = true;
    if (this.state !== 'away') {
      this.go('away');
      this.boost = 0.8;
    }
  }

  /** Off screen, after leave(). */
  get gone(): boolean {
    return this.leaving && !this.group.visible;
  }

  /** Taking off or flying: used to keep the microphone from hearing the buzz. */
  get buzzing(): boolean {
    return this.ground < 0.9 && this.group.visible;
  }

  /** Something touched the screen; (x, z) is the touch projected at the flyer's altitude. */
  touch(x: number, z: number): void {
    if (!this.group.visible) return;
    const d = Math.hypot(this.pos.x - x, this.pos.z - z);
    const [landed, flying] = this.style.scare;
    if (this.isLanded() ? d < landed : d < flying) {
      this.fear = Math.min(1, this.fear + (d < 0.08 ? 0.45 : 0.25));
      this.escape(x, z);
    }
  }

  pointer(x: number, z: number, speed: number): void {
    if (!this.group.visible || speed < 0.5) return;
    const d = Math.hypot(this.pos.x - x, this.pos.z - z);
    const [landed, flying] = this.style.scare;
    if (d < (this.isLanded() ? landed * 0.75 : flying * 0.8)) this.escape(x, z);
  }

  noise(level: 1 | 2): void {
    if (this.isLanded() && (level === 2 || chance(0.3))) {
      this.escape(this.pos.x + rand(-1, 1), this.pos.z + rand(-1, 1));
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.fear = Math.max(0, this.fear - dt * 0.06);
    this.boost = Math.max(0, this.boost - dt);

    switch (this.state) {
      case 'fly': this.flyAround(dt); break;
      case 'land': this.land(dt); break;
      case 'walk': this.walk(dt); break;
      case 'groom': this.groom(); break;
      case 'away': this.away(dt); break;
    }
    if (this.isLanded() && this.group.visible && chance(this.style.callRate * dt)) this.sound.call?.(this.pan(), false);

    const flying = this.state === 'fly' || this.state === 'away' || (this.state === 'land' && this.pos.y > 0.02);
    this.ground += ((flying ? 0 : 1) - this.ground) * damp(flying ? 12 : 6, dt);
    this.pose(dt);

    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.sound.update(this.group.visible ? 1 - this.ground : 0, 1 + 0.12 * Math.min(hSpeed / 2.5, 1) + 0.06 * this.vel.y, this.pan());
  }

  dispose(): void {
    this.sound.dispose();
    this.body.dispose();
  }

  private pan(): number {
    const b = this.habitat.bounds;
    const half = (b.maxX - b.minX) / 2 || 1;
    return clamp((this.pos.x - (b.minX + b.maxX) / 2) / half, -1, 1) * 0.85;
  }

  private isLanded(): boolean {
    return this.state === 'walk' || this.state === 'groom' || (this.state === 'land' && this.pos.y < 0.1);
  }

  private go(state: State): void {
    const s = this.style;
    this.state = state;
    this.t = 0;
    switch (state) {
      case 'fly':
        this.dur = rand(s.flightTime[0], s.flightTime[1]);
        this.retarget = 0;
        break;
      case 'walk':
        this.dur = rand(s.walkTime[0], s.walkTime[1]);
        this.moveLeft = 0;
        this.pauseLeft = rand(s.pauseTime[0], s.pauseTime[1]);
        break;
      case 'groom':
        this.dur = rand(s.groomTime[0], s.groomTime[1]);
        break;
      case 'away':
        this.pickExit();
        this.hiddenLeft = 0;
        break;
      case 'land':
        break;
    }
  }

  private escape(x: number, z: number): void {
    const wasLanded = this.isLanded();
    if (this.fear > this.style.awayFear && this.habitat.tired < 0.5) {
      if (wasLanded) this.sound.call?.(this.pan(), true);
      this.go('away');
      this.boost = 0.8;
      return;
    }
    if (wasLanded) this.sound.call?.(this.pan(), true);
    let dx = this.pos.x - x, dz = this.pos.z - z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const dist = rand(1, 1.8);
    const [lo, hi] = this.style.altitude;
    this.target.set(this.pos.x + dx * dist + rand(-0.4, 0.4), rand(lo + 0.1, hi), this.pos.z + dz * dist + rand(-0.4, 0.4));
    this.clampInside(this.target, 0.2);
    this.vel.y = Math.max(this.vel.y, 1.2);
    this.boost = 0.7;
    this.go('fly');
    this.retarget = rand(0.5, 0.9);
  }

  /** Flight between random points, sometimes hovering. */
  private flyAround(dt: number): void {
    const s = this.style;
    this.retarget -= dt;
    if (this.retarget <= 0 || this.pos.distanceTo(this.target) < 0.2) {
      if (chance(s.hover)) {
        this.target.copy(this.pos).add(tA.set(rand(-0.08, 0.08), rand(-0.05, 0.05), rand(-0.08, 0.08)));
        this.speed = 0.3;
        this.retarget = rand(0.4, 1);
      } else {
        const b = this.habitat.bounds;
        this.target.set(rand(b.minX, b.maxX), rand(s.altitude[0], s.altitude[1]), rand(b.minZ, b.maxZ));
        this.clampInside(this.target, 0.2);
        this.speed = rand(s.speed[0], s.speed[1]);
        this.retarget = rand(0.4, 1.5) / Math.max(s.wobble * 2, 0.5);
      }
    }
    this.steer(dt, this.target, this.speed * (this.boost > 0 ? 1.8 : 1));
    this.pos.y = clamp(this.pos.y, 0.05, s.altitude[1] + 0.2);
    if (this.t > this.dur * (1 - 0.6 * this.habitat.tired) && this.boost <= 0) this.pickLanding();
  }

  private land(dt: number): void {
    const d = this.pos.distanceTo(this.target);
    this.steer(dt, this.target, Math.min(this.style.speed[0], d * 2.5 + 0.1));
    if (this.pos.y < 0.015 && Math.hypot(this.pos.x - this.target.x, this.pos.z - this.target.z) < 0.06) {
      this.pos.y = 0;
      this.vel.set(0, 0, 0);
      this.go('walk');
    }
  }

  /** Steps (or hops) in bursts, turning between them. */
  private walk(dt: number): void {
    const s = this.style;
    if (this.moveLeft > 0) {
      this.moveLeft -= dt;
      const sp = s.walkSpeed * this.habitat.speedFactor;
      this.pos.x += Math.sin(this.heading) * sp * dt;
      this.pos.z += Math.cos(this.heading) * sp * dt;
      this.walkPhase += dt * TAU * 2.2;
      if (this.moveLeft <= 0) this.pauseLeft = rand(s.pauseTime[0], s.pauseTime[1]);
    } else {
      this.pauseLeft -= dt;
      if (this.pauseLeft <= 0) {
        this.heading += rand(-s.stepTurn, s.stepTurn);
        this.moveLeft = rand(s.stepTime[0], s.stepTime[1]);
      }
    }
    // Walking off screen: turn back toward the middle.
    const b = this.habitat.bounds, p = this.pos;
    if (p.x < b.minX + 0.15 || p.x > b.maxX - 0.15 || p.z < b.minZ + 0.15 || p.z > b.maxZ - 0.15) {
      this.heading = Math.atan2((b.minX + b.maxX) / 2 - p.x, (b.minZ + b.maxZ) / 2 - p.z);
    }
    if (this.t > this.dur * (1 + 2 * this.habitat.tired)) {
      if (chance(s.groomChance)) this.go('groom');
      else this.takeOff();
    }
  }

  private groom(): void {
    if (this.t > this.dur) {
      if (chance(0.5)) this.go('walk');
      else this.takeOff();
    }
  }

  private away(dt: number): void {
    if (this.hiddenLeft > 0) {
      this.hiddenLeft -= dt;
      if (this.hiddenLeft <= 0) this.reenter();
      return;
    }
    this.steer(dt, this.target, this.style.speed[1] * 1.2);
    const b = this.habitat.bounds, p = this.pos;
    if (Math.max(b.minX - p.x, p.x - b.maxX, b.minZ - p.z, p.z - b.maxZ) > 0.6) {
      this.group.visible = false;
      this.hiddenLeft = this.leaving ? Infinity : rand(3, 8) * (1 - 0.7 * this.habitat.tired);
    }
  }

  private takeOff(): void {
    const s = this.style, b = this.habitat.bounds;
    this.target.set(rand(b.minX, b.maxX), rand(s.altitude[0] + 0.05, s.altitude[1]), rand(b.minZ, b.maxZ));
    this.clampInside(this.target, 0.2);
    this.vel.y = 0.9;
    this.speed = rand(s.speed[0], s.speed[1]);
    this.go('fly');
    this.retarget = rand(0.4, 1.2);
  }

  private steer(dt: number, to: THREE.Vector3, speed: number): void {
    const s = speed * this.habitat.speedFactor;
    const desired = tA.subVectors(to, this.pos);
    const d = desired.length();
    if (d > 1e-4) desired.multiplyScalar(s / d);
    // Erratic wobble across the flight path.
    const k = this.t * 1.7 + this.seed;
    desired.add(tB.set(Math.sin(k * 4.3) + Math.sin(k * 7.9), Math.sin(k * 5.1) * 0.5, Math.cos(k * 3.7) + Math.sin(k * 6.3)).multiplyScalar(this.style.wobble * s));
    this.vel.lerp(desired, damp(5, dt));
    this.pos.addScaledVector(this.vel, dt);
    if (Math.hypot(this.vel.x, this.vel.z) > 0.15) {
      const h = Math.atan2(this.vel.x, this.vel.z);
      this.heading += wrapAngle(h - this.heading) * damp(10, dt);
    }
  }

  /** Lands on open ground, never under a leaf or a stone. */
  private pickLanding(): void {
    const b = this.habitat.bounds;
    for (let i = 0; i < 15; i++) {
      this.target.set(rand(b.minX, b.maxX), 0, rand(b.minZ, b.maxZ));
      this.clampInside(this.target, 0.3);
      if (this.habitat.covers.every((c) => c.distanceTo(this.target.x, this.target.z) > c.radius + 0.12)) {
        this.go('land');
        return;
      }
    }
    this.dur += 2;
  }

  private pickExit(): void {
    const b = this.habitat.bounds, p = this.pos;
    const edges: [number, number, number][] = [
      [p.x - b.minX, b.minX - 1, p.z],
      [b.maxX - p.x, b.maxX + 1, p.z],
      [p.z - b.minZ, p.x, b.minZ - 1],
      [b.maxZ - p.z, p.x, b.maxZ + 1],
    ];
    edges.sort((a, c) => a[0] - c[0]);
    this.target.set(edges[0][1], this.style.altitude[1], edges[0][2]);
  }

  private reenter(): void {
    const b = this.habitat.bounds;
    const x = rand(b.minX, b.maxX), z = rand(b.minZ, b.maxZ);
    const edge = Math.floor(Math.random() * 4);
    this.pos.set(edge === 0 ? b.minX - 0.6 : edge === 1 ? b.maxX + 0.6 : x, 0.6, edge === 2 ? b.minZ - 0.6 : edge === 3 ? b.maxZ + 0.6 : z);
    this.vel.set(0, 0, 0);
    this.fear = 0.3;
    this.group.visible = true;
    this.takeOff();
  }

  private placeOnGround(): void {
    const b = this.habitat.bounds;
    this.pos.set(rand(b.minX + 0.3, b.maxX - 0.3), 0, rand(b.minZ + 0.3, b.maxZ - 0.3));
    this.ground = 1;
    this.go('walk');
  }

  private clampInside(p: THREE.Vector3, inset: number): void {
    const b = this.habitat.bounds;
    p.x = clamp(p.x, b.minX + inset, Math.max(b.minX + inset, b.maxX - inset));
    p.z = clamp(p.z, b.minZ + inset, Math.max(b.minZ + inset, b.maxZ - inset));
  }

  /** Body attitude; the body poses its own wings and legs. */
  private pose(dt: number): void {
    const air = 1 - this.ground;
    const turn = wrapAngle(Math.atan2(this.vel.x, this.vel.z) - this.heading);
    this.group.position.copy(this.pos);
    this.group.rotation.set(this.body.airPitch * air + 0.05 * clamp(this.vel.y, -1, 1), this.heading, clamp(turn, -0.5, 0.5) * air);
    const p = this.poseInfo;
    p.ground = this.ground;
    p.walking = this.state === 'walk' && this.moveLeft > 0;
    p.walkPhase = this.walkPhase;
    p.grooming = this.state === 'groom' ? this.t : -1;
    p.speed = Math.hypot(this.vel.x, this.vel.z);
    p.climb = this.vel.y;
    p.time += dt;
    this.body.pose(p, dt);
  }
}
