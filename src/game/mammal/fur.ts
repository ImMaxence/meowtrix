import * as THREE from 'three';
import { curve } from '../body/curve';
import { clamp, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import type { Coat, MammalBuild } from './builds';

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * The body texture of a mammal: fur streaks, a paler belly, a darker line along the back and,
 * for mice, a bare ringed tail. u runs along the body (nose 0 → tail tip 1), v around it (0.25 on the back).
 */
export function furTexture(build: MammalBuild, coat: Coat): THREE.CanvasTexture {
  const key = `${build.id}:${coat.id}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const W = build.length > 1 ? 1024 : 512, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  const fur = hex(coat.fur), belly = hex(coat.belly), skin = hex(coat.skin);
  const tailColour = coat.tail && coat.tail !== 'bare' ? hex(coat.tail) : fur;
  const L = build.length, b = build;
  const radius = new Float32Array(W);
  for (let x = 0; x < W; x++) radius[x] = curve(b.halfWidth, (x + 0.5) / W);

  let r = 0, g = 0, bl = 0;
  const blend = (c: RGB, t: number) => {
    r += (c[0] - r) * t;
    g += (c[1] - g) * t;
    bl += (c[2] - bl) * t;
  };

  for (let y = 0; y < H; y++) {
    const v = 1 - (y + 0.5) / H;
    // 1 on the back, -1 under the belly.
    const top = Math.cos(TAU * (v - 0.25));
    const back = smoothstep(-0.45, 0.1, top);
    const cy = Math.cos(v * TAU), sy = Math.sin(v * TAU);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W, a = u * L, rad = radius[x];
      const ny = cy * rad, nz = sy * rad;
      const tail = smoothstep(b.sRump - 0.01, b.sRump + 0.01, u);
      // Streaky noise: fine across the body, long along it.
      const streak = noise3(a * 75, ny * 120, nz * 120, 5) * 0.5 + noise3(a * 31, ny * 400, nz * 400, 6) * 0.5;
      // Long fur on a bushy tail shows deeper streaks.
      const shade = b.fluffy && tail > 0.5 ? 0.62 + 0.6 * streak : 0.82 + 0.3 * streak + 0.08 * back;

      r = belly[0]; g = belly[1]; bl = belly[2];
      blend(tail > 0.5 ? tailColour : fur, back);
      // A darker line along the spine gives the back some volume from above.
      const spine = smoothstep(0.7, 1, top) * 0.18;
      r *= 1 - spine;
      g *= 1 - spine;
      bl *= 1 - spine;

      let k = shade;
      if (coat.tail === 'bare' && tail > 0) {
        // A bare pink tail with fine rings.
        const ring = 0.92 + 0.08 * Math.sin(a * 1125);
        r += (skin[0] * ring - r) * tail;
        g += (skin[1] * ring - g) * tail;
        bl += (skin[2] * ring - bl) * tail;
        k = 1 + (shade - 1) * (1 - tail);
      }
      const i = (y * W + x) * 4;
      img.data[i] = clamp(r * k, 0, 255);
      img.data[i + 1] = clamp(g * k, 0, 255);
      img.data[i + 2] = clamp(bl * k, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapT = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}
