import * as THREE from 'three';
import { capsuleDistance } from '../creature';
import { chance, clamp, damp, lerp, rand, smoothstep, TAU, wrapAngle } from '../math';
import type { Variant } from '../variant';
import { outside, type Toy, type ToyHabitat } from './toy';

export interface FeatherColors extends Variant {
  vane: string;
  /** Colour toward the tip, and of the fluffy base. */
  tip: string;
  down: string;
  /** Stripes across the vane (jay, pheasant). */
  bars: string | null;
  quill: string;
}

const feather = (c: Omit<FeatherColors, 'swatch'>): FeatherColors =>
  ({ ...c, swatch: `linear-gradient(160deg, ${c.down} 0 25%, ${c.vane} 25% 60%, ${c.bars ?? c.tip} 60% 70%, ${c.tip} 70%)` });

export const FEATHER_COLORS: readonly FeatherColors[] = [
  feather({ id: 'white', vane: '#f4f2ec', tip: '#ffffff', down: '#ffffff', bars: null, quill: '#ece4d2' }),
  feather({ id: 'pink', vane: '#f59cc2', tip: '#ffc4dc', down: '#ffd8e8', bars: null, quill: '#f6d6e2' }),
  feather({ id: 'jay', vane: '#4a8be0', tip: '#1d3c86', down: '#d9d3c8', bars: '#0f1318', quill: '#e6e0d4' }),
  feather({ id: 'pheasant', vane: '#bd8c4e', tip: '#80582f', down: '#e4d2b2', bars: '#3a2616', quill: '#d8c8a8' }),
];

/** Length and width of the vane, in world units (the lizard is 1 long). */
const L = 0.34;
const W = 0.1;

/** Half widths of the vane on each side at `t` (0 base … 1 tip): feathers are a little lopsided. */
const halfWidth = (t: number, side: number): number =>
  (W / 2) * (side < 0 ? 1 : 0.78) * Math.sin(Math.PI * Math.min(1, t ** 0.75)) ** 0.8 * smoothstep(0, 0.08, t);

/** The feather bends up in the middle and curves to one side. */
const bendY = (t: number) => 0.022 * Math.sin(Math.PI * t);
const bendX = (t: number) => 0.018 * t * t;

const geometry = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) pts.push(new THREE.Vector2(-halfWidth(i / N, -1), (i / N) * L));
  for (let i = N - 1; i > 0; i--) pts.push(new THREE.Vector2(halfWidth(i / N, 1), (i / N) * L));
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts)).rotateX(Math.PI / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), t = p.getZ(i) / L;
    uv.setXY(i, 0.5 + x / W, t);
    p.setXYZ(i, x + bendX(t), bendY(t), p.getZ(i));
  }
  geo.computeVertexNormals();
  return geo;
})();

const quill = (() => {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = -0.12 + (i / 8) * 1.08;
    pts.push(new THREE.Vector3(bendX(Math.max(t, 0)), bendY(Math.max(t, 0)) + 0.002, t * L));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0032, 5);
})();

const textures = new Map<string, THREE.CanvasTexture>();

