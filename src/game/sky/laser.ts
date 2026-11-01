import * as THREE from 'three';
import { chance, clamp, lerp, rand, TAU } from '../math';
import type { Variant } from '../variant';
import { glowMaterial, spotTexture } from './glow';
import { outside, type Toy, type ToyHabitat } from './toy';

export interface LaserColors extends Variant {
  color: string;
}

const laser = (id: string, color: string): LaserColors =>
  ({ id, color, swatch: `radial-gradient(circle at 50% 50%, #fff 0 9%, ${color} 10% 26%, ${color}66 27% 42%, #1a1d22 43%)` });

/** Cats see blue and green better than red, but all of them move the same. */
export const LASER_COLORS: readonly LaserColors[] = [laser('red', '#ff2a1a'), laser('green', '#3cff4c'), laser('blue', '#3f7fff')];

type Mode = 'dash' | 'creep' | 'pause' | 'jiggle' | 'circle' | 'exit' | 'off' | 'pinned';

const CORE = new THREE.CircleGeometry(0.017, 20).rotateX(-Math.PI / 2);
const GLOW = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const HEIGHT = 0.003;
/** Sizes of the coloured spot, its additive glow and the faint haze around. */
const SPOT = 0.05, GLOW_SIZE = 0.16, HAZE = 0.38;

/**
 * A laser dot, moved the way a hand moves a pointer: quick dashes, sudden stops with a slight
 * tremor, little wiggles and circles, slow teasing creeps, and now and then off the screen and
 * back. It jumps away when a paw comes near, and stays put for a moment under a paw that lands on it.
 */
export class LaserDot implements Toy {
  readonly group = new THREE.Group();
  readonly pos = new THREE.Vector3();
  readonly heads: readonly THREE.Object3D[] = [];

  private readonly materials: THREE.Material[];
  private readonly glow: THREE.Mesh;
  private readonly haze: THREE.Mesh;
  private mode: Mode = 'pause';
  private t = 0;
  private dur = 0;
  private speed = 1;
  private readonly target = new THREE.Vector2();
  private readonly anchor = new THREE.Vector2();
  private readonly dir = new THREE.Vector2();
  private amp = 0;
  private freq = 0;
  private angle = 0;
  /** After creeping out from under a paw, dash off. */
  private thenDash = false;

