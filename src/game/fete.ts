import * as THREE from 'three';
import type { Fete } from '../catalog';
import { rand, smoothstep, TAU } from './math';
import { fbm2p } from './noise';
import type { Bounds } from './world';

// --- Outfits -------------------------------------------------------------------
// Built for a head one unit wide, y up, z toward the nose (see Dressable).

const mat = (color: string, roughness: number) => new THREE.MeshStandardMaterial({ color, roughness });
const RED = mat('#c4202a', 0.85);
const FUR = mat('#f6f3ec', 1);
const BLACK = mat('#1c1820', 0.6);
const PURPLE = mat('#7a3cb0', 0.6);
const PINK = mat('#f2a0b4', 0.8);

const SPHERE = new THREE.SphereGeometry(1, 16, 12);
const SANTA_CONE = new THREE.ConeGeometry(0.42, 0.95, 18).translate(0, 0.475, 0);
const SANTA_BRIM = new THREE.TorusGeometry(0.42, 0.11, 8, 20).rotateX(Math.PI / 2);
const WITCH_BRIM = new THREE.CylinderGeometry(0.8, 0.8, 0.035, 28);
const WITCH_BAND = new THREE.CylinderGeometry(0.44, 0.46, 0.14, 20);
const WITCH_CONE = new THREE.ConeGeometry(0.44, 1.1, 20).translate(0, 0.55, 0);

const part = (geo: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D): THREE.Mesh => {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  parent.add(m);
  return m;
};

/** A red Santa hat with a white furry brim, its tip flopping back with a pompom. */
function santaHat(): THREE.Group {
  const g = new THREE.Group();
  const tilt = 0.5;
  part(SANTA_CONE, RED, g).rotation.x = -tilt;
  part(SANTA_BRIM, FUR, g).position.y = 0.03;
  const pom = part(SPHERE, FUR, g);
  pom.scale.setScalar(0.14);
  pom.position.set(0, 0.95 * Math.cos(tilt), -0.95 * Math.sin(tilt));
  return g;
}

/** A pointy black witch hat with a wide brim and a purple band. */
function witchHat(): THREE.Group {
  const g = new THREE.Group();
  part(WITCH_BRIM, BLACK, g).position.y = 0.02;
  part(WITCH_BAND, PURPLE, g).position.y = 0.1;
  part(WITCH_CONE, BLACK, g).rotation.x = -0.18;
  return g;
}

/** Two tall bunny ears, white with pink insides. */
function bunnyEars(): THREE.Group {
  const g = new THREE.Group();
  for (const side of [1, -1]) {
    const ear = new THREE.Group();
    const outer = part(SPHERE, FUR, ear);
    outer.scale.set(0.15, 0.55, 0.07);
    const inner = part(SPHERE, PINK, ear);
    inner.scale.set(0.09, 0.42, 0.04);
    inner.position.set(0, -0.02, 0.04);
    ear.position.set(side * 0.2, 0.5, -0.05);
    ear.rotation.set(-0.2, 0, -side * 0.22);
    g.add(ear);
  }
  return g;
}

const OUTFIT = 'outfit';

/** Puts each head's outfit for the fête on (or takes it off for 'none'). */
export function dress(heads: readonly THREE.Object3D[], fete: Fete): void {
  for (const head of heads) {
    head.getObjectByName(OUTFIT)?.removeFromParent();
    if (fete === 'none') continue;
    const outfit = fete === 'christmas' ? santaHat() : fete === 'halloween' ? witchHat() : bunnyEars();
    outfit.name = OUTFIT;
    head.add(outfit);
  }
}

// --- Weather -------------------------------------------------------------------

type Weather = 'snow' | 'petals' | 'embers';

const WEATHER: Record<Exclude<Fete, 'none'>, Weather> = { christmas: 'snow', halloween: 'embers', easter: 'petals' };
const COUNT: Record<Weather, number> = { snow: 700, petals: 260, embers: 120 };
const POINT_SIZE: Record<Weather, number> = { snow: 0.04, petals: 0.06, embers: 0.035 };
const PETALS = ['#f6b8c8', '#ffffff', '#f7e08a', '#d5c2f0', '#b8e6c4'].map((c) => new THREE.Color(c));
const TOP = 2.6;

