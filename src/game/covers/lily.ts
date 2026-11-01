import * as THREE from 'three';
import type { Walker } from '../creature';
import { rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import { bob, SURFACE } from '../water';
import type { Cover, CoverPart } from './cover';

let padTexture: THREE.CanvasTexture | null = null;

/** Glossy green pad with veins radiating from the centre. UVs: polar, u = angle, v = radius. */
function lilyTexture(): THREE.CanvasTexture {
  if (padTexture) return padTexture;
  const W = 256, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const r = 1 - (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const a = (x + 0.5) / W;
      const vein = smoothstep(0.035, 0, Math.abs(((a * 22) % 1) - 0.5) - 0.46) * smoothstep(0.05, 0.2, r);
      const n = noise3(a * 30, r * 8, 0, 51) * 0.6 + noise3(a * 90, r * 20, 0, 52) * 0.4;
      const edge = smoothstep(0.8, 1, r);
      const i = (y * W + x) * 4;
      const k = 0.8 + 0.3 * n;
      img.data[i] = (62 + 40 * edge) * k + vein * 25;
      img.data[i + 1] = (118 - 20 * edge) * k + vein * 30;
      img.data[i + 2] = (48 + 10 * edge) * k + vein * 10;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  padTexture = new THREE.CanvasTexture(canvas);
  padTexture.colorSpace = THREE.SRGBColorSpace;
  return padTexture;
}

/** A round pad with a V notch, its rim slightly turned up. */
function padGeometry(radius: number): THREE.BufferGeometry {
  const RINGS = 6, SEG = 40, NOTCH = 0.4;
  const pos: number[] = [0, 0, 0], uv: number[] = [0.5, 0], index: number[] = [];
  for (let r = 1; r <= RINGS; r++) {
    const f = r / RINGS;
    for (let s = 0; s <= SEG; s++) {
      const a = NOTCH / 2 + (s / SEG) * (TAU - NOTCH);
      const rr = radius * f * (1 + 0.03 * Math.sin(a * 5));
      pos.push(Math.cos(a) * rr, 0.012 * f ** 6, Math.sin(a) * rr);
      uv.push(s / SEG, f);
      const i = 1 + (r - 1) * (SEG + 1) + s;
      if (s < SEG) {
        if (r === 1) index.push(0, i + 1, i);
        else index.push(i - SEG - 1, i + 1, i, i - SEG - 1, i - SEG, i + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** A water lily: two rings of pointed petals around a yellow heart. */
function flower(colour: string): THREE.Group {
  const g = new THREE.Group();
  const petalGeo = new THREE.SphereGeometry(1, 10, 6);
  const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5 });
  for (const [count, len, tilt, off] of [[9, 0.075, 0.35, 0], [7, 0.055, 0.9, 0.4]] as const) {
    for (let k = 0; k < count; k++) {
      const a = (k / count) * TAU + off;
      const petal = new THREE.Mesh(petalGeo, mat);
      petal.scale.set(0.018, 0.006, len / 2);
      petal.position.set(Math.cos(a) * len * 0.45, 0.01 + tilt * 0.02, Math.sin(a) * len * 0.45);
      petal.rotation.set(0, Math.PI / 2 - a, 0);
      petal.rotateX(-tilt);
      petal.castShadow = true;
      g.add(petal);
    }
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: '#f2c63a', roughness: 0.6 }));
  heart.position.y = 0.02;
  g.add(heart);
  return g;
}

/** Pads bob on the surface and rock when touched. */
class Float implements CoverPart {
  constructor(private readonly pads: { mesh: THREE.Object3D; phase: number }[]) {}

  update(cover: Cover, _dt: number, _walkers: readonly Walker[]): void {
    const w = cover.wobble, t = cover.t;
    for (const p of this.pads) {
      p.mesh.position.y = SURFACE + 0.003 + bob(t, p.phase) + w * 0.012 * Math.sin(t * 9 + p.phase);
      p.mesh.rotation.x = w * 0.08 * Math.sin(t * 7 + p.phase);
      p.mesh.rotation.z = w * 0.08 * Math.cos(t * 6 + p.phase);
    }
  }
}

/** A few water lily pads floating together; fish rest in their shade, just under the surface. */
export function makeLilies(cover: Cover): void {
  const pads: { mesh: THREE.Object3D; phase: number }[] = [];
  const count = 2 + Math.floor(Math.random() * 3);
  const withFlower = Math.random() < 0.6 ? Math.floor(Math.random() * count) : -1;
  for (let k = 0; k < count; k++) {
    const a = (k / count) * TAU + rand(-0.4, 0.4);
    const r = k === 0 ? 0 : rand(0.15, 0.24);
    const radius = k === 0 ? rand(0.16, 0.2) : rand(0.1, 0.16);
    const mat = new THREE.MeshStandardMaterial({
      map: lilyTexture(), roughness: 0.35, color: new THREE.Color().setHSL(0, 0, rand(0.85, 1.05)), side: THREE.DoubleSide,
    });
    const pad = new THREE.Mesh(padGeometry(radius), mat);
    pad.castShadow = pad.receiveShadow = true;
    const holder = new THREE.Group();
    holder.position.set(Math.cos(a) * r, SURFACE, Math.sin(a) * r);
    holder.rotation.y = rand(0, TAU);
    holder.add(pad);
    if (k === withFlower) holder.add(flower(Math.random() < 0.5 ? '#f3a6c4' : '#f6f1e6'));
    cover.object.add(holder);
    pads.push({ mesh: holder, phase: rand(0, TAU) });
  }
  cover.depth = SURFACE - 0.13;
  cover.part = new Float(pads);
}