  constructor(private readonly habitat: ToyHabitat, colors: LaserColors) {
    const core = new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.color).lerp(new THREE.Color('#ffffff'), 0.45), toneMapped: false });
    // A spot of plain colour under the glow, so the dot reads red (or green, or blue) even on a bright ground.
    const spot = new THREE.MeshBasicMaterial({ map: spotTexture(), color: colors.color, transparent: true, depthWrite: false, toneMapped: false });
    const glow = glowMaterial(colors.color, 0.6), haze = glowMaterial(colors.color, 0.22);
    this.materials = [core, spot, glow, haze];
    const dot = new THREE.Mesh(CORE, core);
    const spotMesh = new THREE.Mesh(GLOW, spot);
    spotMesh.scale.setScalar(SPOT);
    this.glow = new THREE.Mesh(GLOW, glow);
    this.glow.scale.setScalar(GLOW_SIZE);
    this.haze = new THREE.Mesh(GLOW, haze);
    this.haze.scale.setScalar(HAZE);
    // Stacked a hair apart so they don't flicker into each other.
    this.haze.position.y = HEIGHT;
    spotMesh.position.y = HEIGHT + 0.0004;
    this.glow.position.y = HEIGHT + 0.0008;
    dot.position.y = HEIGHT + 0.0012;
    this.group.add(this.haze, spotMesh, this.glow, dot);
    const b = habitat.bounds;
    this.pos.set(rand(lerp(b.minX, b.maxX, 0.2), lerp(b.minX, b.maxX, 0.8)), 0, rand(lerp(b.minZ, b.maxZ, 0.2), lerp(b.minZ, b.maxZ, 0.8)));
    this.go('pause');
  }

  touch(x: number, z: number): boolean {
    if (this.mode === 'off' || this.mode === 'exit') return false;
    const d = Math.hypot(this.pos.x - x, this.pos.z - z);
    if (d < 0.06 + 0.05 * this.habitat.tired) {
      this.go('pinned');
      return true;
    }
    if (d < 0.5 && this.mode !== 'pinned') this.escape(x, z);
    return false;
  }

  pointer(x: number, z: number, speed: number): void {
    if (speed < 0.6 || this.mode === 'off' || this.mode === 'exit' || this.mode === 'pinned') return;
    if (this.mode === 'dash' && this.t < 0.25) return;
    if (Math.hypot(this.pos.x - x, this.pos.z - z) < 0.35) this.escape(x, z);
  }

  noise(level: 1 | 2): void {
    if (level === 2 && this.mode !== 'off' && this.mode !== 'pinned') this.go('dash');
  }

  update(dt: number): void {
    this.t += dt;
    const h = this.habitat;
    const pace = h.speedFactor * lerp(1, 0.4, h.tired);
    switch (this.mode) {
      case 'dash':
      case 'creep':
      case 'exit': {
        const dx = this.target.x - this.pos.x, dz = this.target.y - this.pos.z;
        const d = Math.hypot(dx, dz);
        // A hand slows down as it reaches where it was aiming.
        const v = Math.min(this.speed, d * (this.mode === 'creep' ? 3 : 7) + 0.05) * pace;
        const step = Math.min(d, v * dt);
        if (d > 1e-5) {
          this.pos.x += (dx / d) * step;
          this.pos.z += (dz / d) * step;
        }
        if (d < 0.01 || this.t > 6) this.go(this.mode === 'exit' ? 'off' : this.thenDash ? 'dash' : this.pick());
        break;
      }
      case 'jiggle': {
        const k = Math.sin(this.t * this.freq * TAU) * this.amp;
        this.pos.x = this.anchor.x + this.dir.x * k;
        this.pos.z = this.anchor.y + this.dir.y * k;
        if (this.t > this.dur) this.go(this.pick());
        break;
      }
      case 'circle': {
        this.angle += this.freq * dt * pace;
        this.pos.x = this.anchor.x + Math.cos(this.angle) * this.amp;
        this.pos.z = this.anchor.y + Math.sin(this.angle) * this.amp;
        if (this.t > this.dur) this.go(this.pick());
        break;
      }
      case 'off':
        if (this.t > this.dur) this.enter();
        break;
      case 'pause':
      case 'pinned':
        if (this.t > this.dur) {
          const pinned = this.mode === 'pinned';
          this.go(pinned ? 'creep' : this.pick());
          // Out from under the paw, slowly, then off.
          this.thenDash = pinned;
        }
        break;
    }
    // A hand is never quite still: a faint tremor, and the speckle of the dot.
    const shake = this.mode === 'pinned' ? 0.001 : 0.0025;
    this.group.position.set(this.pos.x + rand(-shake, shake), 0, this.pos.z + rand(-shake, shake));
    const flicker = rand(0.94, 1.06);
    this.glow.scale.setScalar(GLOW_SIZE * flicker);
    this.haze.scale.setScalar(HAZE * flicker);
  }

  dispose(): void {
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }

  /** What the hand does next. Tired: fewer dashes, longer stops, and it stays on screen. */
  private pick(): Mode {
    const tired = this.habitat.tired;
    if (this.mode === 'dash' && chance(0.5)) return 'pause';
    const weights: [Mode, number][] = [
      ['dash', 0.34 * (1 - 0.5 * tired)], ['pause', 0.24 * (1 + tired)], ['jiggle', 0.12], ['creep', 0.14 * (1 + tired)],
      ['circle', 0.09], ['exit', 0.07 * (1 - tired)],
    ];
    let r = Math.random() * weights.reduce((s, [, w]) => s + w, 0);
    for (const [mode, w] of weights) {
      r -= w;
      if (r <= 0) return mode;
    }
    return 'pause';
  }

  private go(mode: Mode): void {
    const tired = this.habitat.tired;
    this.mode = mode;
    this.t = 0;
    this.thenDash = false;
    this.anchor.set(this.pos.x, this.pos.z);
    switch (mode) {
      case 'dash': {
        const a = rand(0, TAU), dist = rand(0.5, 1.6) * lerp(1, 0.5, tired);
        this.aim(this.pos.x + Math.sin(a) * dist, this.pos.z + Math.cos(a) * dist, 0.2);
        this.speed = rand(2.5, 4.5);
        break;
      }
      case 'creep': {
        const a = rand(0, TAU), dist = rand(0.25, 0.6);
        this.aim(this.pos.x + Math.sin(a) * dist, this.pos.z + Math.cos(a) * dist, 0.2);
        this.speed = rand(0.2, 0.45);
        break;
      }
      case 'pause':
        this.dur = rand(0.3, 1.6) * (1 + tired);
        break;
      case 'pinned':
        this.dur = rand(0.5, 1.2) * (1 + 1.5 * tired);
        break;
      case 'jiggle': {
        const a = rand(0, TAU);
        this.dir.set(Math.sin(a), Math.cos(a));
        this.dur = rand(0.4, 1);
        this.amp = rand(0.025, 0.06);
        this.freq = rand(5, 9);
        break;
      }
      case 'circle':
        this.amp = rand(0.1, 0.22);
        this.angle = rand(0, TAU);
        this.anchor.set(this.pos.x - Math.cos(this.angle) * this.amp, this.pos.z - Math.sin(this.angle) * this.amp);
        this.freq = rand(4, 8) * (chance(0.5) ? 1 : -1);
        this.dur = rand(0.6, 1.4);
        break;
      case 'exit': {
        // Off the nearest edge.
        const b = this.habitat.bounds, p = this.pos;
        const edges: [number, number, number][] = [
          [p.x - b.minX, b.minX - 0.15, p.z], [b.maxX - p.x, b.maxX + 0.15, p.z],
          [p.z - b.minZ, p.x, b.minZ - 0.15], [b.maxZ - p.z, p.x, b.maxZ + 0.15],
        ];
        edges.sort((e, f) => e[0] - f[0]);
        this.target.set(edges[0][1], edges[0][2]);
        this.speed = rand(2.5, 4);
        break;
      }
      case 'off':
        this.dur = rand(1, 3);
        break;
    }
  }

  /** Away from a paw, fast. */
  private escape(x: number, z: number): void {
    let dx = this.pos.x - x, dz = this.pos.z - z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const tired = this.habitat.tired;
    const dist = rand(0.7, 1.4) * lerp(1, 0.5, tired);
    this.mode = 'dash';
    this.t = 0;
    this.thenDash = false;
    this.aim(this.pos.x + dx * dist + rand(-0.3, 0.3), this.pos.z + dz * dist + rand(-0.3, 0.3), 0.15);
    this.speed = rand(4, 6) * lerp(1, 0.5, tired);
  }

  /** Comes back in from an edge. */
  private enter(): void {
    const b = this.habitat.bounds;
    if (outside(b, this.pos.x, this.pos.z) < 0) this.pos.set(b.minX - 0.1, 0, (b.minZ + b.maxZ) / 2);
    this.mode = chance(0.5) ? 'creep' : 'dash';
    this.t = 0;
    this.thenDash = false;
    this.aim(rand(b.minX, b.maxX), rand(b.minZ, b.maxZ), 0.3);
    this.speed = this.mode === 'creep' ? rand(0.4, 0.7) : rand(2.5, 4);
  }

  /** Sets the target, kept on screen (closer to the middle when tired). */
  private aim(x: number, z: number, inset: number): void {
    const b = this.habitat.bounds;
    const k = inset + 0.4 * this.habitat.tired;
    const ix = Math.min(k, (b.maxX - b.minX) / 2), iz = Math.min(k, (b.maxZ - b.minZ) / 2);
    this.target.set(clamp(x, b.minX + ix, b.maxX - ix), clamp(z, b.minZ + iz, b.maxZ - iz));
  }
}
