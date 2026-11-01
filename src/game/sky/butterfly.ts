import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import type { FlightStyle, FlyerBody, FlyerPose } from '../flyer/flyer';
import { damp, lerp, rand, smoothstep, TAU } from '../math';
import type { Variant } from '../variant';

/** A spot on a wing: x out from the body, z forward (wing units), radius, colour. Concentric spots make an eye. */
type Spot = readonly [number, number, number, string];

export interface ButterflyColors extends Variant {
  /** Wing colour near the body, and toward the edge. */
  base: string;
  edge: string;
  /** Dark margin and its width (wing units). */
  border: string;
  borderWidth: number;
  /** Little pale dots along the margin (monarch). */
  borderDots: string | null;
  veins: string | null;
  /** Dark tip of the forewing and its size (cabbage white, monarch). */
  apex: readonly [string, number] | null;
  fore: readonly Spot[];
  hind: readonly Spot[];
  body: string;
  /** Iridescent sheen (morpho). */
  shine: number;
}

const butterfly = (c: Omit<ButterflyColors, 'swatch'>, swatch: string): ButterflyColors => ({ ...c, swatch });

export const BUTTERFLY_COLORS: readonly ButterflyColors[] = [
  butterfly({
    id: 'monarch', base: '#f39028', edge: '#d8631a', border: '#16110e', borderWidth: 0.08, borderDots: '#fff4e2',
    veins: '#1c130d', apex: ['#16110e', 0.26], fore: [[0.86, 0.2, 0.025, '#fff4e2'], [0.93, 0.13, 0.022, '#f7c070'], [0.8, 0.26, 0.02, '#fff4e2']], hind: [],
    body: '#1b1411', shine: 0,
  }, 'linear-gradient(135deg, #f39028 0 55%, #16110e 55% 70%, #f39028 70%)'),
  butterfly({
    id: 'morpho', base: '#3a9cff', edge: '#1c4fd6', border: '#0d0f1a', borderWidth: 0.11, borderDots: '#e4eeff',
    veins: null, apex: ['#0d0f1a', 0.18], fore: [], hind: [], body: '#1a1712', shine: 1,
  }, 'radial-gradient(circle at 40% 40%, #5fb4ff, #1c4fd6 60%, #0d0f1a 75%)'),
  butterfly({
    id: 'white', base: '#f7f5ec', edge: '#eeecdc', border: '#f0eee0', borderWidth: 0, borderDots: null,
    veins: '#d9d5c2', apex: ['#2a2a28', 0.22], fore: [[0.55, 0.0, 0.055, '#2a2a28'], [0.42, -0.1, 0.045, '#2a2a28']], hind: [],
    body: '#3a3a36', shine: 0,
  }, 'linear-gradient(135deg, #2a2a28 0 22%, #f7f5ec 22%)'),
  butterfly({
    id: 'peacock', base: '#ae3520', edge: '#80261a', border: '#3b2b23', borderWidth: 0.06, borderDots: null, veins: null, apex: null,
    fore: [
      [0.36, 0.2, 0.07, '#22150f'], [0.56, 0.25, 0.06, '#22150f'],
      [0.8, 0.16, 0.16, '#e2cc84'], [0.8, 0.16, 0.115, '#2a1d1a'], [0.82, 0.15, 0.07, '#5b86d0'], [0.84, 0.17, 0.02, '#f2f2f2'],
    ],
    hind: [[0.5, -0.42, 0.18, '#151012'], [0.5, -0.42, 0.13, '#5b86d0'], [0.5, -0.42, 0.085, '#151012'], [0.53, -0.4, 0.025, '#e8eef8']],
    body: '#2b1d18', shine: 0,
  }, 'radial-gradient(circle at 60% 40%, #5b86d0 0 12%, #2a1d1a 13% 22%, #e2cc84 23% 30%, #ae3520 31%)'),
  butterfly({
    id: 'brimstone', base: '#f4e24e', edge: '#e6d23a', border: '#cdb92e', borderWidth: 0.02, borderDots: null,
    veins: '#dcc83c', apex: null, fore: [[0.5, 0.05, 0.035, '#e8892a']], hind: [[0.38, -0.32, 0.04, '#e8892a']],
    body: '#5e5c34', shine: 0,
  }, 'radial-gradient(circle at 50% 50%, #e8892a 0 10%, #f4e24e 11%)'),
];

