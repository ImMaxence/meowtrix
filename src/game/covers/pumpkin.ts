import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import type { Cover } from './cover';

/** Radius of the pumpkin; it is a little flattened. */
const R = 0.34;
const SQUASH = 0.8;

let maps: { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } | null = null;

/**
 * Orange ribbed skin, and a carved face that glows from inside. UVs are the sphere's: u around
 * (the face is at u = 0.25, toward +z), v from the top (canvas y = 0) to the bottom.
 */
function pumpkinMaps(): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  if (maps) return maps;
  const W = 256, H = 128;
  const skin = document.createElement('canvas');
  const glow = document.createElement('canvas');
  skin.width = glow.width = W;
  skin.height = glow.height = H;
  const sctx = skin.getContext('2d')!;
  const img = sctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const rib = Math.abs(Math.cos(u * TAU * 5));
      const k = (0.72 + 0.28 * Math.sqrt(rib)) * (0.9 + 0.2 * noise3(u * 40, v * 20, 0, 61)) * (0.8 + 0.2 * smoothstep(0, 0.3, v));
      const i = (y * W + x) * 4;
      img.data[i] = 232 * k;
      img.data[i + 1] = 118 * k;
      img.data[i + 2] = 22 * k;
      img.data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  const gctx = glow.getContext('2d')!;
  gctx.fillStyle = '#000';
  gctx.fillRect(0, 0, W, H);
  // Two triangle eyes and a jagged grin, carved into the skin and lit from inside.
  const face = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.fillStyle = color;
    const cx = 0.25 * W;
    for (const dx of [-0.045, 0.045]) {
      ctx.beginPath();
      ctx.moveTo(cx + (dx - 0.022) * W, 0.4 * H);
      ctx.lineTo(cx + (dx + 0.022) * W, 0.4 * H);
      ctx.lineTo(cx + dx * W, 0.3 * H);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 0.07 * W, 0.46 * H);
    for (let k = 0; k <= 8; k++) ctx.lineTo(cx + (-0.07 + k * 0.0175) * W, (k % 2 ? 0.49 : 0.47) * H);
    ctx.lineTo(cx + 0.06 * W, 0.53 * H);
    ctx.lineTo(cx - 0.06 * W, 0.53 * H);
    ctx.fill();
  };
  face(sctx, '#3a1a06');
  face(gctx, '#ffcf5a');
  const map = new THREE.CanvasTexture(skin);
  const glowMap = new THREE.CanvasTexture(glow);
  map.colorSpace = glowMap.colorSpace = THREE.SRGBColorSpace;
  maps = { map, glow: glowMap };
  return maps;
}

function pumpkinGeometry(): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, 48, 24);
  sphere.deleteAttribute('normal');
  const geo = mergeVertices(sphere, 1e-4);
  sphere.dispose();
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), r = Math.hypot(x, z);
    // Ten ribs, and a dimple around the stem.
    const k = 1 - 0.07 * (1 - Math.abs(Math.cos(a * 5))) * r;
    const dimple = 0.18 * smoothstep(0.45, 0, r) * (y > 0 ? 1 : 0);
    p.setXYZ(i, x * k, y - dimple, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * A carved Halloween pumpkin, hollow: animals slip in through a hole at the back (away from
 * the camera), and the grinning face toward the viewer glows.
 */
export function makePumpkin(cover: Cover): void {
  const { map, glow } = pumpkinMaps();
  const shell = new THREE.Mesh(
    pumpkinGeometry(),
    new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: '#ffb347', emissiveIntensity: 1.6, roughness: 0.55 }),
  );
  const size = R * rand(0.95, 1.1);
  shell.scale.set(size, size * SQUASH, size);
  shell.position.y = size * SQUASH * 0.92;
  shell.castShadow = shell.receiveShadow = true;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.045, 0.13, 8).translate(0, 0.065, 0),
    new THREE.MeshStandardMaterial({ color: '#5a6a2a', roughness: 0.8 }),
  );
  stem.position.y = shell.position.y + size * SQUASH * 0.82;
  stem.rotation.set(rand(-0.3, 0.3), 0, rand(-0.3, 0.3));
  stem.castShadow = true;
  cover.object.add(shell, stem);

  cover.entry = new THREE.Vector2(cover.x, cover.z - size - 0.2);
  cover.spot = new THREE.Vector2(cover.x, cover.z + 0.02);
  cover.clearance = 0.3;
  // The shell's walls, all around but for the hole at the back (angle 0 is the front, toward +z).
  const gap = 0.8;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI + gap + (k / 6) * (TAU - 2 * gap);
    cover.solids.push(cover.x + Math.sin(a) * size * 0.85, cover.z + Math.cos(a) * size * 0.85, 0.07);
  }
}
