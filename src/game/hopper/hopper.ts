import * as THREE from 'three';
import { capsuleDistance, Creature, type SampleFn } from '../creature';
import { clamp, rand, smoothstep, wrapAngle } from '../math';

/** How an animal hops. Distances in world units, times in seconds. */
export interface HopStyle {
  /** Body length, and half width for hit tests. */
  length: number;
  width: number;
  /**
   * Points covering the body when sitting, so leaves drape over all of it:
   * forward, sideways (mirrored on both sides when not 0), radius and height of the top.
   */
  shape: readonly (readonly [forward: number, side: number, radius: number, top: number])[];
  /** Hop length: shortest, longest, and per unit of the speed the brain asks for. */
  minHop: number;
  maxHop: number;
  perSpeed: number;
  /** Time in the air: base plus per unit of distance. */
  airTime: readonly [number, number];
  /** Peak height as a fraction of the hop length. */
  arc: number;
  /** Pause between hops when calm; a scared animal barely pauses. */
  rest: readonly [number, number];
}

/** Largest turn made during one hop; more takes a little turning hop on the spot. */
const TURN_PER_HOP = 0.9;

/**
 * A Creature that moves in hops (frog, grasshopper). It never slides or spins on the spot:
 * it turns while in the air, with small turning hops when it needs to face another way,
 * and leaps farther when it is in a hurry.
 */
export abstract class Hopper extends Creature {
  /** 0..1 through the current hop, or -1 when sitting. */
  protected hopT = -1;
  /** Height of the body above the ground, and slope of the jump (up > 0). */
  protected height = 0;
  protected slope = 0;
  /** Seconds since landing, for the little squash. */
  protected sinceLanding = 1;
  private hopDur = 0;
  private hopLength = 0;
  private hopPeak = 0;
  private turnFrom = 0;
  private turnBy = 0;
  /** The current hop only turns the animal around: the next one follows quickly. */
  private turning = false;
  private readonly from = new THREE.Vector2();
  private cooldown = 0;

  protected abstract readonly style: HopStyle;
  /** Poses the model for the current hop and gestures. */
  protected abstract pose(dt: number): void;

  get bodyX(): number {
    return this.pos.x;
  }

  teleport(x: number, z: number, heading: number): void {
    this.pos.set(x, z);
    this.heading = this.targetHeading = heading;
    this.speed = this.targetSpeed = 0;
    this.hopT = -1;
    this.height = 0;
  }

  nearest(x: number, z: number, out: THREE.Vector2): number {
    const s = this.style;
    return capsuleDistance(x, z, this.pos.x, this.pos.y, this.heading, s.length * 0.3, s.width, out);
  }

  forEachSample(fn: SampleFn): void {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    for (const [f, side, r, top] of this.style.shape) {
      for (const sd of side ? [side, -side] : [0]) {
        fn(this.pos.x + fx * f + fz * sd, this.pos.y + fz * f - fx * sd, r, this.height + top);
      }
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.sinceLanding += dt;
    if (this.hopT >= 0) {
      this.hopT = Math.min(1, this.hopT + dt / this.hopDur);
      const t = this.hopT;
      const d = this.hopLength * t;
      this.heading = wrapAngle(this.turnFrom + this.turnBy * smoothstep(0, 0.8, t));
      // Straight line from where it took off, along the mean heading of the hop.
      const h = this.turnFrom + this.turnBy * 0.5;
      this.pos.set(this.from.x + Math.sin(h) * d, this.from.y + Math.cos(h) * d);
      this.height = 4 * this.hopPeak * t * (1 - t);
      this.slope = (4 * this.hopPeak * (1 - 2 * t)) / Math.max(this.hopLength, 0.05);
      this.speed = this.hopLength / this.hopDur;
      if (t >= 1) this.land();
    } else {
      this.speed = 0;
      this.cooldown -= dt;
      if (this.cooldown <= 0 && this.targetSpeed > 0.05) this.leap(wrapAngle(this.targetHeading - this.heading));
    }
    this.group.position.set(this.pos.x, 0, this.pos.y);
    this.group.rotation.y = this.heading;
    this.pose(dt);
  }

  private land(): void {
    const s = this.style;
    this.hopT = -1;
    this.height = 0;
    this.slope = 0;
    this.speed = 0;
    this.sinceLanding = 0;
    const hurry = clamp(this.targetSpeed / 2, 0, 1);
    this.cooldown = this.turning ? 0.08 : rand(s.rest[0], s.rest[1]) * (1 - hurry * 0.85);
    this.onFootfall?.(Math.min(1, this.hopLength / s.maxHop), this.pos.x);
  }

  /** Leaps toward the target; facing far away, it first makes a small turning hop. */
  private leap(off: number): void {
    const s = this.style;
    const turning = Math.abs(off) > TURN_PER_HOP;
    this.turning = turning;
    this.turnFrom = this.heading;
    this.turnBy = clamp(off, -TURN_PER_HOP, TURN_PER_HOP);
    this.hopLength = turning ? s.minHop * 0.6 : clamp(this.targetSpeed * s.perSpeed, s.minHop, s.maxHop);
    this.hopDur = s.airTime[0] + s.airTime[1] * this.hopLength;
    this.hopPeak = this.hopLength * s.arc + (turning ? s.length * 0.08 : 0);
    this.from.copy(this.pos);
    this.hopT = 0;
  }
}
