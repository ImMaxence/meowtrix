import * as THREE from 'three';
import { clamp, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import { S_EYE, halfHeight, halfWidth } from './profile';

export type SkinId = 'green' | 'gecko' | 'skink' | 'desert';
export const SKIN_IDS: readonly SkinId[] = ['green', 'gecko', 'skink', 'desert'];
type Pattern = 'reticulate' | 'spots' | 'stripes' | 'bands';

export interface SkinPreset {
  id: SkinId;
  base: string;
  dorsal: string;
  belly: string;
  pattern: string;
  patterns: Pattern[];
  /** Optional tail colour (blue-tailed skink). */
  tail?: string;
  limb: string;
  eye: string;
}

export const SKINS: Record<SkinId, SkinPreset> = {
  green: {
    id: 'green', base: '#62a336', dorsal: '#4b8527', belly: '#d9e6ae', pattern: '#2f5a19',
    patterns: ['reticulate'], limb: '#548f2d', eye: '#2a1c0c',
  },
  gecko: {
    id: 'gecko', base: '#e3b544', dorsal: '#d9a537', belly: '#f3ead2', pattern: '#2b2016',
    patterns: ['spots', 'bands'], limb: '#dcb253', eye: '#1c1610',
  },
  skink: {
    id: 'skink', base: '#3b3631', dorsal: '#2c2824', belly: '#d8d2c0', pattern: '#f0de85',
    patterns: ['stripes'], tail: '#2f86ff', limb: '#3a3530', eye: '#120d08',
  },
  desert: {
    id: 'desert', base: '#d4a668', dorsal: '#c08e52', belly: '#f1e6cf', pattern: '#6e4422',
    patterns: ['bands', 'reticulate'], limb: '#c99a5c', eye: '#24180c',
  },
};

/** A CSS gradient approximating the skin, for the menu swatches. */
export function swatchCss(p: SkinPreset): string {
  return `linear-gradient(135deg, ${p.dorsal} 0 45%, ${p.pattern} 45% 58%, ${p.tail ?? p.base} 58% 100%)`;
}

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Texture layout: u runs along the body (snout 0 → tail tip 1), v runs around it. */
const W = 1024;
const H = 256;
const SCALE_SIZE = 0.0045;

/** Distance in v between two points on the ring, accounting for wrap-around. */
const dv = (a: number, b: number) => {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
};

let limbTexture: THREE.CanvasTexture | null = null;
const skinCache = new Map<SkinId, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture }>();

/** Skin textures, painted once per preset and shared by every lizard wearing it. */
export function skinTextures(p: SkinPreset, anisotropy: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  let textures = skinCache.get(p.id);
  if (!textures) {
    textures = makeSkinTextures(p);
    textures.map.anisotropy = anisotropy;
    skinCache.set(p.id, textures);
  }
  return textures;
}

/** Shared scale bump map for the legs. */
export function limbBump(): THREE.CanvasTexture {
  limbTexture ??= makeLimbBump();
  return limbTexture;
}

/** A tileable scale pattern for the legs (cylinder UVs: u around, v along). */
function makeLimbBump(): THREE.CanvasTexture {
  const N = 64, CELLS = 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const cu = (y / N) * CELLS, row = Math.floor(cu);
      const cv = (x / N) * CELLS + (row & 1 ? 0.5 : 0);
      const d = Math.max(Math.abs(cu - row - 0.5), Math.abs(cv - Math.floor(cv) - 0.5)) * 2;
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = (1 - d * d * d) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 10);
  return tex;
}

