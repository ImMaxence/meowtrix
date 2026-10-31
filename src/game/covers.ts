import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Lizard } from './lizard/lizard';
import { clamp, rand, smoothstep, TAU } from './math';
import { noise3 } from './noise';
import type { Bounds } from './world';

export type CoverMode = 'none' | 'leaves' | 'stones' | 'both';
type Kind = 'leaf' | 'stone';

/** Autumn leaf palettes: [light, dark]. */
const LEAF_PALETTES = [
  ['#d0702f', '#8e3f1c'],
  ['#e0ab45', '#a86e22'],
  ['#9a6a35', '#5e3b1b'],
  ['#8aa53c', '#4f6a20'],
  ['#c4532f', '#7a2a17'],
] as const;

const STONE_COLORS = ['#6e6a63', '#625b51', '#77716a', '#58554f', '#6b5f52'];

/** Lowest point under a stone slab: higher than a lizard standing tall. */
const SLAB_CLEARANCE = 0.09;

/** Something a lizard can crawl under: a fallen leaf or a flat stone on pebbles. */
export class Cover {
  readonly object = new THREE.Group();
  /** The lizard hiding here (or on its way), so two never pick the same spot. */
  occupant: Lizard | null = null;
  removed = false;

  private wobble = 0;
  private t = rand(0, 10);

  constructor(readonly kind: Kind, readonly x: number, readonly z: number, readonly radius: number) {
    this.object.position.set(x, 0, z);
  }

  distanceTo(x: number, z: number): number {
    return Math.hypot(x - this.x, z - this.z);
  }

  /** Leaves rustle when touched or when a lizard runs underneath. */
  shake(amount: number): void {
    if (this.kind === 'leaf') this.wobble = Math.max(this.wobble, amount);
  }

  update(dt: number): void {
    this.t += dt;
    this.wobble *= Math.exp(-dt * 4);
    const w = this.wobble;
    this.object.rotation.x = w * 0.07 * Math.sin(this.t * 31);
    this.object.rotation.z = w * 0.07 * Math.cos(this.t * 27);
    this.object.position.y = w * 0.012 * Math.abs(Math.sin(this.t * 19));
  }

  dispose(): void {
    this.removed = true;
    this.object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        // Leaf textures are cached and shared; only the materials go.
        (o.material as THREE.Material).dispose();
      }
    });
    this.object.removeFromParent();
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

/** A domed leaf: high enough in the middle for a lizard to crawl under, edges near the ground. */
function makeLeaf(cover: Cover, halfLength: number, halfWidth: number): void {
  const NT = 28, NV = 14, H = 0.14;
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

  const g = new THREE.Group();
  g.rotation.y = rand(0, TAU);
  g.add(leaf, stem);
  cover.object.add(g);
}

/** A flat stone propped on pebbles, with a gap underneath. */
function makeStone(cover: Cover, radius: number): void {
  const seed = rand(0, 100);
  const base = new THREE.Color(STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)]);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  /** A smooth, lumpy rock with darker hollows and lighter bumps. */
  const lumpy = (detail: number, amount: number) => {
    const ico = new THREE.IcosahedronGeometry(1, detail);
    ico.deleteAttribute('normal');
    ico.deleteAttribute('uv');
    const geo = mergeVertices(ico);
    ico.dispose();
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = noise3(x * 1.8 + seed, y * 1.8, z * 1.8, 31) * 0.75 + noise3(x * 6 + seed, y * 6, z * 6, 32) * 0.25;
      const k = 1 + amount * (n - 0.5);
      p.setXYZ(i, x * k, y * k, z * k);
      const grain = noise3(x * 14 + seed, y * 14, z * 14, 33);
      c.copy(base).multiplyScalar(0.65 + 0.5 * n + 0.15 * grain);
      c.toArray(colors, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  };

  const thickness = 0.07;
  const slab = new THREE.Mesh(lumpy(4, 0.55), mat);
  slab.scale.set(radius, thickness, radius * rand(0.75, 0.95));
  slab.position.y = SLAB_CLEARANCE + thickness * 1.25;
  slab.castShadow = slab.receiveShadow = true;

  const g = new THREE.Group();
  g.rotation.y = rand(0, TAU);
  g.add(slab);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + rand(-0.4, 0.4);
    const r = rand(0.055, 0.075);
    const pebble = new THREE.Mesh(lumpy(2, 0.6), mat);
    pebble.scale.set(r, (SLAB_CLEARANCE + 0.03) / 2, r);
    pebble.position.set(Math.cos(a) * radius * 0.82, (SLAB_CLEARANCE + 0.03) / 2, Math.sin(a) * radius * 0.7);
    pebble.castShadow = pebble.receiveShadow = true;
    g.add(pebble);
  }
  cover.object.add(g);
}

/** Lays out the hiding spots over the visible ground. */
export class Covers {
  readonly list: Cover[] = [];
  private mode: CoverMode = 'none';

  constructor(private readonly scene: THREE.Scene) {}

  setMode(mode: CoverMode, bounds: Bounds): void {
    this.mode = mode;
    this.layout(bounds);
  }

  /** Re-lays out only if some cover ended up off screen (after a resize). */
  fit(bounds: Bounds): void {
    if (this.list.some((c) => c.x < bounds.minX || c.x > bounds.maxX || c.z < bounds.minZ || c.z > bounds.maxZ)) {
      this.layout(bounds);
    }
  }

  layout(b: Bounds): void {
    for (const c of this.list) c.dispose();
    this.list.length = 0;
    if (this.mode === 'none') return;

    const area = (b.maxX - b.minX) * (b.maxZ - b.minZ);
    const count = clamp(Math.round(area / 2.2), 2, 8);
    for (let k = 0; k < count; k++) {
      const kind: Kind = this.mode === 'leaves' ? 'leaf' : this.mode === 'stones' ? 'stone' : k % 2 ? 'stone' : 'leaf';
      const halfLength = rand(0.3, 0.4);
      const halfWidth = halfLength * rand(0.6, 0.75);
      const radius = kind === 'leaf' ? (halfLength + halfWidth) / 2 : rand(0.3, 0.4);
      for (let attempt = 0; attempt < 30; attempt++) {
        const inset = radius * 0.6 + 0.15;
        if (b.maxX - b.minX < 2 * inset || b.maxZ - b.minZ < 2 * inset) break;
        const x = rand(b.minX + inset, b.maxX - inset), z = rand(b.minZ + inset, b.maxZ - inset);
        if (this.list.some((c) => c.distanceTo(x, z) < c.radius + radius + 0.3)) continue;
        const cover = new Cover(kind, x, z, radius);
        if (kind === 'leaf') makeLeaf(cover, halfLength, halfWidth);
        else makeStone(cover, radius);
        this.scene.add(cover.object);
        this.list.push(cover);
        break;
      }
    }
  }

  touch(x: number, z: number): void {
    for (const c of this.list) if (c.distanceTo(x, z) < c.radius * 1.1) c.shake(1);
  }

  update(dt: number, lizards: readonly Lizard[]): void {
    for (const c of this.list) {
      for (const L of lizards) {
        if (L.speed > 0.25 && c.distanceTo(L.neck.x, L.neck.y) < c.radius) c.shake(Math.min(0.6, L.speed * 0.3));
      }
      c.update(dt);
    }
  }
}
