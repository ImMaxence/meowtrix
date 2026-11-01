import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import { damp, rand, smoothstep, TAU } from '../math';
import { banded, type Variant } from '../variant';
import { Hopper, type HopStyle } from './hopper';

export interface GrasshopperColors extends Variant {
  body: string;
  wings: string;
  legs: string;
  eye: string;
}

const hopper = (c: Omit<GrasshopperColors, 'swatch'>): GrasshopperColors => ({ ...c, swatch: banded(c.body, c.wings, c.legs) });

export const GRASSHOPPER_COLORS: readonly GrasshopperColors[] = [
  hopper({ id: 'green', body: '#6fae3a', wings: '#55863a', legs: '#86c04e', eye: '#7a5a32' }),
  hopper({ id: 'brown', body: '#8d6c43', wings: '#6c5234', legs: '#a07c4c', eye: '#3a2a1c' }),
  hopper({ id: 'pink', body: '#e58aa8', wings: '#c9708e', legs: '#ee9fb8', eye: '#6a2a3a' }),
];

const STYLE: HopStyle = {
  length: 0.26, width: 0.04,
  // Head, body, abdomen, and the big hind knees raised on each side.
  shape: [[0.09, 0, 0.03, 0.06], [0, 0, 0.035, 0.08], [-0.08, 0, 0.03, 0.05], [-0.07, 0.035, 0.025, 0.08]],
  minHop: 0.06, maxHop: 1.5, perSpeed: 0.36,
  airTime: [0.12, 0.26], arc: 0.42, rest: [0.3, 1.4],
};

const SCALE = STYLE.length;
const SPHERE = new THREE.SphereGeometry(1, 16, 10);
const LIMB = new THREE.CylinderGeometry(0.7, 1, 1, 6);
const ANTENNA_POINTS = 8;

/** Leg joints for side +1 (model units, nose toward +z): hip, knee, foot. Hind legs fold or kick. */
const LEGS = [
  { hip: [0.05, 0.09, 0.28], knee: [0.13, 0.1, 0.36], foot: [0.16, 0, 0.42], r: 0.014 },
  { hip: [0.06, 0.08, 0.18], knee: [0.16, 0.09, 0.16], foot: [0.2, 0, 0.12], r: 0.014 },
] as const;
const HIND = {
  hip: [0.06, 0.1, 0.1],
  knee: [0.13, 0.27, -0.3],
  fold: [0.14, 0.0, 0.02],
  kick: [0.16, 0.04, -0.78],
} as const;

const v3 = (a: readonly number[], side: number, out: THREE.Vector3) => out.set(a[0] * side, a[1], a[2]);
const hip = new THREE.Vector3(), knee = new THREE.Vector3(), foot = new THREE.Vector3(), tA = new THREE.Vector3();

/**
 * A grasshopper: sits motionless, then springs away in a long arc, kicking out its big hind legs
 * and flicking its wings; rubs its legs to chirp.
 */
export class Grasshopper extends Hopper {
  protected readonly style = STYLE;
  private readonly model = new THREE.Group();
  private readonly legs: { side: number; pair: number; femur: THREE.Mesh; tibia: THREE.Mesh }[] = [];
  private readonly hindLegs: { side: number; femur: THREE.Mesh; tibia: THREE.Mesh }[] = [];
  private readonly wings: THREE.Mesh[] = [];
  private readonly antennae: THREE.Line[] = [];
  private readonly materials: THREE.Material[] = [];
  private chirpLeft = 0;
  private twitch = 0;
  private wingOpen = 0;

