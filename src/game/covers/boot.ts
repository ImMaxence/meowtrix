import * as THREE from 'three';
import { rand, smoothstep, TAU } from '../math';
import { noise3 } from '../noise';
import { pick, type Cover } from './cover';

/** Rubber colours: green, yellow, black, red, navy. */
const RUBBER = ['#3f6b36', '#d6a92c', '#2b2b2a', '#a1322a', '#2c3d5c'];
const MUD = new THREE.Color('#5a4630');

/** Shaft radius and length, foot length (boot standing: shaft along y, toe along z), before scaling. */
const R = 0.13;
const SHAFT = 0.5;
const FOOT = 0.37;
/** A big old boot: a lizard or a mouse fits all the way into the shaft. */
export const BOOT_SCALE = 1.7;

/** Darkens the boot with mud near the sole and in random splashes. */
function muddy(geo: THREE.BufferGeometry, base: THREE.Color, seed: number): THREE.BufferGeometry {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const splash = smoothstep(0.62, 0.75, noise3(x * 9 + seed, y * 9, z * 9, 41));
    const mud = Math.max(smoothstep(0.12, 0.0, y), splash * 0.8);
    c.copy(base).multiplyScalar(0.85 + 0.25 * noise3(x * 30, y * 30, z * 30, 42)).lerp(MUD, mud * 0.85);
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * A side profile (z forward, y up) extruded across the foot and rounded off: the shoe part of
 * the boot, or its sole.
 */
function extrudeProfile(points: readonly (readonly [number, number])[], width: number, bevel: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 2) {
    const [cx, cy] = points[i], [x, y] = points[(i + 1) % points.length];
    shape.quadraticCurveTo(cx, cy, x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10,
  });
  // Shape x becomes z (toward the toe), the extrusion runs across the foot.
  geo.rotateY(-Math.PI / 2).translate(width / 2 - bevel, 0, 0);
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  return geo;
}

/** Heel, instep rising into the shaft, and a rounded toe (pairs: control point, end point). */
const FOOT_PROFILE = [
  [-0.12, 0.03], [-0.15, 0.12], [-0.13, 0.21], [0.0, 0.24], [0.08, 0.2], [0.24, 0.13], [0.3, 0.11],
  [0.37, 0.09], [0.36, 0.03], [0.34, 0.0], [0.2, 0.0], [-0.1, 0.0], [-0.12, 0.03],
] as const;
const SOLE_PROFILE = [
  [-0.12, 0.0], [0.1, -0.005], [0.33, 0.0], [0.39, 0.01], [0.36, 0.03], [0.1, 0.032], [-0.13, 0.03], [-0.14, 0.01], [-0.12, 0.0],
] as const;

/**
 * An old rubber boot lying on its side. Animals crawl into the shaft through the opening,
 * so only their tail sticks out.
 */
export function makeBoot(cover: Cover): void {
  const seed = rand(0, 100);
  const base = new THREE.Color(pick(RUBBER));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
  const soleMat = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 });

  const shaftGeo = new THREE.CylinderGeometry(R, R * 0.92, SHAFT, 32, 6, true);
  shaftGeo.translate(0, SHAFT / 2 + 0.08, 0);
  const shaft = new THREE.Mesh(muddy(shaftGeo, base, seed), mat);
  const rim = new THREE.Mesh(muddy(new THREE.TorusGeometry(R, 0.012, 8, 32).rotateX(Math.PI / 2).translate(0, SHAFT + 0.08, 0), base, seed), mat);
  const foot = new THREE.Mesh(muddy(extrudeProfile(FOOT_PROFILE, 0.23, 0.035), base, seed), mat);
  foot.position.y = 0.02;
  const sole = new THREE.Mesh(extrudeProfile(SOLE_PROFILE, 0.235, 0.008), soleMat);

  const boot = new THREE.Group();
  for (const m of [shaft, rim, foot, sole]) {
    m.castShadow = m.receiveShadow = true;
    boot.add(m);
  }
  // Lying on its side: the shaft runs along -x on the ground, the toe along +z, the sole faces +x.
  const K = BOOT_SCALE;
  boot.rotation.z = Math.PI / 2;
  boot.scale.setScalar(K);
  boot.position.set(0.3 * K, R * K, -0.1 * K);

  const yaw = rand(0, TAU);
  const g = new THREE.Group();
  g.rotation.y = yaw;
  g.add(boot);
  cover.object.add(g);

  // Shaft axis: local x from the opening to the ankle (0.22 K), at z = -0.1 K once centred.
  // Animals stop deep inside, so the head and body are hidden.
  const opening = (0.3 - SHAFT - 0.08) * K, axis = -0.1 * K;
  cover.entry = cover.toWorld(opening - 0.2, axis, yaw);
  cover.spot = cover.toWorld(opening + SHAFT * K * 0.72, axis, yaw);
  cover.clearance = R * K * 1.6;
  for (let x = opening + 0.06 * K; x < 0.2 * K; x += 0.12 * K) {
    for (const side of [-1, 1]) {
      const w = cover.toWorld(x, axis + side * (R * K + 0.02), yaw);
      cover.solids.push(w.x, w.y, 0.03 * K);
    }
  }
  for (let z = 0.15; z < FOOT; z += 0.1) {
    const w = cover.toWorld(0.22 * K, axis + z * K, yaw);
    cover.solids.push(w.x, w.y, 0.08 * K);
  }
}
