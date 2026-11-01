import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { placeSegment } from '../body/limbs';
import { smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import { banded, type Variant } from '../variant';
import type { FlightStyle, FlyerBody, FlyerPose } from './flyer';

export interface BirdColors extends Variant {
  cap: string;
  face: string;
  chest: string;
  back: string;
  belly: string;
  wings: string;
  tail: string;
  beak: string;
  legs: string;
  /** Streaky back (sparrow). */
  streaks: number;
  /** Pale bar across the wing (sparrow, blue tit). */
  bar?: string;
}

const bird = (c: Omit<BirdColors, 'swatch'>): BirdColors => ({ ...c, swatch: banded(c.back, c.chest, c.belly) });

export const BIRD_COLORS: readonly BirdColors[] = [
  bird({ id: 'sparrow', cap: '#77695a', face: '#cfc4b2', chest: '#c4b8a3', back: '#8d6b47', belly: '#ddd4c4', wings: '#7a5a3a', tail: '#6a5038', beak: '#3a3530', legs: '#c49a7a', streaks: 0.6, bar: '#e8dfcc' }),
  bird({ id: 'robin', cap: '#7a6a4a', face: '#e3702a', chest: '#e3702a', back: '#7d6c4c', belly: '#efe8dc', wings: '#6e5e42', tail: '#6a5a40', beak: '#2a2420', legs: '#8a6a50', streaks: 0 }),
  bird({ id: 'bluetit', cap: '#3c7bd8', face: '#f4f2ea', chest: '#f2d43a', back: '#86a052', belly: '#f2d43a', wings: '#4b81d0', tail: '#3d71c0', beak: '#2a2a2a', legs: '#5a6a80', streaks: 0, bar: '#f2f0e8' }),
  bird({ id: 'blackbird', cap: '#1c1a18', face: '#1c1a18', chest: '#1c1a18', back: '#1a1816', belly: '#22201d', wings: '#191715', tail: '#171513', beak: '#f0a020', legs: '#3a3028', streaks: 0 }),
];

export const BIRD_STYLE: FlightStyle = {
  speed: [1.6, 2.6], wobble: 0.06, altitude: [0.5, 1.1], hover: 0,
  flightTime: [1.2, 3], walkTime: [4, 10], walkSpeed: 0.45, stepTime: [0.15, 0.5], pauseTime: [0.4, 1.6], stepTurn: 1.2,
  groomChance: 0.6, groomTime: [1, 3], scare: [0.7, 0.4], awayFear: 0.55, callRate: 0.08,
};

const SCALE = 0.45;
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), knee = new THREE.Vector3();

/** A smooth blob coloured by direction: `paint` gets the unit normal and returns a colour. */
function blob(paint: (x: number, y: number, z: number, c: THREE.Color) => void): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  sphere.deleteAttribute('uv');
  const geo = mergeVertices(sphere);
  sphere.dispose();
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    paint(p.getX(i), p.getY(i), p.getZ(i), c);
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Wing span (model units), from the shoulder to the tip. */
const SPAN = 0.5;

/**
 * A bird's wing seen from above, spread along +x: rounded at the shoulder, pointed at the tip,
 * darker flight feathers toward the tip and an optional pale bar.
 */
function wingGeometry(colors: BirdColors): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0.06);
  s.bezierCurveTo(0.16, 0.1, 0.34, 0.07, SPAN, -0.02);
  s.bezierCurveTo(0.4, -0.08, 0.24, -0.13, 0.08, -0.12);
  s.lineTo(0, -0.07);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s, 16).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colorsAttr = new Float32Array(p.count * 3);
  const base = new THREE.Color(colors.wings), tip = base.clone().multiplyScalar(0.5), bar = new THREE.Color(colors.bar ?? colors.wings);
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / SPAN;
    col.copy(base).lerp(tip, smoothstep(0.45, 0.9, t));
    if (colors.bar) col.lerp(bar, smoothstep(0.06, 0.0, Math.abs(t - 0.32)) * 0.85);
    col.toArray(colorsAttr, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colorsAttr, 3));
  return geo;
}
const TAIL_GEO = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.04, 0);
  s.lineTo(-0.1, -0.32);
  s.quadraticCurveTo(0, -0.36, 0.1, -0.32);
  s.lineTo(0.04, 0);
  s.closePath();
  return new THREE.ShapeGeometry(s, 8).rotateX(-Math.PI / 2);
})();

/** A small songbird: hops and pecks on the ground, folds its wings on its back, flaps away. */
export class BirdBody implements FlyerBody {
  readonly group = new THREE.Group();
  readonly airPitch = -0.08;
  private readonly head = new THREE.Group();
  private readonly wings: THREE.Object3D[] = [];
  private readonly tail = new THREE.Group();
  private readonly legs: { side: number; upper: THREE.Mesh; lower: THREE.Mesh }[] = [];
  private readonly body: THREE.Mesh;
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private flap = 0;
  private look = 0;

