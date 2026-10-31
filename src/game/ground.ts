import * as THREE from 'three';
import { TAU } from './math';
import { fbm2p, hash3 } from './noise';

export type GroundTheme = 'stone' | 'sand' | 'night';

interface Palette {
  dark: string;
  light: string;
  speck: string;
  pebbles: number;
  ripples: number;
}

const THEMES: Record<GroundTheme, Palette> = {
  stone: { dark: '#3b3835', light: '#57524b', speck: '#736c62', pebbles: 90, ripples: 0 },
  sand: { dark: '#b39769', light: '#d3bb8f', speck: '#8f7550', pebbles: 35, ripples: 0.07 },
  night: { dark: '#0e1115', light: '#1a1f26', speck: '#2b323c', pebbles: 50, ripples: 0 },
};

const SIZE = 512;

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/** A seamless ground tile. */
export function makeGroundTexture(theme: GroundTheme): THREE.CanvasTexture {
  const p = THEMES[theme];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  const dark = rgb(p.dark), light = rgb(p.light), speck = rgb(p.speck);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE, v = y / SIZE;
      let n = fbm2p(u, v, 6, 5, 17);
      if (p.ripples) n += p.ripples * Math.sin(TAU * (v * 14 + fbm2p(u, v, 3, 2, 5) * 2.2));
      const grain = hash3(x, y, 0, 99);
      const t = Math.min(1, Math.max(0, (n - 0.5) * 1.3 + 0.5 + (grain - 0.5) * 0.12));
      const i = (y * SIZE + x) * 4;
      for (let c = 0; c < 3; c++) {
        let value = dark[c] + (light[c] - dark[c]) * t;
        if (grain > 0.985) value = value * 0.4 + speck[c] * 0.6;
        img.data[i + c] = value;
      }
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Pebbles, drawn at every wrap offset so the tile stays seamless.
  for (let k = 0; k < p.pebbles; k++) {
    const x = hash3(k, 1, 0, 3) * SIZE, y = hash3(k, 2, 0, 3) * SIZE;
    const r = 1.5 + hash3(k, 3, 0, 3) ** 2 * 6;
    const rot = hash3(k, 4, 0, 3) * Math.PI;
    const tone = hash3(k, 5, 0, 3);
    const c = dark.map((d, i) => Math.round(d + (light[i] - d) * (0.3 + tone * 0.9)));
    for (const ox of [-SIZE, 0, SIZE]) {
      for (const oy of [-SIZE, 0, SIZE]) {
        ctx.save();
        ctx.translate(x + ox, y + oy);
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
        ctx.restore();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
