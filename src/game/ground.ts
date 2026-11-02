import * as THREE from 'three';
import { clamp, smoothstep, TAU } from './math';
import { fbm2p, hash3, noise2pp } from './noise';

export type LandGround = 'stone' | 'sand' | 'night' | 'concrete' | 'wood' | 'lawn';
export type WaterGround = 'pond' | 'lagoon' | 'river';
export type SkyGround = 'meadow' | 'dusk' | 'moonlit';
export type GroundTheme = LandGround | WaterGround | SkyGround;

export const LAND_GROUNDS: readonly LandGround[] = ['stone', 'sand', 'night', 'concrete', 'wood', 'lawn'];
export const WATER_GROUNDS: readonly WaterGround[] = ['pond', 'lagoon', 'river'];
export const SKY_GROUNDS: readonly SkyGround[] = ['meadow', 'dusk', 'moonlit'];

/** How the sky grounds light the scene: a low warm sun at dusk, moonlight at night (strength 1 = daylight). */
export const GROUND_LIGHT: Partial<Record<GroundTheme, { tint: string; power: number }>> = {
  dusk: { tint: '#ffb070', power: 0.55 },
  moonlit: { tint: '#7d94e0', power: 0.16 },
};

/** Colour of the water over each water ground. */
export const WATER_TINT: Record<WaterGround, string> = { pond: '#3d6440', lagoon: '#25a9bd', river: '#4a7d8c' };

/** Varnished wood shines a little; everything else is matte. */
export const groundRoughness = (theme: GroundTheme): number => (theme === 'wood' ? 0.55 : 0.95);

type RGB = readonly [number, number, number];

interface Palette {
  dark: string;
  light: string;
  speck: string;
  pebbles: number;
  /** Pebble size, in pixels of a 512 tile. */
  pebbleSize: number;
  ripples: number;
}

/** The noisy grounds: a two-colour fractal base, specks, sand ripples and pebbles. */
const NOISY: Partial<Record<GroundTheme, Palette>> = {
  stone: { dark: '#3b3835', light: '#57524b', speck: '#736c62', pebbles: 90, pebbleSize: 6, ripples: 0 },
  sand: { dark: '#b39769', light: '#d3bb8f', speck: '#8f7550', pebbles: 35, pebbleSize: 6, ripples: 0.07 },
  night: { dark: '#0e1115', light: '#1a1f26', speck: '#2b323c', pebbles: 50, pebbleSize: 6, ripples: 0 },
  pond: { dark: '#2a2a1c', light: '#4a4630', speck: '#6b6a40', pebbles: 60, pebbleSize: 7, ripples: 0 },
  lagoon: { dark: '#cdb88a', light: '#efe0b6', speck: '#a8916a', pebbles: 14, pebbleSize: 5, ripples: 0.09 },
  river: { dark: '#3c3a34', light: '#5a554a', speck: '#7a7466', pebbles: 420, pebbleSize: 15, ripples: 0 },
};

const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Draws `fn` at every wrap offset, so whatever it paints near an edge shows up on the other side. */
function wrapped(ctx: CanvasRenderingContext2D, size: number, x: number, y: number, fn: () => void): void {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      ctx.save();
      ctx.translate(x + ox, y + oy);
      fn();
      ctx.restore();
    }
  }
}

