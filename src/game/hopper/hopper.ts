import * as THREE from 'three';
import { capsuleDistance, Creature, type SampleFn } from '../creature';
import { clamp, rand, wrapAngle } from '../math';

/** How an animal hops. Distances in world units, times in seconds. */
export interface HopStyle {
  /** Body length, and half width for hit tests. */
  length: number;
  width: number;
  /** Hop length: shortest, longest, and per unit of the speed the brain asks for. */
  minHop: number;
  maxHop: number;
  perSpeed: number;
  /** Time in the air: base plus per unit of distance. */
  airTime: readonly [number, number];
  /** Peak height as a fraction of the hop length. */
  arc: number;
  /** Turning on the spot between hops (rad/s). */
  turnRate: number;
  /** Pause between hops when calm; a scared animal barely pauses. */
  rest: readonly [number, number];
}

/**
 * A Creature that moves in hops (frog, grasshopper): it turns on the spot, then leaps toward
 * where the brain wants it to go, farther when it is in a hurry.
 */
export abstract class Hopper extends Creature {
  /** 0..1 through the current hop, or -1 when sitting. */
  protected hopT = -1;
  /** Height of the body above the ground. */
  protected height = 0;
  private hopDur = 0;
  private hopLength = 0;
  private hopPeak = 0;
  private readonly from = new THREE.Vector2();
  private cooldown = 0;

  protected abstract readonly style: HopStyle;
  /** Poses the model for the current hop, look and gestures. */
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
    const s = this.style, fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    for (const k of [-0.35, 0, 0.35]) {
      fn(this.pos.x + fx * k * s.length, this.pos.y + fz * k * s.length, s.width, this.height + s.width * 0.9);
    }
  }

  update(dt: number): void {
    this.time += dt;
    const s = this.style;
    if (this.hopT >= 0) {
      this.hopT = Math.min(1, this.hopT + dt / this.hopDur);
      const d = this.hopLength * this.hopT;
      this.pos.set(this.from.x + Math.sin(this.heading) * d, this.from.y + Math.cos(this.heading) * d);
      this.height = 4 * this.hopPeak * this.hopT * (1 - this.hopT);
      this.speed = this.hopLength / this.hopDur;
      if (this.hopT >= 1) {
        this.hopT = -1;
        this.height = 0;
        this.speed = 0;
        const hurry = clamp(this.targetSpeed / 2, 0, 1);
        this.cooldown = rand(s.rest[0], s.rest[1]) * (1 - hurry * 0.9);
        this.onFootfall?.(Math.min(1, this.hopLength / s.maxHop), this.pos.x);
      }
    } else {
      this.speed = 0;
      this.cooldown -= dt;
      this.turn(dt, s.turnRate);
      const aligned = Math.abs(wrapAngle(this.targetHeading - this.heading)) < 0.5;
      if (this.targetSpeed > 0.05 && this.cooldown <= 0 && aligned) this.leap();
    }
    this.lookYaw += (clamp(this.lookTarget, -0.5, 0.5) - this.lookYaw) * Math.min(1, dt * 8);
    this.group.position.set(this.pos.x, 0, this.pos.y);
    this.group.rotation.y = this.heading;
    this.pose(dt);
  }

  private leap(): void {
    const s = this.style;
    this.hopLength = clamp(this.targetSpeed * s.perSpeed, s.minHop, s.maxHop);
    this.hopDur = s.airTime[0] + s.airTime[1] * this.hopLength;
    this.hopPeak = this.hopLength * s.arc;
    this.from.copy(this.pos);
    this.hopT = 0;
  }
}
