import * as THREE from 'three';
import type { Walker } from '../creature';
import { clamp, rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import type { Cover, CoverPart } from './cover';

/** Autumn leaf palettes: [light, dark]. */
const LEAF_PALETTES = [
  ['#d0702f', '#8e3f1c'],
  ['#e0ab45', '#a86e22'],
  ['#9a6a35', '#5e3b1b'],
  ['#8aa53c', '#4f6a20'],
  ['#c4532f', '#7a2a17'],
] as const;

/** How far around a body a leaf is lifted, beyond the body's own radius. */
const DRAPE_FALLOFF = 0.07;
/** Bodies taller than this walk over leaves instead of crawling under them. */
const DRAPE_MAX = 0.2;

/** Body points under a leaf: x, z, radius, top, repeated. */
const samples: number[] = [];

/** A leaf's mesh and its resting shape, in the leaf's own frame. It lifts over whatever crawls underneath. */
class Drape implements CoverPart {
  private deformed = false;

  constructor(
    private readonly leaf: THREE.Object3D,
    private readonly geometry: THREE.BufferGeometry,
    private readonly rest: Float32Array,
    private readonly cos: number,
    private readonly sin: number,
    private readonly halfLength: number,
    private readonly halfWidth: number,
  ) {}

  update(cover: Cover, _dt: number, walkers: readonly Walker[]): void {
    // Leaves rustle when touched or when an animal runs underneath.
    const w = cover.wobble, t = cover.t;
    this.leaf.rotation.x = w * 0.07 * Math.sin(t * 31);
    this.leaf.rotation.z = w * 0.07 * Math.cos(t * 27);
    this.leaf.position.y = w * 0.012 * Math.abs(Math.sin(t * 19));
    this.drapeOver(cover, walkers);
  }

  /** Lifts the leaf over the bodies underneath, so it lies on them instead of cutting through. */
  private drapeOver(cover: Cover, walkers: readonly Walker[]): void {
    samples.length = 0;
    for (const w of walkers) {
      if (cover.distanceTo(w.pos.x, w.pos.y) > cover.radius + 1.1) continue;
      w.forEachSample((x, z, r, top) => {
        if (top > DRAPE_MAX) return;
        const dx = x - cover.x, dz = z - cover.z;
        const lx = dx * this.cos - dz * this.sin, lz = dx * this.sin + dz * this.cos;
        const m = r + DRAPE_FALLOFF;
        if (Math.abs(lx) < this.halfWidth + m && Math.abs(lz) < this.halfLength + m) samples.push(lx, lz, r, top + 0.008);
      });
    }
    if (!samples.length && !this.deformed) return;

    const p = this.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vz = p.getZ(i), rest = this.rest[i];
      let y = rest;
      for (let k = 0; k < samples.length; k += 4) {
        const lift = samples[k + 3];
        if (lift <= y) continue;
        const r = samples[k + 2];
        const dist = Math.hypot(vx - samples[k], vz - samples[k + 1]);
        if (dist >= r + DRAPE_FALLOFF) continue;
        y = Math.max(y, rest + (lift - rest) * (1 - smoothstep(r * 0.6, r + DRAPE_FALLOFF, dist)));
      }
      p.setY(i, y);
    }
    p.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.deformed = samples.length > 0;
  }
}

const leafTextures = new Map<number, THREE.CanvasTexture>();

/** Leaf colour, midrib and veins. UVs: u across (midrib at 0.5), v from stem (0) to tip (1). */
function leafTexture(palette: number): THREE.CanvasTexture {
  const cached = leafTextures.get(palette);
  if (cached) return cached;
  const W = 128, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const [light, dark] = LEAF_PALETTES[palette].map((h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  for (let y = 0; y < H; y++) {
    const v = 1 - (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const side = Math.abs(u - 0.5) * 2;
      let k = noise3(u * 6, v * 10, palette, 21) * 0.6 + noise3(u * 20, v * 34, palette, 22) * 0.4;
      k = 0.35 + 0.5 * k;
      // Veins run from the midrib toward the tip.
      const phase = v * 9 - side * 2.4;
      const vein = side < 0.9 ? smoothstep(0.07, 0.0, Math.abs(phase - Math.round(phase))) : 0;
      const midrib = smoothstep(0.03, 0.0, side);
      let shade = 1 - 0.25 * vein - 0.35 * smoothstep(0.8, 1, side);
      const spot = smoothstep(0.72, 0.8, noise3(u * 9, v * 15, palette, 23));
      shade *= 1 - 0.35 * spot;
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const base = dark[c] + (light[c] - dark[c]) * k;
        img.data[i + c] = clamp((base + midrib * 40) * shade, 0, 255);
      }
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  leafTextures.set(palette, tex);
  return tex;
}

/** A slightly curled leaf lying on the ground. */
export function makeLeaf(cover: Cover, halfLength: number, halfWidth: number): void {
  const NT = 28, NV = 14, H = 0.045;
  const seed = rand(0, 100);
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  for (let i = 0; i <= NT; i++) {
    const t = i / NT;
    const w = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.8);
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1;
      const dome = (1 - v * v) * Math.pow(Math.sin(Math.PI * t), 0.6);
      const y = 0.015 + (H - 0.015) * dome + 0.012 * Math.abs(v) * Math.sin(t * 17 + seed) + 0.03 * t ** 4;
      pos.push(v * w * halfWidth, y, (t - 0.5) * 2 * halfLength);
      uv.push((v + 1) / 2, t);
      if (i < NT && j < NV) {
        const a = i * (NV + 1) + j, b = a + NV + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: leafTexture(Math.floor(Math.random() * LEAF_PALETTES.length)),
    roughness: 0.75,
    side: THREE.DoubleSide,
  });
  const leaf = new THREE.Mesh(geo, mat);
  leaf.castShadow = leaf.receiveShadow = true;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.08, 6), new THREE.MeshStandardMaterial({ color: '#6b4523' }));
  stem.rotation.x = Math.PI / 2;
  stem.position.set(0, 0.016, -halfLength - 0.035);
  stem.castShadow = true;

  const yaw = rand(0, TAU);
  const g = new THREE.Group();
  g.rotation.y = yaw;
  g.add(leaf, stem);
  const holder = new THREE.Group();
  holder.add(g);
  cover.object.add(holder);
  const p = geo.attributes.position;
  cover.part = new Drape(
    holder, geo, Float32Array.from({ length: p.count }, (_, i) => p.getY(i)), Math.cos(yaw), Math.sin(yaw), halfLength, halfWidth,
  );
}