function fillPixels(ctx: CanvasRenderingContext2D, size: number, shade: (u: number, v: number, x: number, y: number) => RGB): void {
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = shade(x / size, y / size, x, y);
      const i = (y * size + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function pebbles(ctx: CanvasRenderingContext2D, size: number, p: Palette, seed: number): void {
  const dark = rgb(p.dark), light = rgb(p.light);
  const scale = size / 512;
  for (let k = 0; k < p.pebbles; k++) {
    const x = hash3(k, 1, 0, seed) * size, y = hash3(k, 2, 0, seed) * size;
    const r = (1.5 + hash3(k, 3, 0, seed) ** 2 * p.pebbleSize) * scale;
    const rot = hash3(k, 4, 0, seed) * Math.PI;
    const tone = hash3(k, 5, 0, seed);
    // River stones come in a few hues; the others are shades of the ground.
    const tint = seed === 8 ? mix(rgb(['#8a8274', '#6d6a63', '#9a7d5c', '#5f5a52'][k % 4]), light, 0.15) : light;
    const c = dark.map((d, i) => Math.round(d + (tint[i] - d) * (0.3 + tone * 0.9)));
    wrapped(ctx, size, x, y, () => {
      ctx.rotate(rot);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(r * 0.25, r * 0.3, r, r * 0.75, 0, 0, TAU);
      ctx.fill();
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      grad.addColorStop(0, `rgb(${c.map((v) => Math.min(255, v + 30)).join(',')})`);
      grad.addColorStop(1, `rgb(${c.join(',')})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.75, 0, 0, TAU);
      ctx.fill();
    });
  }
}

function paintNoisy(ctx: CanvasRenderingContext2D, size: number, p: Palette): void {
  const dark = rgb(p.dark), light = rgb(p.light), speck = rgb(p.speck);
  fillPixels(ctx, size, (u, v, x, y) => {
    let n = fbm2p(u, v, 6, 5, 17);
    if (p.ripples) n += p.ripples * Math.sin(TAU * (v * 14 + fbm2p(u, v, 3, 2, 5) * 2.2));
    const grain = hash3(x, y, 0, 99);
    const t = clamp((n - 0.5) * 1.3 + 0.5 + (grain - 0.5) * 0.12, 0, 1);
    const c = mix(dark, light, t);
    return grain > 0.985 ? mix(c, speck, 0.6) : c;
  });
}

/** Poured concrete: fine aggregate, darker stains, an expansion joint along each tile edge and a few hairline cracks. */
function paintConcrete(ctx: CanvasRenderingContext2D, size: number): void {
  const dark = rgb('#7d7a74'), light = rgb('#a6a29a'), joint = rgb('#4e4c48');
  fillPixels(ctx, size, (u, v, x, y) => {
    const n = fbm2p(u, v, 5, 5, 61);
    const stain = smoothstep(0.55, 0.75, fbm2p(u, v, 2, 3, 62));
    const grain = hash3(x, y, size, 63);
    let c = mix(dark, light, clamp(0.35 + (n - 0.5) * 0.9 + (grain - 0.5) * 0.18, 0, 1));
    c = mix(c, dark, stain * 0.35);
    if (grain > 0.97) c = mix(c, hash3(x, y, 1, 64) > 0.5 ? joint : light, 0.5);
    const crack = smoothstep(0.012, 0.0, Math.abs(fbm2p(u, v, 3, 4, 65) - 0.5)) * smoothstep(0.6, 0.7, fbm2p(u, v, 2, 2, 66));
    c = mix(c, joint, crack * 0.7);
    // Joints sit on the tile edges: the tile spans 2.5 world units.
    const e = Math.min(u, 1 - u, v, 1 - v) * size;
    return mix(c, joint, smoothstep(2.2 * (size / 512), 0.4, e));
  });
}

/** Wooden floor: five rows of planks per tile, with grain, staggered ends and dark gaps. */
function paintWood(ctx: CanvasRenderingContext2D, size: number): void {
  const ROWS = 5;
  const tones = ['#9a6b3f', '#8a5d35', '#a97848', '#7f5530', '#b07f4e'].map(rgb);
  const gap = rgb('#2e1f14');
  fillPixels(ctx, size, (u, v) => {
    const rowF = v * ROWS, row = Math.floor(rowF), fv = rowF - row;
    // Each row's plank ends are offset; planks are a whole tile long, so the tile still wraps.
    const end = hash3(row, 0, 0, 91);
    const pu = (u + end) % 1;
    const plank = row * 7 + (u + end >= 1 ? 1 : 0);
    const base = tones[Math.floor(hash3(plank, 1, 0, 92) * tones.length)];
    const grain = noise2pp(u * 3, v * 80, 3, 80, 93) * 0.5 + noise2pp(u * 9, v * 220, 9, 220, 94) * 0.3;
    const rings = Math.sin(TAU * (v * ROWS * 3 + noise2pp(u * 2, v * 12, 2, 12, 95) * 2.5 + hash3(plank, 2, 0, 96) * 5));
    let c = mix(base, [base[0] * 0.62, base[1] * 0.58, base[2] * 0.55], clamp(grain * 0.6 + smoothstep(0.6, 1, rings) * 0.35, 0, 1));
    const knot = smoothstep(0.09, 0.0, Math.hypot((pu - hash3(plank, 3, 0, 97)) * 3, (fv - 0.5) * 0.8));
    c = mix(c, gap, knot * 0.6);
    const edge = Math.min(fv, 1 - fv) * (size / ROWS);
    const endGap = Math.min(pu, 1 - pu) * size;
    return mix(c, gap, Math.max(smoothstep(1.6 * (size / 512), 0.3, edge), smoothstep(1.4 * (size / 512), 0.2, endGap)));
  });
}

interface Grass {
  dark: string;
  light: string;
  soil: string;
  /** Blade colour, per channel, as a share of its brightness. */
  blade: RGB;
  /** Wild flowers scattered over it. */
  flowers: readonly string[];
  flowerCount: number;
}

const GRASSES: Record<'lawn' | SkyGround, Grass> = {
  lawn: { dark: '#2f5320', light: '#5d8a35', soil: '#4a3b26', blade: [0.55, 1, 0.35], flowers: [], flowerCount: 0 },
  meadow: { dark: '#3a6224', light: '#6f9a3c', soil: '#55452a', blade: [0.6, 1, 0.35], flowers: ['#ffffff', '#f6d23a', '#f4f0e6', '#c9a6ee'], flowerCount: 140 },
  dusk: { dark: '#5a5a26', light: '#9a8a44', soil: '#5e4a2a', blade: [0.95, 0.9, 0.42], flowers: ['#f2e2b0', '#e8b040', '#d07a48'], flowerCount: 60 },
  moonlit: { dark: '#16261c', light: '#2a4232', soil: '#1e2420', blade: [0.42, 0.75, 0.62], flowers: ['#dfe6ff', '#c8d4f0'], flowerCount: 50 },
};

/** Grass: mottled green with thousands of short blades on top, and wild flowers on the sky grounds. */
function paintGrass(ctx: CanvasRenderingContext2D, size: number, g: Grass): void {
  const dark = rgb(g.dark), light = rgb(g.light), soil = rgb(g.soil);
  fillPixels(ctx, size, (u, v, x, y) => {
    const n = fbm2p(u, v, 6, 5, 71);
    const bare = smoothstep(0.66, 0.78, fbm2p(u, v, 3, 3, 72));
    return mix(mix(dark, light, clamp(n * 1.2 - 0.1 + (hash3(x, y, size, 73) - 0.5) * 0.2, 0, 1)), soil, bare * 0.55);
  });
  const scale = size / 512;
  const blades = Math.round(9000 * scale * scale);
  ctx.lineCap = 'round';
  for (let k = 0; k < blades; k++) {
    const x = hash3(k, 1, 0, 74) * size, y = hash3(k, 2, 0, 74) * size;
    const a = hash3(k, 3, 0, 74) * TAU, len = (3 + hash3(k, 4, 0, 74) * 7) * scale;
    const level = 70 + hash3(k, 5, 0, 74) * 90;
    ctx.strokeStyle = `rgba(${g.blade.map((c) => Math.round(level * c)).join(',')},0.75)`;
    ctx.lineWidth = Math.max(0.6, 1.3 * scale);
    wrapped(ctx, size, x, y, () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    });
  }
  // Five round petals around a yellow heart.
  const flowers = Math.round(g.flowerCount * scale * scale);
  for (let k = 0; k < flowers; k++) {
    const x = hash3(k, 1, 0, 77) * size, y = hash3(k, 2, 0, 77) * size;
    const r = (2.4 + hash3(k, 3, 0, 77) * 2.4) * scale;
    const petal = g.flowers[k % g.flowers.length];
    wrapped(ctx, size, x, y, () => {
      ctx.rotate(hash3(k, 4, 0, 77) * TAU);
      ctx.fillStyle = petal;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, r * 0.6, r * 0.4, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#e8b520';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.38, 0, TAU);
      ctx.fill();
    });
  }
}

/** Bits of dead leaves and green algae on a pond bottom. */
function pondDetails(ctx: CanvasRenderingContext2D, size: number): void {
  const scale = size / 512;
  for (let k = 0; k < 40; k++) {
    const x = hash3(k, 1, 0, 75) * size, y = hash3(k, 2, 0, 75) * size;
    const r = (8 + hash3(k, 3, 0, 75) * 16) * scale;
    const leaf = k % 3 !== 0;
    ctx.fillStyle = leaf ? `rgba(${90 + hash3(k, 4, 0, 75) * 40},60,30,0.55)` : 'rgba(80,120,40,0.35)';
    wrapped(ctx, size, x, y, () => {
      ctx.rotate(hash3(k, 5, 0, 75) * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * (leaf ? 0.45 : 0.9), 0, 0, TAU);
      ctx.fill();
    });
  }
}

/** Little shells scattered on the lagoon sand. */
function shells(ctx: CanvasRenderingContext2D, size: number): void {
  const scale = size / 512;
  for (let k = 0; k < 22; k++) {
    const x = hash3(k, 1, 0, 76) * size, y = hash3(k, 2, 0, 76) * size;
    const r = (2.5 + hash3(k, 3, 0, 76) * 4) * scale;
    ctx.fillStyle = ['#f6eee2', '#f1d3c2', '#e8dccb'][k % 3];
    wrapped(ctx, size, x, y, () => {
      ctx.rotate(hash3(k, 4, 0, 76) * TAU);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 1.2, 0, 0, r);
      ctx.quadraticCurveTo(-r * 1.2, 0, 0, -r);
      ctx.fill();
    });
  }
}

function paint(theme: GroundTheme, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const noisy = NOISY[theme];
  if (noisy) {
    paintNoisy(ctx, size, noisy);
    if (theme === 'pond') pondDetails(ctx, size);
    pebbles(ctx, size, noisy, theme === 'river' ? 8 : 3);
    if (theme === 'lagoon') shells(ctx, size);
  } else if (theme === 'concrete') paintConcrete(ctx, size);
  else if (theme === 'wood') paintWood(ctx, size);
  else paintGrass(ctx, size, GRASSES[theme as keyof typeof GRASSES]);
  return canvas;
}

/** A seamless ground tile. */
const textures = new Map<GroundTheme, THREE.CanvasTexture>();

/** Painted once per ground and kept: switching back is free, and nothing must dispose of it. */
export function makeGroundTexture(theme: GroundTheme): THREE.CanvasTexture {
  const kept = textures.get(theme);
  if (kept) return kept;
  const tex = new THREE.CanvasTexture(paint(theme, 512));
  textures.set(theme, tex);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const previews = new Map<GroundTheme, string>();

/** A small picture of the ground for the menu, with the water colour over the water grounds. */
export function groundPreview(theme: GroundTheme): string {
  let url = previews.get(theme);
  if (!url) {
    const canvas = paint(theme, 128);
    if (theme in WATER_TINT) {
      const ctx = canvas.getContext('2d')!;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = WATER_TINT[theme as WaterGround];
      ctx.fillRect(0, 0, 128, 128);
    }
    url = canvas.toDataURL();
    previews.set(theme, url);
  }
  return url;
}