/** A soft round dot for the particles. */
function dotTexture(): THREE.CanvasTexture {
  const N = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, N, N);
  return new THREE.CanvasTexture(canvas);
}

/** Snow on the ground: white drifts with crisp edges and gaps, tiled like the ground. */
function snowTexture(): THREE.CanvasTexture {
  const N = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = fbm2p(x / N, y / N, 6, 6, 91);
      const i = (y * N + x) * 4;
      const shade = 236 + 19 * n;
      img.data[i] = shade - 6;
      img.data[i + 1] = shade - 2;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255 * smoothstep(0.47, 0.51, n);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Bat wing seen from above, spread along +x, with a scalloped trailing edge. */
const BAT_WING = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.04);
  s.lineTo(0.5, 0.1);
  s.quadraticCurveTo(0.42, -0.02, 0.5, -0.12);
  s.quadraticCurveTo(0.36, -0.06, 0.3, -0.16);
  s.quadraticCurveTo(0.2, -0.08, 0.12, -0.15);
  s.quadraticCurveTo(0.08, -0.06, 0, -0.08);
  s.closePath();
  return new THREE.ShapeGeometry(s, 6).rotateX(-Math.PI / 2);
})();

interface Bat {
  group: THREE.Group;
  wings: THREE.Object3D[];
  phase: number;
  speed: number;
  height: number;
}

/** Lighting of each fête: sky and ground colours, sun colour and strength. */
export const MOODS: Record<Fete, { sky: string; ground: string; hemi: number; sun: string; sunPower: number; exposure: number }> = {
  none: { sky: '#e8f0ff', ground: '#3b3028', hemi: 0.7, sun: '#fff1dc', sunPower: 2.4, exposure: 0.95 },
  christmas: { sky: '#e6efff', ground: '#48526a', hemi: 0.85, sun: '#eef4ff', sunPower: 2.2, exposure: 0.95 },
  halloween: { sky: '#8a6ab8', ground: '#2a1608', hemi: 0.55, sun: '#ff9a4a', sunPower: 1.7, exposure: 0.85 },
  easter: { sky: '#fff8ec', ground: '#5a4a3a', hemi: 0.8, sun: '#fff4dc', sunPower: 2.5, exposure: 1 },
};

/**
 * The fête's decorations that are not hiding spots: falling snow or petals, glowing embers,
 * bats circling overhead, and snow lying on the ground.
 */
export class FeteFx {
  readonly group = new THREE.Group();
  private weather: Weather | null = null;
  private points: THREE.Points | null = null;
  private speeds = new Float32Array(0);
  /** Particle size multiplier (the pixel style draws a smaller picture). */
  private pointScale = 1;
  private readonly snowGround: THREE.Mesh;
  private readonly bats: Bat[] = [];
  private t = 0;

