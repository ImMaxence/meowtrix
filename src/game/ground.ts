import * as THREE from 'three';
import { paint, WATER_TINT, type GroundTheme, type WaterGround } from './ground-paint';

export {
  GROUND_LIGHT, groundRoughness, LAND_GROUNDS, SKY_GROUNDS, WATER_GROUNDS, WATER_TINT,
  type GroundTheme, type LandGround, type SkyGround, type WaterGround,
} from './ground-paint';

/** Side of the full tile, and of the quick one shown while it is painted. */
const FULL = 512;
const QUICK = 128;

const quickCanvases = new Map<GroundTheme, HTMLCanvasElement>();

/** The small tile, painted at once (a few milliseconds): the menu's preview, and the ground's first look. */
function quickCanvas(theme: GroundTheme): HTMLCanvasElement {
  let canvas = quickCanvases.get(theme);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = QUICK;
    paint(theme, QUICK, canvas);
    quickCanvases.set(theme, canvas);
  }
  return canvas;
}

// --- The full tile, off the main thread -----------------------------------------

type Ready = (image: ImageBitmap | HTMLCanvasElement) => void;

let worker: Worker | null | undefined;
let nextJob = 1;
const jobs = new Map<number, Ready>();

/** The painter worker, if the browser can paint off screen; null otherwise. Made on first use. */
function painter(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return (worker = null);
  try {
    worker = new Worker(new URL('./ground.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (e: MessageEvent<{ id: number; bitmap: ImageBitmap }>) => {
      jobs.get(e.data.id)?.(e.data.bitmap);
      jobs.delete(e.data.id);
    });
    worker.addEventListener('error', () => {
      // Painting fails there (an old browser): the main thread takes over for what is pending.
      for (const [id, ready] of jobs) {
        jobs.delete(id);
        ready(paintHere(pendingThemes.get(id)!));
      }
      worker = null;
    });
  } catch {
    worker = null;
  }
  return worker;
}

const pendingThemes = new Map<number, GroundTheme>();

function paintHere(theme: GroundTheme): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = FULL;
  paint(theme, FULL, canvas);
  return canvas;
}

/** Paints the full tile in the worker, or in a later task on the main thread, then calls `ready`. */
function paintFull(theme: GroundTheme, ready: Ready): void {
  const w = painter();
  if (!w) {
    setTimeout(() => ready(paintHere(theme)), 0);
    return;
  }
  const id = nextJob++;
  jobs.set(id, ready);
  pendingThemes.set(id, theme);
  w.postMessage({ id, theme, size: FULL });
}

// --- Textures -----------------------------------------------------------------

interface Kept {
  texture: THREE.Texture;
  full: boolean;
}

const textures = new Map<GroundTheme, Kept>();

/**
 * The ground's texture, kept for good once made: switching back is free, and nothing must dispose
 * of it. It starts as the quick tile, so the ground shows at once, and gets the full one as soon
 * as it is painted; `onUpgrade` is called then, to draw the scene again.
 */
export function makeGroundTexture(theme: GroundTheme, onUpgrade?: () => void): THREE.Texture {
  const kept = textures.get(theme);
  if (kept) return kept.texture;
  const texture: THREE.Texture = new THREE.CanvasTexture(quickCanvas(theme));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const entry: Kept = { texture, full: false };
  textures.set(theme, entry);
  paintFull(theme, (image) => {
    texture.image = image;
    texture.needsUpdate = true;
    entry.full = true;
    onUpgrade?.();
  });
  return texture;
}

const previews = new Map<GroundTheme, string>();

/** A small picture of the ground for the menu, with the water colour over the water grounds. */
export function groundPreview(theme: GroundTheme): string {
  let url = previews.get(theme);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = QUICK;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(quickCanvas(theme), 0, 0);
    if (theme in WATER_TINT) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = WATER_TINT[theme as WaterGround];
      ctx.fillRect(0, 0, QUICK, QUICK);
    }
    url = canvas.toDataURL();
    previews.set(theme, url);
  }
  return url;
}