  constructor(colors: BirdColors) {
    const col = (h: string) => new THREE.Color(h);
    const [cap, face, chest, back, belly] = [colors.cap, colors.face, colors.chest, colors.back, colors.belly].map(col);
    const dark = col('#2a2018');
    const bodyGeo = blob((x, y, z, c) => {
      // Back on top, chest in front, belly underneath; streaks on the back.
      c.copy(belly).lerp(chest, smoothstep(0.1, 0.6, z) * smoothstep(0.4, -0.2, y));
      c.lerp(back, smoothstep(-0.1, 0.35, y));
      if (colors.streaks && y > 0) c.lerp(dark, smoothstep(0.62, 0.7, noise3(x * 3, z * 12, 0, 61)) * colors.streaks);
    });
    const headGeo = blob((_x, y, z, c) => {
      c.copy(face).lerp(chest, smoothstep(0.0, -0.6, y) * smoothstep(-0.3, 0.4, z));
      c.lerp(cap, smoothstep(0.25, 0.55, y));
    });
    this.geometries.push(bodyGeo, headGeo);
    const plumage = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const wingMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
    const wingGeo = wingGeometry(colors);
    this.geometries.push(wingGeo);
    const tailMat = new THREE.MeshStandardMaterial({ color: colors.tail, roughness: 0.8, side: THREE.DoubleSide });
    const beakMat = new THREE.MeshStandardMaterial({ color: colors.beak, roughness: 0.4 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#080605', roughness: 0.1, clearcoat: 1 });
    const legMat = new THREE.MeshStandardMaterial({ color: colors.legs, roughness: 0.6 });
    this.materials.push(plumage, wingMat, tailMat, beakMat, eyeMat, legMat);

    this.body = new THREE.Mesh(bodyGeo, plumage);
    this.body.scale.set(0.18, 0.17, 0.3);
    this.body.position.set(0, 0.3, -0.02);
    this.body.castShadow = true;
    this.group.add(this.body);

    const headMesh = new THREE.Mesh(headGeo, plumage);
    headMesh.scale.setScalar(0.12);
    headMesh.castShadow = true;
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.11, 8).rotateX(Math.PI / 2), beakMat);
    beak.position.set(0, -0.015, 0.14);
    beak.castShadow = true;
    this.geometries.push(beak.geometry);
    this.head.add(headMesh, beak);
    for (const side of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), eyeMat);
      eye.position.set(side * 0.085, 0.025, 0.06);
      this.geometries.push(eye.geometry);
      this.head.add(eye);
    }
    this.head.position.set(0, 0.46, 0.26);
    this.group.add(this.head);

    const tailMesh = new THREE.Mesh(TAIL_GEO, tailMat);
    tailMesh.castShadow = true;
    this.tail.add(tailMesh);
    this.tail.position.set(0, 0.3, -0.26);
    this.group.add(this.tail);

    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.07, 0.42, 0.1);
      pivot.userData.side = side;
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.scale.x = side;
      wing.castShadow = true;
      pivot.add(wing);
      this.group.add(pivot);
      this.wings.push(pivot);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1, 6), legMat);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 1, 6), legMat);
      this.geometries.push(upper.geometry, lower.geometry);
      upper.castShadow = lower.castShadow = true;
      this.group.add(upper, lower);
      this.legs.push({ side, upper, lower });
    }
    this.group.scale.setScalar(SCALE);
  }

  pose(p: FlyerPose, dt: number): void {
    const air = 1 - p.ground;
    // Hops: the whole bird bounces with both feet together.
    const hop = p.walking ? Math.abs(Math.sin(p.walkPhase)) * 0.07 : 0;
    const lift = hop * p.ground;
    // Pecking: the head dips to the ground now and then.
    const peck = p.grooming >= 0 ? Math.pow(Math.max(0, Math.sin(p.grooming * 7)), 3) : 0;
    this.look += ((p.ground > 0.9 && !p.walking ? Math.sin(p.time * 0.9) * 0.6 : 0) - this.look) * Math.min(1, dt * 4);

    this.body.position.y = 0.3 + lift;
    this.body.rotation.x = peck * 0.35 - air * 0.1;
    this.head.position.set(0, 0.46 + lift - peck * 0.26, 0.26 + peck * 0.1);
    this.head.rotation.set(peck * 0.9, this.look, 0);
    this.tail.position.y = 0.3 + lift;
    this.tail.rotation.x = -0.25 + 0.15 * Math.sin(p.time * 3) * p.ground * (p.walking ? 1 : 0.3) + air * 0.2;

    this.flap += dt * TAU * 9 * air;
    for (const pivot of this.wings) {
      const side = pivot.userData.side as number;
      pivot.position.set(side * (0.07 + 0.04 * air), 0.42 + lift, 0.1);
      // Folded back along the body on the ground (rolled down over the flanks), spread and beating in the air.
      pivot.rotation.set(0.12 * p.ground, side * (Math.PI / 2) * p.ground, side * (air * 0.9 * Math.sin(this.flap) - 0.45 * p.ground));
    }
    for (const leg of this.legs) {
      tA.set(leg.side * 0.06, 0.2 + lift, 0.0);
      const footY = lift > 0.01 ? lift * 0.5 : 0;
      tB.set(leg.side * 0.07, footY + air * 0.12, 0.04 - air * 0.12);
      knee.lerpVectors(tA, tB, 0.5);
      knee.z -= 0.05;
      placeSegment(leg.upper, tA, knee);
      placeSegment(leg.lower, knee, tB);
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