export const BUTTERFLY_STYLE: FlightStyle = {
  speed: [0.5, 0.95], wobble: 0.55, altitude: [0.25, 0.95], hover: 0.05,
  flightTime: [4, 9], walkTime: [3, 8], walkSpeed: 0.04, stepTime: [0.2, 0.5], pauseTime: [1.5, 4], stepTurn: 1,
  groomChance: 0.7, groomTime: [2.5, 6], scare: [0.45, 0.3], awayFear: 0.9, callRate: 0,
};

/** Model units → world units: about 0.4 across the wings (the lizard is 1 long). */
const SCALE = 0.19;

/** Wing outline from the hinge: start point, then quadratic curves (control x, z, end x, z). */
interface Outline {
  start: readonly [number, number];
  curves: readonly (readonly [number, number, number, number])[];
}

const FOREWING: Outline = {
  start: [0, 0.07],
  curves: [[0.45, 0.36, 0.98, 0.31], [1.08, 0.24, 1, 0.12], [0.92, -0.08, 0.7, -0.17], [0.35, -0.17, 0.05, -0.05], [0, -0.02, 0, 0.07]],
};
const HINDWING: Outline = {
  start: [0, 0.03],
  curves: [[0.5, 0.08, 0.74, -0.1], [0.86, -0.3, 0.7, -0.5], [0.52, -0.72, 0.28, -0.66], [0.06, -0.5, 0.02, -0.12], [0, -0.03, 0, 0.03]],
};

function shapeOf(o: Outline): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(o.start[0], o.start[1]);
  for (const [cx, cz, x, z] of o.curves) s.quadraticCurveTo(cx, cz, x, z);
  return s;
}

interface WingShape {
  outline: Outline;
  geometry: THREE.BufferGeometry;
  /** Bounding box in wing units, for the texture. */
  min: THREE.Vector2;
  size: THREE.Vector2;
  /** Points along the edge, for veins and margin dots. */
  edge: THREE.Vector2[];
}

/** A flat wing lying in the xz plane (x out from the body, z forward), with UVs spanning its bounding box. */
function wingShape(outline: Outline): WingShape {
  const shape = shapeOf(outline);
  const pts = shape.getPoints(24);
  const box = new THREE.Box2().setFromPoints(pts);
  const min = box.min, size = box.getSize(new THREE.Vector2());
  const geometry = new THREE.ShapeGeometry(shape, 24).rotateX(Math.PI / 2);
  const p = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - min.x) / size.x, (p.getZ(i) - min.y) / size.y);
  return { outline, geometry, min, size, edge: shape.getSpacedPoints(60) };
}

const FORE = wingShape(FOREWING);
const HIND = wingShape(HINDWING);

const TEX = 256;
const textures = new Map<string, THREE.CanvasTexture>();

