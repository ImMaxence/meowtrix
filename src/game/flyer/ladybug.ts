import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import { TAU } from '../math';
import { dotted, type Variant } from '../variant';
import type { FlightStyle, FlyerBody, FlyerPose } from './flyer';

export interface LadybugColors extends Variant {
  shell: string;
  spot: string;
  /** Spots on one wing case: around its edge (0 front, 0.5 side, 1 back), down from the top (0) to the rim (1), radius. */
  spots: readonly (readonly [number, number, number])[];
}

const bug = (c: Omit<LadybugColors, 'swatch'>): LadybugColors => ({ ...c, swatch: dotted(c.shell, c.spot) });

/** 22 little spots, laid out in rows. */
const MANY: [number, number, number][] = [];
for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) MANY.push([0.14 + k * 0.23 + (row % 2) * 0.08, 0.28 + row * 0.27, 0.05]);

export const LADYBUG_COLORS: readonly LadybugColors[] = [
  bug({ id: 'red', shell: '#d4231c', spot: '#141110', spots: [[0.02, 0.8, 0.09], [0.24, 0.5, 0.09], [0.52, 0.42, 0.11], [0.78, 0.52, 0.09]] }),
  bug({ id: 'orange', shell: '#e9761e', spot: '#f6e6c4', spots: [[0.2, 0.4, 0.05], [0.38, 0.75, 0.05], [0.55, 0.35, 0.05], [0.72, 0.7, 0.05], [0.86, 0.32, 0.05]] }),
  bug({ id: 'yellow', shell: '#f0cc2a', spot: '#141110', spots: MANY }),
  bug({ id: 'black', shell: '#161312', spot: '#d42a1c', spots: [[0.32, 0.55, 0.12], [0.72, 0.5, 0.08]] }),
];

export const LADYBUG_STYLE: FlightStyle = {
  speed: [0.6, 1.1], wobble: 0.15, altitude: [0.2, 0.55], hover: 0.1,
  flightTime: [2, 5], walkTime: [6, 15], walkSpeed: 0.12, stepTime: [1, 3], pauseTime: [0.2, 1], stepTurn: 0.8,
  groomChance: 0.15, groomTime: [1, 2], scare: [0.3, 0.25], awayFear: 0.9, callRate: 0,
};

const SCALE = 0.13;
const SPHERE = new THREE.SphereGeometry(1, 16, 12);
const LEG_GEO = new THREE.CylinderGeometry(0.014, 0.02, 1, 5);
const WING_GEO = (() => {
  const shape = new THREE.Shape();
  shape.absellipse(0.38, 0, 0.38, 0.13, 0, TAU, false, 0);
  return new THREE.ShapeGeometry(shape, 20).rotateX(-Math.PI / 2);
})();

const textures = new Map<string, THREE.CanvasTexture>();

/** One wing case: shell colour and spots, in the half-dome's UVs (u around, v from top to rim). */
function shellTexture(c: LadybugColors): THREE.CanvasTexture {
  let tex = textures.get(c.id);
  if (tex) return tex;
  const W = 128, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = c.shell;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c.spot;
  for (const [around, down, r] of c.spots) {
    ctx.beginPath();
    ctx.ellipse(around * W, down * H, r * W * 0.5, r * H * 1.2, 0, 0, TAU);
    ctx.fill();
  }
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(c.id, tex);
  return tex;
}

/** Legs: hip and foot for side +1, from front to back. */
const LEGS = [
  { hip: [0.1, 0.12, 0.2], foot: [0.3, 0, 0.32] },
  { hip: [0.12, 0.12, 0.04], foot: [0.36, 0, 0.02] },
  { hip: [0.1, 0.12, -0.12], foot: [0.32, 0, -0.28] },
] as const;
const hip = new THREE.Vector3(), knee = new THREE.Vector3(), foot = new THREE.Vector3();

/** A ladybird: a spotted dome on short legs; in flight the wing cases lift and the wings buzz. */
export class LadybugBody implements FlyerBody {
  readonly group = new THREE.Group();
  readonly heads: readonly THREE.Object3D[] = [new THREE.Object3D()];
  readonly airPitch = -0.35;
  private readonly cases: THREE.Object3D[] = [];
  private readonly wings: THREE.Object3D[] = [];
  private readonly legs: { side: number; pair: number; femur: THREE.Mesh; tibia: THREE.Mesh }[] = [];
  private readonly materials: THREE.Material[];
  private flap = 0;