/** Paints the body colour map and the matching scale bump map. */
function makeSkinTextures(p: SkinPreset): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const colour = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colour.width = bumpCanvas.width = W;
  colour.height = bumpCanvas.height = H;
  const cctx = colour.getContext('2d')!;
  const bctx = bumpCanvas.getContext('2d')!;
  const img = cctx.createImageData(W, H);
  const bimg = bctx.createImageData(W, H);

  const base = hex(p.base), dorsal = hex(p.dorsal), belly = hex(p.belly), pattern = hex(p.pattern);
  const tail = p.tail ? hex(p.tail) : null;
  const has = (k: Pattern) => p.patterns.includes(k);

  // Per-column radius of the body, so patterns stay round on thin parts.
  const radius = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const s = (x + 0.5) / W;
    const w = halfWidth(s), h = halfHeight(s);
    radius[x] = Math.sqrt((w * w + h * h) / 2);
  }

  let r = 0, g = 0, b = 0;
  const blend = (c: RGB, t: number) => {
    r += (c[0] - r) * t;
    g += (c[1] - g) * t;
    b += (c[2] - b) * t;
  };

  for (let y = 0; y < H; y++) {
    // CanvasTexture is flipped, so the bottom row is v = 0.
    const v = 1 - (y + 0.5) / H;
    const ca = Math.cos(v * TAU), sa = Math.sin(v * TAU);
    // 1 on the spine, -1 on the belly.
    const top = Math.cos(TAU * (v - 0.25));
    const back = smoothstep(-0.35, 0.15, top);
    // 0 on the spine, 1 on the belly midline.
    const fromSpine = Math.acos(clamp(top, -1, 1)) / Math.PI;

    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const rad = radius[x];
      const ny = ca * rad, nz = sa * rad;

      r = belly[0]; g = belly[1]; b = belly[2];
      blend(base, back);
      blend(dorsal, smoothstep(0.5, 0.95, top));

      if (tail) {
        const t = smoothstep(0.4, 0.52, u);
        blend(tail, t * (0.65 + 0.35 * back));
      }

      if (has('reticulate')) {
        const n = noise3(u * 70, ny * 70, nz * 70, 7);
        const k = 0.86 + 0.28 * n;
        r *= k; g *= k; b *= k;
        blend(pattern, smoothstep(0.62, 0.82, n) * 0.55 * back);
      }
      if (has('spots')) {
        const n = noise3(u * 48, ny * 48, nz * 48, 3) * 0.7 + noise3(u * 110, ny * 110, nz * 110, 5) * 0.3;
        blend(pattern, smoothstep(0.6, 0.67, n) * smoothstep(-0.55, -0.2, top) * smoothstep(0.02, 0.05, u));
      }
      if (has('stripes')) {
        const d = Math.min(Math.abs(fromSpine), 1);
        let stripe = 0;
        for (const c of [0, 0.17, 0.36]) stripe += Math.exp(-(((d - c) / 0.022) ** 2));
        blend(pattern, clamp(stripe, 0, 1) * smoothstep(0.75, 0.42, u) * smoothstep(0.015, 0.05, u));
      }
      if (has('bands') && u > 0.14) {
        const n = noise3(u * 30, ny * 30, nz * 30, 11);
        const band = smoothstep(0.35, 0.75, Math.sin(TAU * u * 15 + n * 2.5));
        blend(pattern, band * smoothstep(-0.45, -0.1, top) * (u > 0.42 ? 0.8 : 0.45));
      }

      // Head details: eyelids, mouth, nostrils, ear openings.
      if (u < 0.13) {
        for (const side of [0, 0.5]) {
          const eyeV = side === 0 ? 0.089 : 0.411;
          const e = ((u - S_EYE) / 0.014) ** 2 + (dv(v, eyeV) / 0.06) ** 2;
          if (e < 1) blend(belly, 0.35 * (1 - e));

          const mouthV = side === 0 ? 1 - (0.04 - 0.02 * (u / 0.078)) : 0.5 + (0.04 - 0.02 * (u / 0.078));
          if (u > 0.004 && u < 0.078 && dv(v, mouthV) < 0.007) {
            r *= 0.45; g *= 0.45; b *= 0.45;
          }

          const nostril = ((u - 0.011) / 0.003) ** 2 + (dv(v, side === 0 ? 0.16 : 0.34) / 0.014) ** 2;
          if (nostril < 1) {
            r *= 0.3; g *= 0.3; b *= 0.3;
          }

          const ear = ((u - 0.104) / 0.006) ** 2 + (dv(v, side === 0 ? 0.03 : 0.47) / 0.035) ** 2;
          if (ear < 1) {
            r *= 0.6; g *= 0.6; b *= 0.6;
          }
        }
      }

      // Scales: small rounded cells, offset every other row.
      const circumference = TAU * rad;
      const cu = u / SCALE_SIZE;
      const row = Math.floor(cu);
      const cv = v * (circumference / SCALE_SIZE) + (row & 1 ? 0.5 : 0);
      const fu = cu - row, fv = cv - Math.floor(cv);
      const d = Math.max(Math.abs(fu - 0.5), Math.abs(fv - 0.5)) * 2;
      const bump = 1 - d * d * d;
      const shade = 0.84 + 0.16 * bump;
      r *= shade; g *= shade; b *= shade;

      const i = (y * W + x) * 4;
      img.data[i] = r * 255;
      img.data[i + 1] = g * 255;
      img.data[i + 2] = b * 255;
      img.data[i + 3] = 255;
      const bv = bump * 255;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv;
      bimg.data[i + 3] = 255;
    }
  }

  cctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  const map = new THREE.CanvasTexture(colour);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(bumpCanvas);
  for (const t of [map, bump]) {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return { map, bump };
}
