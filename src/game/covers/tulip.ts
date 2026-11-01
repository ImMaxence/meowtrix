import * as THREE from 'three';
import type { Walker } from '../creature';
import { rand, smoothstep, TAU } from '../math';
import { pick, type Cover, type CoverPart } from './cover';

const PETALS = ['#d8262e', '#f2c230', '#e9659a', '#f4efe6', '#7b3fa8', '#ef7a26'];
const LEAF = new THREE.Color('#4d7a48');

/** A tulip cup: six pointed petals around a closed bottom. */
const CUP_GEO = (() => {
  const profile = [
    [0.0, 0.0], [0.022, 0.004], [0.038, 0.018], [0.046, 0.042], [0.045, 0.066], [0.038, 0.088],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(profile, 36);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    // Petal tips rise above the rim, alternately inner and outer.
    const tips = Math.pow(Math.max(0, Math.cos(a * 3)), 3) + 0.7 * Math.pow(Math.max(0, Math.cos(a * 3 + Math.PI)), 3);
    p.setY(i, y + 0.024 * tips * smoothstep(0.04, 0.088, y));
  }
  geo.computeVertexNormals();
  geo.userData.shared = true;
  return geo;
})();

/** A broad leaf arching out from the base of the stem and down to the ground. */
function leafGeometry(length: number, width: number, height: number): THREE.BufferGeometry {
  const NT = 14, NV = 4;
  const pos: number[] = [], index: number[] = [];
  for (let i = 0; i <= NT; i++) {
    const t = i / NT;
    const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * width;
    const y = height * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.004;
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1;
      // Folded along the midrib.
      pos.push(v * w, y + Math.abs(v) * w * 0.35, t * length);
      if (i < NT && j < NV) {
        const a = i * (NV + 1) + j, b = a + NV + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Each flower sways on its stem; touching the clump shakes them all. */
class Sway implements CoverPart {
  constructor(private readonly heads: { group: THREE.Group; phase: number }[]) {}

  update(cover: Cover, _dt: number, walkers: readonly Walker[]): void {
    let brush = 0;
    for (const w of walkers) if (w.speed > 0.3 && cover.distanceTo(w.pos.x, w.pos.y) < cover.radius) brush = 0.4;
    const amp = 0.04 + 0.35 * Math.max(cover.wobble, brush);
    for (const h of this.heads) {
      h.group.rotation.x = amp * Math.sin(cover.t * 2.1 + h.phase);
      h.group.rotation.z = amp * Math.cos(cover.t * 1.7 + h.phase * 1.3);
    }
  }
}

/** A clump of tulips: animals hide under the arching leaves, below the flowers. */
export function makeTulips(cover: Cover): void {
  const leafMat = new THREE.MeshStandardMaterial({ color: LEAF, roughness: 0.6, side: THREE.DoubleSide });
  const stemMat = new THREE.MeshStandardMaterial({ color: '#5b8a45', roughness: 0.6 });
  const colour = pick(PETALS);
  const heads: { group: THREE.Group; phase: number }[] = [];
  const count = 5 + Math.floor(Math.random() * 3);
  for (let k = 0; k < count; k++) {
    const a = (k / count) * TAU + rand(-0.3, 0.3);
    const r = rand(0.07, 0.17);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const height = rand(0.26, 0.38);

    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(leafGeometry(rand(0.2, 0.28), rand(0.035, 0.05), rand(0.08, 0.12)), leafMat);
      leaf.position.set(x, 0, z);
      leaf.rotation.y = Math.atan2(x, z) + side * rand(0.3, 0.8);
      leaf.castShadow = leaf.receiveShadow = true;
      cover.object.add(leaf);
    }

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const lean = rand(0.05, 0.2);
    const stemGeo = new THREE.CylinderGeometry(0.006, 0.008, height, 6).translate(0, height / 2, 0);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
    const top = new THREE.Vector3(0, height, 0).applyEuler(stem.rotation);
    const cupMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colour).offsetHSL(rand(-0.02, 0.02), 0, rand(-0.06, 0.04)),
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const cup = new THREE.Mesh(CUP_GEO, cupMat);
    cup.position.copy(top).y -= 0.004;
    cup.rotation.copy(stem.rotation);
    cup.scale.setScalar(rand(0.9, 1.15));
    for (const m of [stem, cup]) {
      m.castShadow = true;
      group.add(m);
    }
    cover.object.add(group);
    heads.push({ group, phase: rand(0, TAU) });
  }
  cover.clearance = 0.12;
  cover.part = new Sway(heads);
}
