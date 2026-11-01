import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import { smoothstep, TAU } from '../math';
import { banded, type Variant } from '../variant';
import type { FlightStyle, FlyerBody, FlyerPose } from './flyer';

export interface FlyColors extends Variant {
  thorax: string;
  abdomen: string;
  eyes: string;
  /** Metallic sheen of the abdomen (bottle flies). */
  metal: number;
}

const fly = (c: Omit<FlyColors, 'swatch'>): FlyColors => ({ ...c, swatch: banded(c.abdomen, c.eyes, c.thorax) });

export const FLY_COLORS: readonly FlyColors[] = [
  fly({ id: 'green', thorax: '#25272a', abdomen: '#1d6b4c', eyes: '#7a1f14', metal: 0.6 }),
  fly({ id: 'blue', thorax: '#22252c', abdomen: '#22408a', eyes: '#6a1a12', metal: 0.6 }),
  fly({ id: 'house', thorax: '#4a4844', abdomen: '#6b6256', eyes: '#8a3a1c', metal: 0 }),
];

export const FLY_STYLE: FlightStyle = {
  speed: [1.2, 2.2], wobble: 0.45, altitude: [0.25, 0.75], hover: 0.2,
  flightTime: [3, 9], walkTime: [2, 7], walkSpeed: 0.25, stepTime: [0.1, 0.4], pauseTime: [0.3, 1.2], stepTurn: 1.6,
  groomChance: 0.35, groomTime: [1, 2.5], scare: [0.4, 0.25], awayFear: 0.85, callRate: 0,
};

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

/** A fly: buzzing wings, legs tucked in flight, front legs rubbing together when grooming. */
export class FlyBody implements FlyerBody {
  readonly group = new THREE.Group();
  readonly heads: readonly THREE.Object3D[] = [new THREE.Object3D()];
  readonly airPitch = -0.15;
  private flapPhase = 0;
  private readonly wings: THREE.Object3D[] = [];
  private readonly legs: { side: number; pair: number; femur: THREE.Mesh; tibia: THREE.Mesh }[] = [];
  private readonly materials: THREE.Material[];

  constructor(colors: FlyColors) {
    const dark = new THREE.MeshStandardMaterial({ color: colors.thorax, roughness: 0.55 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: colors.eyes, roughness: 0.25, clearcoat: 1 });
    const bellyMat = new THREE.MeshPhysicalMaterial({
      color: colors.abdomen, metalness: colors.metal, roughness: colors.metal ? 0.3 : 0.6,
      iridescence: colors.metal ? 1 : 0, iridescenceIOR: 1.6,
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
    const head = this.heads[0];
    head.position.set(0, 0.47, 0.42);
    head.scale.setScalar(0.3);
    this.group.add(head);

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
  }

  pose(p: FlyerPose, dt: number): void {
    const g = p.ground, air = 1 - g;
    this.flapPhase += dt * TAU * 31;
    for (const pivot of this.wings) {
      const side = pivot.userData.side as number;
      pivot.rotation.y = side * (1.13 * g + 0.35 * air);
      pivot.rotation.z = side * air * (0.4 + 0.7 * Math.sin(this.flapPhase));
    }

    for (const leg of this.legs) {
      const L = LEGS[leg.pair];
      const tripod = (leg.pair + (leg.side > 0 ? 0 : 1)) % 2;
      const step = p.walking ? 0.05 * Math.sin(p.walkPhase + tripod * Math.PI) : 0;
      v(L.hip, leg.side, hip);
      v(L.knee, leg.side, knee).lerp(v(L.tuckKnee, leg.side, tA), air);
      v(L.foot, leg.side, foot).lerp(v(L.tuckFoot, leg.side, tB), air);
      foot.z += step;
      if (leg.pair === 0 && p.grooming >= 0) {
        // Front legs rub against each other in front of the head.
        const rub = 0.04 * Math.sin(p.time * 22) * leg.side;
        const k = smoothstep(0, 0.3, p.grooming);
        tC.set(leg.side * 0.04 + rub, 0.24, 0.62);
        foot.lerp(tC, k);
        knee.lerp(tC.set(leg.side * 0.16, 0.42, 0.46), k);
      }
      placeSegment(leg.femur, hip, knee);
      placeSegment(leg.tibia, knee, foot);
    }
  }

  dispose(): void {
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
