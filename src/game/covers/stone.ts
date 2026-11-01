import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rand, TAU } from '../math';
import { noise3 } from '../noise';
import { pick, type Cover } from './cover';

const STONE_COLORS = ['#6e6a63', '#625b51', '#77716a', '#58554f', '#6b5f52'];
/** Underwater rocks, greened by algae. */
const ROCK_COLORS = ['#4a5244', '#3f483d', '#525a4a', '#474b43'];

/** Lowest point under a stone slab: higher than a lizard standing tall. */
export const SLAB_CLEARANCE = 0.09;
/** Under an underwater rock there is room for a fish. */
const ROCK_CLEARANCE = 0.2;

/** A smooth, lumpy rock with darker hollows and lighter bumps. */
function lumpy(base: THREE.Color, seed: number, detail: number, amount: number): THREE.BufferGeometry {
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
}

/** A flat stone propped on pebbles, with a gap underneath. Underwater, a bigger rock with a cave under it. */
export function makeStone(cover: Cover, radius: number, underwater = false): void {
  const seed = rand(0, 100);
  const base = new THREE.Color(pick(underwater ? ROCK_COLORS : STONE_COLORS));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const clearance = underwater ? ROCK_CLEARANCE : SLAB_CLEARANCE;
  cover.clearance = clearance;
  if (underwater) {
    cover.depth = clearance * 0.45;
    cover.blocking = true;
  }

  const thickness = underwater ? 0.1 : 0.07;
  const slab = new THREE.Mesh(lumpy(base, seed, 4, 0.55), mat);
  slab.scale.set(radius, thickness, radius * rand(0.75, 0.95));
  slab.position.y = clearance + thickness * 1.25;
  slab.castShadow = slab.receiveShadow = true;

  const yaw = rand(0, TAU);
  const g = new THREE.Group();
  g.rotation.y = yaw;
  g.add(slab);
  const pebbles = underwater ? 4 : 3;
  for (let k = 0; k < pebbles; k++) {
    const a = (k / pebbles) * TAU + rand(-0.4, 0.4);
    const r = underwater ? rand(0.07, 0.1) : rand(0.045, 0.06);
    const lx = Math.cos(a) * radius * 0.85, lz = Math.sin(a) * radius * 0.72;
    const pebble = new THREE.Mesh(lumpy(base, seed + k, 2, 0.6), mat);
    pebble.scale.set(r, (clearance + 0.03) / 2, r);
    pebble.position.set(lx, (clearance + 0.03) / 2, lz);
    pebble.castShadow = pebble.receiveShadow = true;
    g.add(pebble);
    const w = cover.toWorld(lx, lz, yaw);
    cover.solids.push(w.x, w.y, r);
  }
  cover.object.add(g);
}