/** Barbs from the shaft out to the ragged edge: fluffy at the base, banded for jay and pheasant. */
function featherTexture(c: FeatherColors): THREE.CanvasTexture {
  let tex = textures.get(c.id);
  if (tex) return tex;
  const TW = 64, TH = 256;
  const canvas = document.createElement('canvas');
  canvas.width = TW;
  canvas.height = TH;
  const ctx = canvas.getContext('2d')!;
  const down = new THREE.Color(c.down), vane = new THREE.Color(c.vane), tip = new THREE.Color(c.tip);
  const bar = c.bars ? new THREE.Color(c.bars) : null;
  const col = new THREE.Color();
  ctx.lineCap = 'round';
  for (let row = 0; row < TH * 1.4; row++) {
    const t = row / (TH * 1.4);
    col.lerpColors(down, vane, smoothstep(0.08, 0.3, t)).lerp(tip, smoothstep(0.55, 1, t));
    if (bar && t > 0.3 && Math.sin(t * 38) > 0.55) col.lerp(bar, 0.85);
    // A few splits in the vane, where barbs come apart.
    const split = Math.sin(t * 23 + 1.3) > 0.93;
    for (const side of [-1, 1]) {
      if (split && side > 0) continue;
      const len = (halfWidth(t, side) / W) * TW * rand(0.82, 1.02);
      const y = (1 - t) * TH, x = TW / 2;
      ctx.strokeStyle = `#${col.getHexString()}`;
      ctx.globalAlpha = t < 0.2 ? 0.55 : 0.95;
      ctx.lineWidth = t < 0.2 ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Barbs sweep toward the tip; downy ones curl.
      const curl = t < 0.2 ? rand(-6, 6) : 0;
      ctx.quadraticCurveTo(x + side * len * 0.5, y - len * 0.25 + curl, x + side * len, y - len * 0.55);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(c.id, tex);
  return tex;
}

type State = 'air' | 'ground' | 'pinned' | 'away';

const tmp = new THREE.Vector2();

/**
 * A feather: it drifts down swinging from side to side, lies on the ground, and gusts of wind
 * make it slide, lift and twirl. A paw pins it for a moment before it flicks away.
 */
export class Feather implements Toy {
  readonly group = new THREE.Group();
  readonly pos = new THREE.Vector3();
  readonly heads: readonly THREE.Object3D[] = [];

  private readonly vel = new THREE.Vector3();
  private readonly gust = new THREE.Vector2();
  private readonly material: THREE.MeshStandardMaterial;
  private readonly quillMat: THREE.MeshStandardMaterial;
  private state: State = 'air';
  private t = 0;
  private left = 0;
  private gustLeft = rand(1, 3);
  private gustLength = 1;
  private gusting = false;
  private gustPower = 0;
  private yaw = rand(0, TAU);
  private spin = 0;
  private swing = rand(0, TAU);
  private roll = 0;
  private pitch = 0;

  /** `whoosh(x, size)` plays a soft gust of air. */
  constructor(private readonly habitat: ToyHabitat, colors: FeatherColors, private readonly whoosh: (x: number, size: number) => void) {
    this.material = new THREE.MeshStandardMaterial({
      map: featherTexture(colors), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9,
    });
    this.quillMat = new THREE.MeshStandardMaterial({ color: colors.quill, roughness: 0.6 });
    const model = new THREE.Group();
    const vane = new THREE.Mesh(geometry, this.material);
    const shaft = new THREE.Mesh(quill, this.quillMat);
    vane.castShadow = shaft.castShadow = true;
    model.add(vane, shaft);
    // Turn around the middle of the feather.
    model.position.z = -L * 0.45;
    this.group.add(model);
    this.group.rotation.order = 'YXZ';
    this.drop(rand(0.3, 1.2));
  }

  touch(x: number, z: number): boolean {
    if (this.state === 'away') return false;
    const d = this.distanceTo(x, z);
    if (d < 0.02 + 0.04 * this.habitat.tired) {
      if (this.state === 'air') {
        this.push(x, z, 1.2);
        this.vel.y += 0.5;
        this.spin = rand(-6, 6);
      } else {
        this.state = 'pinned';
        this.left = rand(0.6, 1.2) * (1 + this.habitat.tired);
        this.vel.set(0, 0, 0);
      }
      return true;
    }
    if (d < 0.4) {
      const s = 1 - d / 0.4;
      this.push(x, z, 0.9 * s);
      if (this.state === 'ground' && s > 0.4) this.lift(0.5 * s);
    }
    return false;
  }

  pointer(x: number, z: number, speed: number): void {
    if (speed < 0.8 || this.state === 'away' || this.state === 'pinned') return;
    const d = this.distanceTo(x, z);
    if (d > 0.3) return;
    const s = (1 - d / 0.3) * Math.min(speed / 3, 1);
    this.push(x, z, 0.5 * s);
    if (this.state === 'ground' && d < 0.12) this.lift(0.35 * s);
  }

  noise(level: 1 | 2): void {
    if (level === 2 && this.state === 'ground') this.lift(rand(0.3, 0.5));
  }

  update(dt: number): void {
    const h = this.habitat;
    this.t += dt;
    const sdt = dt * h.speedFactor;
    this.updateGust(dt);
    const wind = this.gusting ? this.gustPower * Math.sin(Math.PI * clamp(1 - this.gustLeft / this.gustLength, 0, 1)) : 0;

    switch (this.state) {
      case 'air': {
        this.vel.x += this.gust.x * wind * 1.6 * dt;
        this.vel.z += this.gust.y * wind * 1.6 * dt;
        // Falls slowly, held up by the air; a gust carries it up again.
        this.vel.y += (-0.22 + wind * 0.5 - this.vel.y) * damp(2.2, dt);
        this.vel.x *= 1 - damp(1.1, dt);
        this.vel.z *= 1 - damp(1.1, dt);
        // Swings from side to side across its length, tilting with each swing.
        this.swing += dt * 2.6;
        const sway = Math.sin(this.swing) * 0.3;
        this.pos.x += (this.vel.x + Math.cos(this.yaw) * sway) * sdt;
        this.pos.z += (this.vel.z - Math.sin(this.yaw) * sway) * sdt;
        this.pos.y += this.vel.y * sdt;
        this.roll = Math.cos(this.swing) * 0.7;
        this.pitch = 0.18 * Math.sin(this.swing * 0.5);
        this.yaw += this.spin * dt;
        this.spin += (0.5 * Math.sin(this.t * 0.7) - this.spin) * damp(1.5, dt);
        if (this.pos.y <= 0.006) {
          this.pos.y = 0.006;
          this.vel.y = 0;
          this.spin = 0;
          this.state = 'ground';
        }
        break;
      }
      case 'ground': {
        this.vel.x += this.gust.x * wind * 1.1 * dt;
        this.vel.z += this.gust.y * wind * 1.1 * dt;
        this.vel.x *= 1 - damp(3.5, dt);
        this.vel.z *= 1 - damp(3.5, dt);
        this.pos.x += this.vel.x * sdt;
        this.pos.z += this.vel.z * sdt;
        // Lies flat, its edges stirring in the wind; turns a little as it slides.
        this.roll += (0.06 * wind * Math.sin(this.t * 9) - this.roll) * damp(6, dt);
        this.pitch += (0 - this.pitch) * damp(6, dt);
        const v = Math.hypot(this.vel.x, this.vel.z);
        if (v > 0.05) this.yaw += wrapAngle(Math.atan2(this.vel.x, this.vel.z) - this.yaw) * damp(0.8 * v, dt);
        if (wind > 0.75 && chance(dt * 2)) this.lift(rand(0.4, 0.8) * wind);
        break;
      }
      case 'pinned':
        this.left -= dt;
        if (this.left <= 0) {
          // The paw lifts and the feather flicks away.
          const a = rand(0, TAU);
          this.vel.set(Math.sin(a) * 1.1, 0, Math.cos(a) * 1.1);
          this.lift(0.7);
        }
        break;
      case 'away':
        this.left -= dt;
        if (this.left <= 0) this.drop(rand(0.9, 1.4));
        return;
    }

    if (outside(h.bounds, this.pos.x, this.pos.z) > 0.25) {
      this.state = 'away';
      this.group.visible = false;
      this.left = rand(1.5, 4) * (1 - 0.6 * h.tired);
    }
    this.group.position.copy(this.pos);
    this.group.rotation.set(this.pitch, this.yaw, this.roll);
  }

  dispose(): void {
    this.material.dispose();
    this.quillMat.dispose();
    this.group.removeFromParent();
  }

  private distanceTo(x: number, z: number): number {
    const cx = this.pos.x + Math.sin(this.yaw) * L * 0.05, cz = this.pos.z + Math.cos(this.yaw) * L * 0.05;
    return capsuleDistance(x, z, cx, cz, this.yaw, L * 0.42, 0.03, tmp);
  }

  /** Blows the feather away from (x, z). */
  private push(x: number, z: number, strength: number): void {
    let dx = this.pos.x - x, dz = this.pos.z - z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    this.vel.x += dx * strength;
    this.vel.z += dz * strength;
  }

  private lift(up: number): void {
    this.state = 'air';
    this.vel.y = Math.max(this.vel.y, up);
    this.pos.y = Math.max(this.pos.y, 0.02);
    this.spin = rand(-3, 3);
    this.whoosh(this.pos.x, up);
  }

  /** Comes floating down from above a random spot. */
  private drop(height: number): void {
    const b = this.habitat.bounds;
    const inset = Math.min(0.3, (b.maxX - b.minX) / 3, (b.maxZ - b.minZ) / 3);
    this.pos.set(rand(b.minX + inset, b.maxX - inset), height, rand(b.minZ + inset, b.maxZ - inset));
    this.vel.set(0, 0, 0);
    this.state = 'air';
    this.group.visible = true;
  }

  /** Gusts now and then, blowing toward the middle when the feather is near an edge. */
  private updateGust(dt: number): void {
    this.gustLeft -= dt;
    if (this.gustLeft > 0) return;
    const tired = this.habitat.tired;
    if (this.gusting) {
      this.gusting = false;
      this.gustLeft = rand(2, 6) * (1 + tired * 1.5);
      return;
    }
    const b = this.habitat.bounds, p = this.pos;
    let a = rand(0, TAU);
    const edge = -outside(b, p.x, p.z);
    if (edge < 0.6) a = Math.atan2((b.minX + b.maxX) / 2 - p.x, (b.minZ + b.maxZ) / 2 - p.z) + rand(-1, 1);
    this.gust.set(Math.sin(a), Math.cos(a));
    this.gusting = true;
    this.gustLength = this.gustLeft = rand(0.5, 1.4);
    this.gustPower = rand(0.4, 1.2) * lerp(1, 0.4, tired);
  }
}
