import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import type { FlightStyle, FlyerBody, FlyerPose } from '../flyer/flyer';
import { lerp, rand, smoothstep, TAU } from '../math';
import type { Variant } from '../variant';
import { glowSprite } from './glow';

export interface FireflyColors extends Variant {
  /** Colour of the light. */
  light: string;
  shell: string;
  shield: string;
}

const firefly = (c: Omit<FireflyColors, 'swatch'>): FireflyColors =>
  ({ ...c, swatch: `radial-gradient(circle at 50% 55%, #fff 0 8%, ${c.light} 9% 30%, ${c.shell} 62%)` });

export const FIREFLY_COLORS: readonly FireflyColors[] = [
  firefly({ id: 'green', light: '#c6ff3e', shell: '#2e2a24', shield: '#e3a14d' }),
  firefly({ id: 'amber', light: '#ffb238', shell: '#33271d', shield: '#d9874a' }),
  firefly({ id: 'ghost', light: '#72ffe0', shell: '#24282a', shield: '#c9b28a' }),
];

export const FIREFLY_STYLE: FlightStyle = {
  speed: [0.25, 0.55], wobble: 0.3, altitude: [0.2, 0.8], hover: 0.4,
  flightTime: [6, 14], walkTime: [2, 6], walkSpeed: 0.05, stepTime: [0.3, 0.8], pauseTime: [0.5, 2], stepTurn: 1.2,
  groomChance: 0.2, groomTime: [1, 2], scare: [0.35, 0.3], awayFear: 0.92, callRate: 0,
};

/** Model units → world units: about 0.12 long. */
const SCALE = 0.12;

const SPHERE = new THREE.SphereGeometry(1, 14, 10);
const THIN = new THREE.CylinderGeometry(0.012, 0.016, 1, 4);
const CASE = new THREE.SphereGeometry(1, 16, 10, Math.PI / 2, Math.PI, 0, Math.PI / 2);
const WING = (() => {
  const shape = new THREE.Shape();
  shape.absellipse(0.42, 0, 0.42, 0.13, 0, TAU, false, 0);
  return new THREE.ShapeGeometry(shape, 16).rotateX(-Math.PI / 2);
})();
const LEGS = [
  { hip: [0.08, 0.08, 0.22], foot: [0.26, 0, 0.32] },
  { hip: [0.09, 0.08, 0.08], foot: [0.3, 0, 0.06] },
  { hip: [0.08, 0.08, -0.06], foot: [0.27, 0, -0.22] },
] as const;
const tA = new THREE.Vector3(), tB = new THREE.Vector3();

/**
 * A firefly: a dark soft beetle with an orange shield, whose tail lights up in slow flashes,
 * brighter in flight. The wing cases lift and the wings buzz when it flies.
 */
export class FireflyBody implements FlyerBody {
  readonly group = new THREE.Group();
  readonly heads: readonly THREE.Object3D[] = [new THREE.Object3D()];
  readonly airPitch = -0.25;
  private readonly cases: THREE.Object3D[] = [];
  private readonly wings: THREE.Object3D[] = [];
  private readonly lantern: THREE.MeshStandardMaterial;
  private readonly halo: THREE.Sprite;
  private readonly materials: THREE.Material[];
  private readonly period = rand(1.6, 3.2);
  private readonly phase = rand(0, 1);
  private flap = 0;

  constructor(colors: FireflyColors) {
    const shell = new THREE.MeshStandardMaterial({ color: colors.shell, roughness: 0.6 });
    const shield = new THREE.MeshStandardMaterial({ color: colors.shield, roughness: 0.7 });
    this.lantern = new THREE.MeshStandardMaterial({ color: '#f4f6d0', emissive: colors.light, emissiveIntensity: 0.3, roughness: 0.5 });
    const wingMat = new THREE.MeshStandardMaterial({ color: '#c9c2b4', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
    this.halo = glowSprite(colors.light, 0);
    this.materials = [shell, shield, this.lantern, wingMat, this.halo.material];

    const part = (mat: THREE.Material, s: [number, number, number], p: [number, number, number]) => {
      const m = new THREE.Mesh(SPHERE, mat);
      m.scale.set(...s);
      m.position.set(...p);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    part(shell, [0.14, 0.08, 0.36], [0, 0.1, -0.08]);
    part(shield, [0.17, 0.06, 0.14], [0, 0.15, 0.3]);
    part(shell, [0.06, 0.035, 0.07], [0, 0.19, 0.3]);
    part(shell, [0.07, 0.06, 0.07], [0, 0.1, 0.42]);
    part(this.lantern, [0.12, 0.075, 0.15], [0, 0.08, -0.42]);
    this.halo.position.set(0, 0.1, -0.44);
    this.halo.scale.setScalar(2.6);
    this.group.add(this.halo);

    for (const side of [1, -1] as const) {
      const half = new THREE.Mesh(CASE, shell);
      half.scale.set(0.16 * side, 0.12, 0.5);
      half.position.set(0, 0, -0.42);
      half.castShadow = true;
      const hinge = new THREE.Group();
      hinge.position.set(0, 0.13, 0.22);
      hinge.userData.side = side;
      hinge.add(half);
      this.group.add(hinge);
      this.cases.push(hinge);

      const pivot = new THREE.Group();
      pivot.position.set(side * 0.04, 0.2, 0.12);
      pivot.userData.side = side;
      const wing = new THREE.Mesh(WING, wingMat);
      wing.scale.x = side;
      pivot.add(wing);
      pivot.visible = false;
      this.group.add(pivot);
      this.wings.push(pivot);

      const antenna = new THREE.Mesh(THIN, shell);
      placeSegment(antenna, tA.set(side * 0.03, 0.12, 0.44), tB.set(side * 0.14, 0.2, 0.72));
      this.group.add(antenna);
      for (const L of LEGS) {
        const leg = new THREE.Mesh(THIN, shell);
        placeSegment(leg, tA.set(L.hip[0] * side, L.hip[1], L.hip[2]), tB.set(L.foot[0] * side, L.foot[1], L.foot[2]));
        this.group.add(leg);
      }
    }
    const head = this.heads[0];
    head.position.set(0, 0.2, 0.32);
    head.scale.setScalar(0.28);
    this.group.add(head);
    this.group.scale.setScalar(SCALE);
  }

  pose(p: FlyerPose, dt: number): void {
    const air = 1 - p.ground;
    this.flap += dt * TAU * 24;
    for (const hinge of this.cases) {
      const side = hinge.userData.side as number;
      hinge.rotation.set(-air * 0.45, side * air * 0.3, side * air * 0.55);
    }
    for (const pivot of this.wings) {
      const side = pivot.userData.side as number;
      pivot.visible = air > 0.2;
      pivot.rotation.set(0, side * 0.2, side * air * (0.3 + 0.8 * Math.sin(this.flap)));
    }
    // Slow flashes: a quick rise and a gentle fade, dimmer on the ground.
    const k = (p.time / this.period + this.phase) % 1;
    const flash = smoothstep(0, 0.07, k) * smoothstep(0.38, 0.12, k);
    const level = lerp(0.1, 1, flash) * lerp(0.55, 1, air);
    this.lantern.emissiveIntensity = 0.2 + 3.2 * level;
    this.halo.material.opacity = 0.9 * level;
  }

  dispose(): void {
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