  constructor(colors: LadybugColors) {
    const shell = new THREE.MeshPhysicalMaterial({ map: shellTexture(colors), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
    const black = new THREE.MeshPhysicalMaterial({ color: '#141110', roughness: 0.4, clearcoat: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: '#f2eee4', roughness: 0.5 });
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: '#b89a7a', transparent: true, opacity: 0.45, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false,
    });
    this.materials = [shell, black, white, wingMat];

    const part = (mat: THREE.Material, s: [number, number, number], p: [number, number, number]) => {
      const m = new THREE.Mesh(SPHERE, mat);
      m.scale.set(...s);
      m.position.set(...p);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    part(black, [0.26, 0.12, 0.38], [0, 0.12, -0.02]);
    part(black, [0.2, 0.11, 0.12], [0, 0.17, 0.3]);
    part(white, [0.06, 0.04, 0.05], [0.12, 0.22, 0.33]);
    part(white, [0.06, 0.04, 0.05], [-0.12, 0.22, 0.33]);
    part(black, [0.11, 0.08, 0.08], [0, 0.13, 0.43]);
    const head = this.heads[0];
    head.position.set(0, 0.27, 0.32);
    head.scale.setScalar(0.3);
    this.group.add(head);

    for (const side of [1, -1] as const) {
      // Half a dome per wing case, hinged at the front along the seam; the left one is mirrored.
      const geo = new THREE.SphereGeometry(1, 20, 12, Math.PI / 2, Math.PI, 0, Math.PI / 2);
      const half = new THREE.Mesh(geo, shell);
      half.scale.set(0.28 * side, 0.24, 0.4);
      half.position.set(0, 0, -0.33);
      half.castShadow = true;
      const hinge = new THREE.Group();
      hinge.position.set(0, 0.14, 0.27);
      hinge.userData.side = side;
      hinge.add(half);
      this.group.add(hinge);
      this.cases.push(hinge);

      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.05, 0.22, 0.16);
      wingPivot.userData.side = side;
      const wing = new THREE.Mesh(WING_GEO, wingMat);
      wing.scale.x = side;
      wingPivot.add(wing);
      wingPivot.visible = false;
      this.group.add(wingPivot);
      this.wings.push(wingPivot);

      LEGS.forEach((_, pair) => {
        const femur = new THREE.Mesh(LEG_GEO, black), tibia = new THREE.Mesh(LEG_GEO, black);
        femur.castShadow = tibia.castShadow = true;
        this.group.add(femur, tibia);
        this.legs.push({ side, pair, femur, tibia });
      });
    }
    this.group.scale.setScalar(SCALE);
  }

  pose(p: FlyerPose, dt: number): void {
    const air = 1 - p.ground;
    this.flap += dt * TAU * 26;
    for (const hinge of this.cases) {
      const side = hinge.userData.side as number;
      hinge.rotation.set(-air * 0.5, side * air * 0.35, side * air * 0.6);
    }
    for (const pivot of this.wings) {
      const side = pivot.userData.side as number;
      pivot.visible = air > 0.2;
      pivot.rotation.set(0, side * 0.25, side * air * (0.3 + 0.8 * Math.sin(this.flap)));
    }
    for (const leg of this.legs) {
      const L = LEGS[leg.pair];
      const tripod = (leg.pair + (leg.side > 0 ? 0 : 1)) % 2;
      const step = p.walking ? 0.06 * Math.sin(p.walkPhase * 1.5 + tripod * Math.PI) : 0;
      hip.set(L.hip[0] * leg.side, L.hip[1], L.hip[2]);
      foot.set(L.foot[0] * leg.side * (1 - air * 0.6), air * 0.06, L.foot[2] * (1 - air * 0.4) + step);
      knee.lerpVectors(hip, foot, 0.5);
      knee.y += 0.08;
      knee.x += 0.04 * leg.side;
      placeSegment(leg.femur, hip, knee);
      placeSegment(leg.tibia, knee, foot);
    }
  }

  dispose(): void {
    for (const hinge of this.cases) (hinge.children[0] as THREE.Mesh).geometry.dispose();
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
