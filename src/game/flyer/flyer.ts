import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import type { Cover } from '../covers';
import { chance, clamp, damp, rand, smoothstep, TAU, wrapAngle } from '../math';
import type { Bounds } from '../world';

export interface FlyHabitat {
  readonly bounds: Bounds;
  readonly covers: readonly Cover[];
  readonly speedFactor: number;
}

/** The buzz of one fly (see Voice.createBuzz). */
export interface FlySound {
  update(level: number, pitch: number, pan: number): void;
  dispose(): void;
}

type State = 'fly' | 'land' | 'walk' | 'groom' | 'away';

/** Model units → world units: the fly is about 0.15 long (the lizard is 1). */
const SCALE = 0.16;

const SPHERE = new THREE.SphereGeometry(1, 16, 12);
const LEG_GEO = new THREE.CylinderGeometry(0.012, 0.018, 1, 5);
const WING_GEO = (() => {
  const shape = new THREE.Shape();
  shape.absellipse(0.34, 0, 0.34, 0.12, 0, TAU, false, 0);
  return new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2);
})();

/** Rest and tucked (in flight) poses of the legs, per pair from front to back, for side +1. */
const LEGS = [
  { hip: [0.08, 0.26, 0.24], knee: [0.25, 0.36, 0.34], foot: [0.33, 0, 0.42], tuckKnee: [0.18, 0.2, 0.3], tuckFoot: [0.12, 0.12, 0.18] },
  { hip: [0.1, 0.24, 0.12], knee: [0.29, 0.36, 0.13], foot: [0.37, 0, 0.11], tuckKnee: [0.2, 0.18, 0.1], tuckFoot: [0.14, 0.1, -0.02] },
  { hip: [0.08, 0.24, 0.0], knee: [0.26, 0.36, -0.13], foot: [0.34, 0, -0.26], tuckKnee: [0.18, 0.18, -0.12], tuckFoot: [0.12, 0.1, -0.26] },
] as const;

const v = (a: readonly number[], side: number, out: THREE.Vector3) => out.set(a[0] * side, a[1], a[2]);
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3();
const knee = new THREE.Vector3(), foot = new THREE.Vector3(), hip = new THREE.Vector3();

/**
 * A fly: zigzags around the room buzzing, lands, walks in little jerks, rubs its legs,
 * and takes off as soon as something comes near.
 */
export class Fly {
  readonly group = new THREE.Group();
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
  private walkPhase = 0;
  private flapPhase = 0;
  private hiddenLeft = 0;
  private readonly seed = rand(0, 100);
  private readonly wings: THREE.Object3D[] = [];
  private readonly legs: { side: number; pair: number; femur: THREE.Mesh; tibia: THREE.Mesh }[] = [];
  private readonly materials: THREE.Material[];

  constructor(private readonly habitat: FlyHabitat, private readonly sound: FlySound) {
    const dark = new THREE.MeshStandardMaterial({ color: '#25272a', roughness: 0.55 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#7a1f14', roughness: 0.25, clearcoat: 1 });
    const bellyMat = new THREE.MeshPhysicalMaterial({
      color: '#1d6b4c', metalness: 0.6, roughness: 0.3, iridescence: 1, iridescenceIOR: 1.6,
    });
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: '#dde7ef', transparent: true, opacity: 0.38, roughness: 0.2, side: THREE.DoubleSide,
      iridescence: 1, depthWrite: false,
    });
    this.materials = [dark, eyeMat, bellyMat, wingMat];

    const part = (mat: THREE.Material, s: [number, number, number], p: [number, number, number]) => {
      const m = new THREE.Mesh(SPHERE, mat);
      m.scale.set(...s);
      m.position.set(...p);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    part(dark, [0.15, 0.14, 0.14], [0, 0.34, 0.42]);
    part(eyeMat, [0.1, 0.12, 0.1], [0.1, 0.37, 0.44]);
    part(eyeMat, [0.1, 0.12, 0.1], [-0.1, 0.37, 0.44]);
    part(dark, [0.19, 0.18, 0.25], [0, 0.35, 0.12]);
    part(bellyMat, [0.2, 0.15, 0.3], [0, 0.31, -0.3]);

    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.08, 0.48, 0.16);
      pivot.rotation.order = 'ZYX';
      pivot.userData.side = side;
      const wing = new THREE.Mesh(WING_GEO, wingMat);
      wing.scale.x = side;
      pivot.add(wing);
      this.group.add(pivot);
      this.wings.push(pivot);

      LEGS.forEach((_, pair) => {
        const femur = new THREE.Mesh(LEG_GEO, dark);
        const tibia = new THREE.Mesh(LEG_GEO, dark);
        femur.castShadow = tibia.castShadow = true;
        this.group.add(femur, tibia);
        this.legs.push({ side, pair, femur, tibia });
      });
    }

