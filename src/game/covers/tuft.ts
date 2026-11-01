import * as THREE from 'three';
import type { Walker } from '../creature';
import { clamp, damp, rand, TAU } from '../math';
import type { Cover, CoverPart } from './cover';

/** How a tuft looks and moves. Lengths in world units, angles in radians. */
export interface TuftStyle {
  blades: readonly [number, number];
  /** Radius of the patch the blades grow from. */
  spread: number;
  length: readonly [number, number];
  width: number;
  /** Lean away from the centre, at the base. */
  lean: readonly [number, number];
  /** Extra lean toward the tip, so blades curve over. */
  droop: number;
  segments: number;
  colors: readonly (readonly [base: string, tip: string])[];
  /** Swaying in the wind (or the current), and its speed. */
  sway: number;
  swaySpeed: number;
  /** Seaweed waves along its length instead of bending as a whole. */
  wave: boolean;
}

export const GRASS: TuftStyle = {
  blades: [260, 320], spread: 0.26, length: [0.24, 0.46], width: 0.02, lean: [0.1, 0.7], droop: 0.6, segments: 4,
  colors: [['#2c5419', '#a8c45c'], ['#36601f', '#c2cf6a'], ['#2a4d1c', '#8fb44e']],
  sway: 0.06, swaySpeed: 1.7, wave: false,
};

export const SEAWEED: TuftStyle = {
  blades: [14, 20], spread: 0.12, length: [0.36, 0.52], width: 0.045, lean: [0.25, 0.6], droop: 0.35, segments: 9,
  colors: [['#24401c', '#7d9c3a'], ['#3a3a16', '#a08a3a'], ['#1d4a2c', '#5fa05a']],
  sway: 0.35, swaySpeed: 0.8, wave: true,
};

const dir = new THREE.Vector3();
const step = new THREE.Vector3();
const p = new THREE.Vector3();
/** Bodies in the tuft: x, z, radius, push strength, repeated. */
const pushers: number[] = [];

/** Grass blades or seaweed ribbons, rebuilt every frame so they sway and part around animals. */
class Tuft implements CoverPart {
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions: Float32Array;
  private readonly n: number;
  /** Per blade: base x, z, lean x, z, length, width, phase, flat side x, z. */
  private readonly blade: Float32Array;
  /** Per blade: current push (x, z), eased. */
  private readonly bend: Float32Array;