  constructor(colors: GrasshopperColors) {
    super();
    const body = new THREE.MeshPhysicalMaterial({ color: colors.body, roughness: 0.5, clearcoat: 0.3 });
    const wing = new THREE.MeshPhysicalMaterial({ color: colors.wings, roughness: 0.6, clearcoat: 0.2 });
    const legMat = new THREE.MeshPhysicalMaterial({ color: colors.legs, roughness: 0.5, clearcoat: 0.3 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: colors.eye, roughness: 0.2, clearcoat: 1 });
    this.materials.push(body, wing, legMat, eyeMat);

    const part = (mat: THREE.Material, s: readonly [number, number, number], p: readonly [number, number, number]) => {
      const m = new THREE.Mesh(SPHERE, mat);
      m.scale.set(...s);
      m.position.set(...p);
      m.castShadow = true;
      this.model.add(m);
      return m;
    };
    part(body, [0.075, 0.1, 0.09], [0, 0.13, 0.38]);
    part(body, [0.09, 0.085, 0.12], [0, 0.13, 0.24]);
    part(body, [0.075, 0.075, 0.32], [0, 0.11, -0.12]);
    for (const side of [1, -1] as const) {
      part(eyeMat, [0.035, 0.05, 0.04], [side * 0.06, 0.16, 0.41]);
      const w = part(wing, [0.04, 0.012, 0.34], [side * 0.03, 0.19, -0.08]);
      w.userData.side = side;
      this.wings.push(w);

      LEGS.forEach((_, pair) => {
        const femur = new THREE.Mesh(LIMB, legMat), tibia = new THREE.Mesh(LIMB, legMat);
        femur.castShadow = tibia.castShadow = true;
        this.model.add(femur, tibia);
        this.legs.push({ side, pair, femur, tibia });
      });
      const femur = new THREE.Mesh(LIMB, legMat), tibia = new THREE.Mesh(LIMB, legMat);
      femur.castShadow = tibia.castShadow = true;
      this.model.add(femur, tibia);
      this.hindLegs.push({ side, femur, tibia });

      const antenna = new THREE.Line(
        new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(ANTENNA_POINTS * 3), 3)),
        new THREE.LineBasicMaterial({ color: colors.legs }),
      );
      antenna.position.set(side * 0.03, 0.19, 0.44);
      antenna.userData.side = side;
      antenna.frustumCulled = false;
      this.antennae.push(antenna);
      this.model.add(antenna);
    }

    this.model.add(this.head);
    this.head.position.set(0, 0.22, 0.37);
    this.head.scale.setScalar(0.17);

    this.model.scale.setScalar(SCALE);
    this.group.add(this.model);
    this.teleport(0, 0, rand(0, TAU));
  }

  /** Antennae twitch. */
  fidget(): void {
    this.twitch = 1;
  }

  /** Rubs its hind legs against its wings (the chirp is the brain's call). */
  display(): number {
    this.chirpLeft = rand(0.8, 1.6);
    return this.chirpLeft + 0.2;
  }

  protected pose(dt: number): void {
    this.chirpLeft = Math.max(0, this.chirpLeft - dt);
    this.twitch = Math.max(0, this.twitch - dt * 2);
    const t = this.hopT;
    const kick = t < 0 ? 0 : Math.sin(Math.PI * Math.min(1, t * 1.6));
    const long = t >= 0 && this.speed > 2;
    this.wingOpen += ((long && t > 0.1 && t < 0.85 ? 1 : 0) - this.wingOpen) * damp(18, dt);
    this.model.position.y = this.height;
    this.model.rotation.x = t < 0 ? -0.06 - this.raiseTarget * 0.08 : -Math.atan(this.slope) * 0.7;

    for (const w of this.wings) {
      const side = w.userData.side as number;
      w.rotation.set(0, side * this.wingOpen * 0.5, side * this.wingOpen * (0.6 + 0.3 * Math.sin(this.time * 90)));
      w.position.y = 0.19 + this.wingOpen * 0.02;
    }

    for (const leg of this.legs) {
      const L = LEGS[leg.pair];
      v3(L.hip, leg.side, hip);
      v3(L.knee, leg.side, knee);
      v3(L.foot, leg.side, foot);
      if (t >= 0) foot.y += 0.05 * kick;
      this.segment(leg.femur, hip, knee, L.r);
      this.segment(leg.tibia, knee, foot, L.r * 0.8);
    }
    const chirp = this.chirpLeft > 0 ? 0.06 * Math.sin(this.time * 60) : 0;
    for (const leg of this.hindLegs) {
      v3(HIND.hip, leg.side, hip);
      v3(HIND.knee, leg.side, knee);
      knee.y += chirp - kick * 0.06;
      knee.z += kick * 0.1;
      v3(HIND.fold, leg.side, foot).lerp(v3(HIND.kick, leg.side, tA), kick);
      this.segment(leg.femur, hip, knee, 0.036);
      this.segment(leg.tibia, knee, foot, 0.013);
    }

    for (const antenna of this.antennae) {
      const side = antenna.userData.side as number;
      const p = antenna.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < ANTENNA_POINTS; k++) {
        const f = k / (ANTENNA_POINTS - 1);
        const ang = side * (0.35 + 0.2 * f + this.twitch * 0.3 * Math.sin(this.time * 20 + side));
        p.setXYZ(k, Math.sin(ang) * f * 0.5, 0.08 * f - smoothstep(0.5, 1, f) * 0.04, Math.cos(ang) * f * 0.5);
      }
      p.needsUpdate = true;
    }
  }

  private segment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number): void {
    placeSegment(mesh, a, b);
    mesh.scale.x = mesh.scale.z = r;
  }

  dispose(): void {
    for (const a of this.antennae) {
      a.geometry.dispose();
      (a.material as THREE.Material).dispose();
    }
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
