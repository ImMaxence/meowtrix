import * as THREE from 'three';
import { rand, smoothstep, TAU } from '../math';
import { pick, type Cover } from './cover';

/** Pastel shells and their decoration colours. */
const PAINTS = [
  ['#f6b8c8', '#7fc4e8'], ['#a9dcf2', '#f4d35e'], ['#f7e08a', '#e86a92'], ['#b8e6c4', '#b48ad8'], ['#d5c2f0', '#f49a5c'],
] as const;
const CHOCOLATE = ['#5a3420', '#6e4128', '#4a2a18'];

/** Room under the shell: like a stone, a lizard or a mouse fits. */
const CLEARANCE = 0.09;

const textures = new Map<number, THREE.CanvasTexture>();

/** A painted Easter egg: pastel with a zigzag band and dots. u around, v from the top. */
function eggTexture(paint: number): THREE.CanvasTexture {
  let tex = textures.get(paint);
  if (tex) return tex;
  const [base, deco] = PAINTS[paint];
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = deco;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  for (const y0 of [0.42, 0.62]) {
    ctx.beginPath();
    for (let k = 0; k <= 16; k++) ctx.lineTo((k / 16) * W, (y0 + (k % 2 ? 0.06 : -0.06)) * H);
    ctx.stroke();
  }
  ctx.fillStyle = deco;
  for (let k = 0; k < 10; k++) {
    ctx.beginPath();
    ctx.arc(((k + 0.5) / 10) * W, 0.22 * H, 5, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.6;
  for (let k = 0; k < 8; k++) {
    ctx.beginPath();
    ctx.arc(((k + 0.25) / 8) * W, 0.8 * H, 4, 0, TAU);
    ctx.fill();
  }
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  textures.set(paint, tex);
  return tex;
}

/** The top of an eggshell, broken off with a zigzag edge. */
function shellGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 40, 20, 0, TAU, 0, Math.PI * 0.62);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    // Pull the lowest rows up and down in a zigzag: the cracked edge.
    const edge = smoothstep(0.1, -0.35, v.y);
    const zig = Math.abs(((((a / TAU) * 14) % 1) + 1) % 1 - 0.5) * 2;
    p.setY(i, v.y + edge * (zig - 0.5) * 0.18);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Half of a giant painted Easter egg, dome up, propped on little chocolate eggs:
 * animals crawl underneath, like under a stone.
 */
export function makeEgg(cover: Cover): void {
  const r = cover.radius * 0.9;
  const shell = new THREE.Mesh(
    shellGeometry(),
    new THREE.MeshStandardMaterial({ map: eggTexture(Math.floor(Math.random() * PAINTS.length)), roughness: 0.45, side: THREE.DoubleSide }),
  );
  // Egg-shaped: longer than wide, and tall.
  shell.scale.set(r, r * 1.05, r * 1.3);
  shell.position.y = CLEARANCE + r * 0.35;
  shell.castShadow = shell.receiveShadow = true;

  const yaw = rand(0, TAU);
  const g = new THREE.Group();
  g.rotation.y = yaw;
  g.add(shell);
  const choc = new THREE.MeshPhysicalMaterial({ color: pick(CHOCOLATE), roughness: 0.35, clearcoat: 0.6 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + rand(-0.3, 0.3);
    const lx = Math.cos(a) * r * 0.8, lz = Math.sin(a) * r * 1.05;
    const mini = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), choc);
    const h = (CLEARANCE + r * 0.12) / 2;
    mini.scale.set(h * 0.75, h, h * 0.75);
    mini.position.set(lx, h, lz);
    mini.castShadow = true;
    g.add(mini);
    const w = cover.toWorld(lx, lz, yaw);
    cover.solids.push(w.x, w.y, h * 0.75);
  }
  cover.object.add(g);
  cover.clearance = CLEARANCE;
}