/** Paints one wing: colour gradient, veins, dark tip, spots, margin and its dots, clipped to the outline. */
function wingTexture(c: ButterflyColors, wing: WingShape, fore: boolean): THREE.CanvasTexture {
  const key = `${c.id}-${fore ? 'f' : 'h'}`;
  let tex = textures.get(key);
  if (tex) return tex;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEX;
  const ctx = canvas.getContext('2d')!;
  const { min, size } = wing;
  const X = (x: number) => ((x - min.x) / size.x) * TEX;
  // Canvas rows go from the front of the wing (top, v = 1) to the back.
  const Y = (z: number) => (1 - (z - min.y) / size.y) * TEX;
  const sx = TEX / size.x, sy = TEX / size.y;
  const circle = (x: number, z: number, r: number) => {
    ctx.beginPath();
    ctx.ellipse(X(x), Y(z), r * sx, r * sy, 0, 0, TAU);
  };

  const outline = () => {
    const o = wing.outline;
    ctx.beginPath();
    ctx.moveTo(X(o.start[0]), Y(o.start[1]));
    for (const [cx, cz, x, z] of o.curves) ctx.quadraticCurveTo(X(cx), Y(cz), X(x), Y(z));
    ctx.closePath();
  };

  ctx.fillStyle = c.edge;
  ctx.fillRect(0, 0, TEX, TEX);
  ctx.save();
  outline();
  ctx.clip();

  const grad = ctx.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), TEX * 1.1);
  grad.addColorStop(0, c.base);
  grad.addColorStop(0.35, c.base);
  grad.addColorStop(1, c.edge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX, TEX);

  if (c.veins) {
    ctx.strokeStyle = c.veins;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < wing.edge.length; i += 6) {
      const e = wing.edge[i];
      if (Math.hypot(e.x, e.y) < 0.35) continue;
      ctx.beginPath();
      ctx.moveTo(X(0.02), Y(0));
      ctx.quadraticCurveTo(X(e.x * 0.5), Y(e.y * 0.3), X(e.x), Y(e.y));
      ctx.stroke();
    }
  }
  if (fore && c.apex) {
    const [color, r] = c.apex;
    ctx.fillStyle = color;
    circle(1, 0.24, r);
    ctx.fill();
  }
  for (const [x, z, r, color] of fore ? c.fore : c.hind) {
    ctx.fillStyle = color;
    circle(x, z, r);
    ctx.fill();
  }
  if (c.borderWidth > 0) {
    ctx.strokeStyle = c.border;
    // Half the stroke falls outside the clip.
    ctx.lineWidth = c.borderWidth * 2 * Math.min(sx, sy);
    outline();
    ctx.stroke();
  }
  if (c.borderDots) {
    ctx.fillStyle = c.borderDots;
    wing.edge.forEach((e, i) => {
      if (i % 3 || Math.hypot(e.x, e.y) < 0.5) return;
      // Pulled in toward the wing's middle, onto the margin.
      const k = 1 - (c.borderWidth * 0.5) / Math.hypot(e.x, e.y);
      circle(e.x * k, e.y * k, 0.014);
      ctx.fill();
    });
  }
  ctx.restore();

  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, tex);
  return tex;
}

const SPHERE = new THREE.SphereGeometry(1, 14, 10);
const THIN = new THREE.CylinderGeometry(0.008, 0.01, 1, 4);

/** Legs: hip and foot for side +1. */
const LEGS = [
  { hip: [0.035, 0.08, 0.1], foot: [0.15, 0, 0.18] },
  { hip: [0.04, 0.08, 0.05], foot: [0.17, 0, 0.04] },
  { hip: [0.035, 0.08, 0], foot: [0.15, 0, -0.1] },
] as const;
const tA = new THREE.Vector3(), tB = new THREE.Vector3();

interface Wing {
  pivot: THREE.Object3D;
  side: number;
  /** The hindwing trails the forewing a little. */
  lag: number;
}

/**
 * A butterfly: four painted wings beating slowly with a bobbing flight; at rest the wings close
 * over the back and flick open now and then, and it sometimes basks with them spread flat.
 */
export class ButterflyBody implements FlyerBody {
  readonly group = new THREE.Group();
  readonly heads: readonly THREE.Object3D[] = [new THREE.Object3D()];
  readonly airPitch = -0.3;
  private readonly model = new THREE.Group();
  private readonly wings: Wing[] = [];
  private readonly materials: THREE.Material[];
  private flap = rand(0, TAU);
  /** Wing angle above horizontal when landed, eased toward the pose. */
  private rest = 1.05;
  private readonly seed = rand(0, 50);

