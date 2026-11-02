import * as THREE from 'three';
import { rand, TAU } from './math';

/** Particles per burst, and how many bursts can be in the air at once. */
const N = 20;
const SLOTS = 3;
const LIFE = 0.6;
const GRAVITY = 3;

/** A little puff of sparks where a paw lands on an animal: something for the human to see. */
export class Burst {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly vel = new Float32Array(SLOTS * N * 3);
  private readonly age = new Float32Array(SLOTS).fill(LIFE);

  constructor() {
    this.pos = new Float32Array(SLOTS * N * 3).fill(-50);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.PointsMaterial({
      color: '#fff3b0', size: 0.055, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
  }

  spawn(x: number, y: number, z: number): void {
    // The oldest burst gives way.
    let slot = 0;
    for (let i = 1; i < SLOTS; i++) if (this.age[i] > this.age[slot]) slot = i;
    this.age[slot] = 0;
    for (let i = 0; i < N; i++) {
      const o = (slot * N + i) * 3;
      const a = rand(0, TAU), up = rand(0.3, 1), speed = rand(0.5, 1.5);
      const flat = Math.sqrt(1 - up * up) * speed;
      this.pos[o] = x;
      this.pos[o + 1] = y + 0.03;
      this.pos[o + 2] = z;
      this.vel[o] = Math.sin(a) * flat;
      this.vel[o + 1] = up * speed * 1.4;
      this.vel[o + 2] = Math.cos(a) * flat;
    }
  }

  update(dt: number): void {
    let moving = false;
    for (let slot = 0; slot < SLOTS; slot++) {
      if (this.age[slot] >= LIFE) continue;
      this.age[slot] += dt;
      const done = this.age[slot] >= LIFE;
      moving = true;
      for (let i = 0; i < N; i++) {
        const o = (slot * N + i) * 3;
        if (done) {
          this.pos[o + 1] = -50;
          continue;
        }
        this.vel[o + 1] -= GRAVITY * dt;
        this.pos[o] += this.vel[o] * dt;
        this.pos[o + 1] = Math.max(0.005, this.pos[o + 1] + this.vel[o + 1] * dt);
        this.pos[o + 2] += this.vel[o + 2] * dt;
      }
    }
    if (moving) this.points.geometry.attributes.position.needsUpdate = true;
  }
}
