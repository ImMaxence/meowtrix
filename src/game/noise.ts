import { smoothstep } from './math';

/** Integer hash to [0, 1). */
export function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x9e3779b1) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number) => smoothstep(0, 1, t);

/** Smooth 3D value noise in [0, 1). */
export function noise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * u;
  const x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * u;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * u;
  const x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/** 2D value noise that tiles every `period` lattice cells. */
export function noise2p(x: number, y: number, period: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi), v = fade(y - yi);
  const m = (n: number) => ((n % period) + period) % period;
  const c = (dx: number, dy: number) => hash3(m(xi + dx), m(yi + dy), 0, seed);
  const a = c(0, 0) + (c(1, 0) - c(0, 0)) * u;
  const b = c(0, 1) + (c(1, 1) - c(0, 1)) * u;
  return a + (b - a) * v;
}

/** Tileable fractal noise over a unit square, `period` cells at the base octave. */
export function fbm2p(x: number, y: number, period: number, octaves: number, seed = 0): number {
  let sum = 0, amp = 0.5, norm = 0, p = period;
  for (let o = 0; o < octaves; o++) {
    sum += noise2p(x * p, y * p, p, seed + o * 101) * amp;
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return sum / norm;
}

/** 2D value noise that tiles every `px` cells along x and `py` cells along y (stretched grain). */
export function noise2pp(x: number, y: number, px: number, py: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi), v = fade(y - yi);
  const mx = (n: number) => ((n % px) + px) % px;
  const my = (n: number) => ((n % py) + py) % py;
  const c = (dx: number, dy: number) => hash3(mx(xi + dx), my(yi + dy), 0, seed);
  const a = c(0, 0) + (c(1, 0) - c(0, 0)) * u;
  const b = c(0, 1) + (c(1, 1) - c(0, 1)) * u;
  return a + (b - a) * v;
}