  constructor(colors: ButterflyColors) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: colors.body, roughness: 1 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#1a1614', roughness: 0.3 });
    const wingMat = (fore: boolean) => new THREE.MeshPhysicalMaterial({
      map: wingTexture(colors, fore ? FORE : HIND, fore), side: THREE.DoubleSide, roughness: colors.shine ? 0.35 : 0.8,
      iridescence: colors.shine, iridescenceIOR: 1.8, sheen: 0.4, sheenColor: '#ffffff',
    });
    const foreMat = wingMat(true), hindMat = wingMat(false);
    this.materials = [bodyMat, eyeMat, foreMat, hindMat];

    const part = (mat: THREE.Material, s: [number, number, number], p: [number, number, number]) => {
      const m = new THREE.Mesh(SPHERE, mat);
      m.scale.set(...s);
      m.position.set(...p);
      m.castShadow = true;
      this.model.add(m);
      return m;
    };
    part(bodyMat, [0.07, 0.07, 0.13], [0, 0.12, 0.04]);
    part(bodyMat, [0.05, 0.05, 0.25], [0, 0.11, -0.24]).rotation.x = -0.08;
    part(bodyMat, [0.06, 0.06, 0.06], [0, 0.13, 0.2]);
    for (const side of [1, -1]) {
      part(eyeMat, [0.03, 0.03, 0.03], [side * 0.045, 0.14, 0.23]);
      // Antennae ending in little clubs.
      const antenna = new THREE.Mesh(THIN, bodyMat);
      placeSegment(antenna, tA.set(side * 0.025, 0.16, 0.24), tB.set(side * 0.12, 0.3, 0.55));
      this.model.add(antenna);
      part(bodyMat, [0.022, 0.022, 0.03], [side * 0.12, 0.3, 0.55]);
      for (const L of LEGS) {
        const leg = new THREE.Mesh(THIN, bodyMat);
        placeSegment(leg, tA.set(L.hip[0] * side, L.hip[1], L.hip[2]), tB.set(L.foot[0] * side, L.foot[1], L.foot[2]));
        this.model.add(leg);
      }
      for (const fore of [true, false]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.04, 0.13, fore ? 0.08 : -0.02);
        const wing = new THREE.Mesh(fore ? FORE.geometry : HIND.geometry, fore ? foreMat : hindMat);
        wing.scale.x = side;
        wing.castShadow = true;
        pivot.add(wing);
        this.model.add(pivot);
        this.wings.push({ pivot, side, lag: fore ? 0 : 0.14 });
      }
    }
    const head = this.heads[0];
    head.position.set(0, 0.19, 0.2);
    head.scale.setScalar(0.12);
    this.model.add(head);
    this.group.add(this.model);
    this.group.scale.setScalar(SCALE);
  }

  pose(p: FlyerPose, dt: number): void {
    const air = 1 - p.ground;
    const t = p.time + this.seed;
    if (air > 0.02) this.flap += dt * TAU * (6 + 1.5 * Math.min(p.speed, 1.5));
    // Landed: half closed over the back (still visible from above), flicking open now and then;
    // basking: spread flat, breathing.
    const closed = 1.05 - 0.8 * Math.max(0, Math.sin(t * 0.55)) ** 14;
    const bask = 0.14 + 0.1 * Math.sin(t * 1.6);
    const target = p.grooming >= 0 ? lerp(closed, bask, smoothstep(0, 1, p.grooming)) : closed;
    this.rest += (target - this.rest) * damp(5, dt);
    const fly = 0.4 + 0.95 * Math.sin(this.flap);
    for (const w of this.wings) {
      const a = lerp(this.rest, fly - w.lag * Math.cos(this.flap), air);
      w.pivot.rotation.set(0, 0, w.side * a);
    }
    // The body rises on each downstroke.
    this.model.position.y = air * 0.07 * Math.cos(this.flap);
  }

  dispose(): void {
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