    this.group.scale.setScalar(SCALE);
    this.group.rotation.order = 'YXZ';
    this.placeOnGround();
  }

  /** Taking off or flying: used to keep the microphone from hearing the buzz. */
  get buzzing(): boolean {
    return this.ground < 0.9 && this.group.visible;
  }

  /** Something touched the screen; (x, z) is the touch projected at the fly's altitude. */
  touch(x: number, z: number): void {
    if (!this.group.visible) return;
    const d = Math.hypot(this.pos.x - x, this.pos.z - z);
    if (this.isLanded() ? d < 0.4 : d < 0.25) {
      this.fear = Math.min(1, this.fear + (d < 0.08 ? 0.45 : 0.25));
      this.escape(x, z);
    }
  }

  pointer(x: number, z: number, speed: number): void {
    if (!this.group.visible || speed < 0.5) return;
    const d = Math.hypot(this.pos.x - x, this.pos.z - z);
    if (d < (this.isLanded() ? 0.3 : 0.2)) this.escape(x, z);
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

    const flying = this.state === 'fly' || this.state === 'away' || (this.state === 'land' && this.pos.y > 0.02);
    this.ground += ((flying ? 0 : 1) - this.ground) * damp(flying ? 12 : 6, dt);
    this.pose(dt);

    const b = this.habitat.bounds;
    const half = (b.maxX - b.minX) / 2 || 1;
    const pan = clamp((this.pos.x - (b.minX + b.maxX) / 2) / half, -1, 1) * 0.85;
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.sound.update(this.group.visible ? 1 - this.ground : 0, 1 + 0.12 * Math.min(hSpeed / 2.5, 1) + 0.06 * this.vel.y, pan);
  }

  dispose(): void {
    this.sound.dispose();
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }

  private isLanded(): boolean {
    return this.state === 'walk' || this.state === 'groom' || (this.state === 'land' && this.pos.y < 0.1);
  }

  private go(state: State): void {
    this.state = state;
    this.t = 0;
    switch (state) {
      case 'fly':
        this.dur = rand(3, 9);
        this.retarget = 0;
        break;
      case 'walk':
        this.dur = rand(2, 7);
        this.moveLeft = 0;
        break;
      case 'groom':
        this.dur = rand(1, 2.5);
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
    if (this.fear > 0.85) {
      this.go('away');
      this.boost = 0.8;
      return;
    }
    let dx = this.pos.x - x, dz = this.pos.z - z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const dist = rand(1, 1.8);
    this.target.set(this.pos.x + dx * dist + rand(-0.4, 0.4), rand(0.35, 0.75), this.pos.z + dz * dist + rand(-0.4, 0.4));
    this.clampInside(this.target, 0.2);
    this.vel.y = Math.max(this.vel.y, 1.2);
    this.boost = 0.7;
    this.go('fly');
    this.retarget = rand(0.5, 0.9);
  }

  /** Zigzag flight between random points, sometimes hovering. */
  private flyAround(dt: number): void {
    this.retarget -= dt;
    if (this.retarget <= 0 || this.pos.distanceTo(this.target) < 0.2) {
      if (chance(0.2)) {
        this.target.copy(this.pos).add(tA.set(rand(-0.08, 0.08), rand(-0.05, 0.05), rand(-0.08, 0.08)));
        this.speed = 0.3;
        this.retarget = rand(0.4, 1);
      } else {
        const b = this.habitat.bounds;
        this.target.set(rand(b.minX, b.maxX), rand(0.25, 0.75), rand(b.minZ, b.maxZ));
        this.clampInside(this.target, 0.2);
        this.speed = rand(1.2, 2.2);
        this.retarget = rand(0.4, 1.5);
      }
    }
    this.steer(dt, this.target, this.speed * (this.boost > 0 ? 1.8 : 1));
    this.pos.y = clamp(this.pos.y, 0.05, 0.95);
    if (this.t > this.dur && this.boost <= 0) this.pickLanding();
  }

  private land(dt: number): void {
    const d = this.pos.distanceTo(this.target);
    this.steer(dt, this.target, Math.min(1.4, d * 2.5 + 0.1));
    if (this.pos.y < 0.015 && Math.hypot(this.pos.x - this.target.x, this.pos.z - this.target.z) < 0.06) {
      this.pos.y = 0;
      this.vel.set(0, 0, 0);
      this.go('walk');
    }
  }

  /** Little jerky steps and quick turns on the spot. */
  private walk(dt: number): void {
    this.moveLeft -= dt;
    if (this.moveLeft > 0) {
      const sp = 0.25 * this.habitat.speedFactor;
      this.pos.x += Math.sin(this.heading) * sp * dt;
      this.pos.z += Math.cos(this.heading) * sp * dt;
      this.walkPhase += dt * 14;
    } else if (this.moveLeft < -rand(0.3, 1.2)) {
      this.heading += rand(-1.6, 1.6);
      this.moveLeft = rand(0.1, 0.4);
    }
    if (this.t > this.dur) {
      if (chance(0.35)) this.go('groom');
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
    this.steer(dt, this.target, 2.4);
    const b = this.habitat.bounds, p = this.pos;
    if (Math.max(b.minX - p.x, p.x - b.maxX, b.minZ - p.z, p.z - b.maxZ) > 0.5) {
      this.group.visible = false;
      this.hiddenLeft = rand(3, 8);
    }
  }

  private takeOff(): void {
    const b = this.habitat.bounds;
    this.target.set(rand(b.minX, b.maxX), rand(0.3, 0.7), rand(b.minZ, b.maxZ));
    this.clampInside(this.target, 0.2);
    this.vel.y = 0.9;
    this.speed = rand(1.2, 2);
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
    desired.add(tB.set(Math.sin(k * 4.3) + Math.sin(k * 7.9), Math.sin(k * 5.1) * 0.5, Math.cos(k * 3.7) + Math.sin(k * 6.3)).multiplyScalar(0.45 * s));
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
    this.target.set(edges[0][1], 0.6, edges[0][2]);
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

  /** Body attitude, wings and legs. */
  private pose(dt: number): void {
    const g = this.ground;
    const air = 1 - g;
    const turn = wrapAngle(Math.atan2(this.vel.x, this.vel.z) - this.heading);
    this.group.position.copy(this.pos);
    this.group.rotation.set(-0.15 * air + 0.05 * clamp(this.vel.y, -1, 1), this.heading, clamp(turn, -0.5, 0.5) * air);

    this.flapPhase += dt * TAU * 31;
    for (const pivot of this.wings) {
      const side = pivot.userData.side as number;
      pivot.rotation.y = side * (1.13 * g + 0.35 * air);
      pivot.rotation.z = side * air * (0.4 + 0.7 * Math.sin(this.flapPhase));
    }

    const grooming = this.state === 'groom' ? 1 : 0;
    for (const leg of this.legs) {
      const L = LEGS[leg.pair];
      const tripod = (leg.pair + (leg.side > 0 ? 0 : 1)) % 2;
      const step = this.state === 'walk' && this.moveLeft > 0 ? 0.05 * Math.sin(this.walkPhase + tripod * Math.PI) : 0;
      v(L.hip, leg.side, hip);
      v(L.knee, leg.side, knee).lerp(v(L.tuckKnee, leg.side, tA), air);
      v(L.foot, leg.side, foot).lerp(v(L.tuckFoot, leg.side, tB), air);
      foot.z += step;
      if (leg.pair === 0 && grooming) {
        // Front legs rub against each other in front of the head.
        const rub = 0.04 * Math.sin(this.t * 22) * leg.side;
        tC.set(leg.side * 0.04 + rub, 0.24, 0.62);
        foot.lerp(tC, smoothstep(0, 0.3, this.t));
        knee.lerp(tC.set(leg.side * 0.16, 0.42, 0.46), smoothstep(0, 0.3, this.t));
      }
      placeSegment(leg.femur, hip, knee);
      placeSegment(leg.tibia, knee, foot);
    }
  }
}