  constructor(cover: Cover, private readonly style: TuftStyle) {
    const n = Math.round(rand(style.blades[0], style.blades[1]));
    this.n = n;
    this.blade = new Float32Array(n * 9);
    this.bend = new Float32Array(n * 2);
    const verts = n * (style.segments + 1) * 2;
    this.positions = new Float32Array(verts * 3);
    const colors = new Float32Array(verts * 3);
    const index: number[] = [];
    const [baseHex, tipHex] = style.colors[Math.floor(Math.random() * style.colors.length)];
    const base = new THREE.Color(baseHex), tip = new THREE.Color(tipHex), c = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), r = style.spread * Math.sqrt(Math.random());
      const outward = rand(style.lean[0], style.lean[1]) * (0.4 + 0.6 * (r / style.spread));
      const la = a + rand(-0.5, 0.5);
      this.blade.set([
        Math.cos(a) * r, Math.sin(a) * r,
        Math.cos(la) * outward, Math.sin(la) * outward,
        rand(style.length[0], style.length[1]) * (1 - 0.35 * (r / style.spread)),
        style.width * rand(0.7, 1.3),
        rand(0, TAU),
        // Blades face sideways to their lean, so they never turn edge-on.
        -Math.sin(la), Math.cos(la),
      ], i * 9);
      const shade = rand(0.75, 1.1);
      for (let j = 0; j <= style.segments; j++) {
        const f = j / style.segments;
        c.copy(base).lerp(tip, f * f * 0.9 + 0.1 * f).multiplyScalar(shade * (0.65 + 0.35 * f));
        const v = (i * (style.segments + 1) + j) * 2;
        c.toArray(colors, v * 3);
        c.toArray(colors, v * 3 + 3);
        if (j < style.segments) index.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      }
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setIndex(index);
    const mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    cover.object.add(mesh);
    this.update(cover, 1, []);
  }

  update(cover: Cover, dt: number, walkers: readonly Walker[]): void {
    const s = this.style;
    pushers.length = 0;
    for (const w of walkers) {
      if (cover.distanceTo(w.pos.x, w.pos.y) > cover.radius + 1.2) continue;
      // Moving animals part the blades; resting ones let them fold back over (negative push).
      const strength = w.speed > 0.25 ? 0.3 + 0.7 * Math.min(1, w.speed) : -0.5;
      w.forEachSample((x, z, r) => {
        const lx = x - cover.x, lz = z - cover.z;
        if (Math.hypot(lx, lz) < s.spread + s.length[1] + r) pushers.push(lx, lz, r, strength);
      });
    }

    const pos = this.positions, b = this.blade;
    const segLen = 1 / s.segments;
    const wind = s.sway * (1 + cover.wobble * 4);
    for (let i = 0; i < this.n; i++) {
      const o = i * 9;
      const bx = b[o], bz = b[o + 1], len = b[o + 4], width = b[o + 5], phase = b[o + 6];
      // Push away from bodies near the middle of the blade, or lean over resting ones.
      const mx = bx + b[o + 2] * len * 0.4, mz = bz + b[o + 3] * len * 0.4;
      let px = 0, pz = 0;
      for (let k = 0; k < pushers.length; k += 4) {
        const dx = mx - pushers[k], dz = mz - pushers[k + 1];
        const d = Math.hypot(dx, dz) || 1e-3;
        const reach = pushers[k + 2] + (pushers[k + 3] < 0 ? 0.16 : 0.08);
        if (d >= reach) continue;
        const f = ((reach - d) / reach) * 2.2 * pushers[k + 3];
        px += (dx / d) * f;
        pz += (dz / d) * f;
      }
      const pl = Math.hypot(px, pz);
      if (pl > 1.6) {
        px *= 1.6 / pl;
        pz *= 1.6 / pl;
      }
      const e = damp(pl > 0 ? 14 : 5, dt);
      this.bend[i * 2] += (px - this.bend[i * 2]) * e;
      this.bend[i * 2 + 1] += (pz - this.bend[i * 2 + 1]) * e;
      const lx = b[o + 2] + this.bend[i * 2], lz = b[o + 3] + this.bend[i * 2 + 1];

      p.set(bx, 0, bz);
      for (let j = 0; j <= s.segments; j++) {
        const f = j / s.segments;
        const sway = s.wave
          ? wind * Math.sin(cover.t * s.swaySpeed * TAU * 0.3 + phase - f * 3) * f
          : wind * Math.sin(cover.t * s.swaySpeed + phase) * f;
        const curl = 1 + s.droop * 3 * f;
        dir.set(lx * curl + sway * 0.7, 1, lz * curl + sway * 0.5).normalize();
        if (j > 0) p.add(step.copy(dir).multiplyScalar(len * segLen));
        // Blades get thinner toward the tip; ribbons stay wide.
        const w = width * (s.wave ? 0.6 + 0.4 * Math.sin(f * Math.PI + 0.3) : clamp(1 - f * 0.9, 0.05, 1)) * 0.5;
        const v = ((i * (s.segments + 1) + j) * 2) * 3;
        const ox = b[o + 7] * w, oz = b[o + 8] * w;
        pos[v] = p.x - ox;
        pos[v + 1] = p.y;
        pos[v + 2] = p.z - oz;
        pos[v + 3] = p.x + ox;
        pos[v + 4] = p.y;
        pos[v + 5] = p.z + oz;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

export function makeTuft(cover: Cover, style: TuftStyle): void {
  cover.part = new Tuft(cover, style);
  if (style === SEAWEED) cover.depth = 0.22;
  else cover.clearance = 0.3;
}