  constructor(groundSize: number, tile: number) {
    const tex = snowTexture();
    tex.repeat.setScalar(groundSize / tile);
    this.snowGround = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false }),
    );
    this.snowGround.position.y = 0.0015;
    this.snowGround.receiveShadow = true;
    this.snowGround.visible = false;
    this.group.add(this.snowGround);

    const batMat = new THREE.MeshStandardMaterial({ color: '#16121a', roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(SPHERE, batMat);
      body.scale.set(0.035, 0.03, 0.06);
      group.add(body);
      const wings = [1, -1].map((side) => {
        const pivot = new THREE.Group();
        const wing = new THREE.Mesh(BAT_WING, batMat);
        wing.scale.set(side * 0.22, 1, 0.22);
        pivot.add(wing);
        pivot.userData.side = side;
        group.add(pivot);
        return pivot;
      });
      group.traverse((o) => (o.castShadow = true));
      group.visible = false;
      this.group.add(group);
      this.bats.push({ group, wings, phase: rand(0, TAU), speed: rand(0.35, 0.55), height: rand(1, 1.6) });
    }
  }

  setPointScale(k: number): void {
    this.pointScale = k;
    if (this.points && this.weather) (this.points.material as THREE.PointsMaterial).size = POINT_SIZE[this.weather] * k;
  }

  /** `land` is false in the water theme: no snow on the ground there. */
  set(fete: Fete, land: boolean): void {
    this.snowGround.visible = fete === 'christmas' && land;
    for (const bat of this.bats) bat.group.visible = fete === 'halloween';
    const weather = fete === 'none' ? null : WEATHER[fete];
    if (weather === this.weather) return;
    this.weather = weather;
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points.removeFromParent();
      this.points = null;
    }
    if (!weather) return;
    const n = COUNT[weather];
    const pos = new Float32Array(n * 3), colors = new Float32Array(n * 3);
    this.speeds = new Float32Array(n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos.set([rand(-3, 3), rand(0, TOP), rand(-3, 3)], i * 3);
      this.speeds[i] = rand(0.6, 1.4);
      if (weather === 'petals') c.copy(PETALS[i % PETALS.length]);
      else if (weather === 'embers') c.setHSL(rand(0.05, 0.11), 1, rand(0.5, 0.65));
      else c.setRGB(1, 1, 1);
      c.toArray(colors, i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false,
        size: POINT_SIZE[weather] * this.pointScale,
        blending: weather === 'embers' ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  /** `floor` is where falling things vanish: the ground, or the water surface. */
  update(dt: number, b: Bounds, floor: number): void {
    this.t += dt;
    const t = this.t;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const hx = (b.maxX - b.minX) / 2 + 0.6, hz = (b.maxZ - b.minZ) / 2 + 0.6;
    if (this.points) {
      const p = this.points.geometry.attributes.position as THREE.BufferAttribute;
      const a = p.array as Float32Array;
      const w = this.weather;
      for (let i = 0; i < p.count; i++) {
        const k = i * 3, s = this.speeds[i];
        if (w === 'embers') {
          // Glowing sparks drifting up, then starting again near the ground.
          a[k] += Math.sin(t * 1.3 + i) * 0.08 * dt;
          a[k + 1] += 0.12 * s * dt;
          a[k + 2] += Math.cos(t * 1.1 + i * 1.7) * 0.08 * dt;
          if (a[k + 1] > 1.4) a[k + 1] = floor;
        } else {
          const sway = w === 'petals' ? 0.35 : 0.12;
          a[k] += Math.sin(t * 0.9 + i * 0.37) * sway * dt;
          a[k + 1] -= (w === 'petals' ? 0.22 : 0.35) * s * dt;
          a[k + 2] += Math.cos(t * 0.7 + i * 0.61) * sway * 0.6 * dt;
          if (a[k + 1] < floor) a[k + 1] = TOP;
        }
        // Keep them over the visible area.
        if (Math.abs(a[k] - cx) > hx) a[k] = cx + rand(-hx, hx);
        if (Math.abs(a[k + 2] - cz) > hz) a[k + 2] = cz + rand(-hz, hz);
      }
      p.needsUpdate = true;
    }
    for (const bat of this.bats) {
      if (!bat.group.visible) continue;
      // A lazy figure of eight over the scene.
      const u = t * bat.speed + bat.phase;
      const x = cx + Math.sin(u) * hx * 0.7, z = cz + Math.sin(u * 2) * hz * 0.45;
      const dx = Math.cos(u) * hx * 0.7, dz = Math.cos(u * 2) * hz * 0.9;
      bat.group.position.set(x, bat.height + 0.08 * Math.sin(t * 3 + bat.phase), z);
      bat.group.rotation.y = Math.atan2(dx, dz);
      for (const wing of bat.wings) wing.rotation.z = (wing.userData.side as number) * 0.7 * Math.sin(t * 16 + bat.phase);
    }
  }
}
