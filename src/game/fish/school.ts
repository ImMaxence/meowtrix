import * as THREE from 'three';
import { Creature, type Locomotion, type SampleFn } from '../creature';
import { chance, clamp, rand } from '../math';
import { Fish, type Pond } from './fish';
import type { FishBuild, FishColors } from './kinds';

const SIZE = 7;
const LEAD: Locomotion = { accel: 6, decel: 2.5, turnBase: 2.2, turnPerSpeed: 2.2, lookLimit: 0 };

const tmp = new THREE.Vector2();

/**
 * A school of small fish that a Brain drives as one animal: an invisible leader moves, and
 * each fish chases its own place in a loose formation around it, so the school flows and bends.
 */
export class School extends Creature {
  private readonly fish: Fish[] = [];
  /** Each fish's place relative to the leader: sideways, backward, and depth offset. */
  private readonly slots: [number, number, number][] = [];
  private depth: number;
  private nextDepth = 0;

  constructor(private readonly build: FishBuild, colors: FishColors, pond: Pond) {
    super();
    this.depth = rand(build.depth[0], build.depth[1]);
    for (let i = 0; i < SIZE; i++) {
      const f = new Fish(build, colors, pond);
      this.fish.push(f);
      this.group.add(f.group);
      const row = Math.floor((i + 1) / 2);
      this.slots.push([(i % 2 ? 1 : -1) * row * 0.05 + rand(-0.03, 0.03), row * 0.07 + rand(-0.02, 0.02), rand(-0.04, 0.04)]);
    }
  }

  get bodyX(): number {
    return this.pos.x;
  }

  teleport(x: number, z: number, heading: number): void {
    this.pos.set(x, z);
    this.heading = this.targetHeading = heading;
    this.speed = this.targetSpeed = 0;
    this.fish.forEach((f, i) => {
      this.slot(i, tmp);
      f.teleport(tmp.x, tmp.y, heading + rand(-0.3, 0.3));
    });
  }

  nearest(x: number, z: number, out: THREE.Vector2): number {
    let best = Infinity;
    for (const f of this.fish) {
      const d = f.nearest(x, z, tmp);
      if (d < best) {
        best = d;
        out.copy(tmp);
      }
    }
    return best;
  }

  forEachSample(fn: SampleFn): void {
    for (const f of this.fish) f.forEachSample(fn);
  }

  fidget(): void {
    this.fish[Math.floor(Math.random() * SIZE)].fidget();
  }

  /** The school swirls: everyone wiggles. */
  display(): number {
    for (const f of this.fish) if (chance(0.6)) f.fidget();
    return 1;
  }

  update(dt: number): void {
    this.time += dt;
    this.locomote(dt, LEAD);
    this.nextDepth -= dt;
    if (this.nextDepth <= 0) {
      this.depth = rand(this.build.depth[0], this.build.depth[1]);
      this.nextDepth = rand(4, 9);
    }
    const panic = this.speed > 2 ? 1 : 0;
    this.fish.forEach((f, i) => {
      this.slot(i, tmp);
      const dx = tmp.x - f.pos.x, dz = tmp.y - f.pos.y;
      const d = Math.hypot(dx, dz);
      // Head for the slot; once there, match the leader.
      f.targetHeading = d > 0.03 ? Math.atan2(dx, dz) : this.heading;
      f.targetSpeed = clamp(this.speed * 0.9 + d * 5, 0, 4.5);
      if (d < 0.03 && this.speed < 0.05) f.targetSpeed = 0;
      f.turnBoost = Math.max(f.turnBoost, this.turnBoost);
      f.depthOverride = this.depth + this.slots[i][2] * (1 + panic);
      f.arousal = this.arousal;
      f.update(dt);
    });
  }

  dispose(): void {
    for (const f of this.fish) f.dispose();
    this.group.removeFromParent();
  }

  /** World position of fish i's place in the formation, with a slow drift so it never looks rigid. */
  private slot(i: number, out: THREE.Vector2): THREE.Vector2 {
    const [side, behind] = this.slots[i];
    const h = this.heading;
    const drift = 0.02 * Math.sin(this.time * 0.8 + i * 1.7);
    const sx = side * (1 + 0.3 * Math.sin(this.time * 0.5 + i)) + drift, bz = -behind;
    return out.set(this.pos.x + Math.cos(h) * sx + Math.sin(h) * bz, this.pos.y - Math.sin(h) * sx + Math.cos(h) * bz);
  }
}

