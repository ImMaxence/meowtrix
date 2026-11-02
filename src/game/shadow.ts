import * as THREE from 'three';
import { lerp, rand, TAU } from './math';
import type { Bounds } from './world';

const DURATION = 1.3;
/** How high the bird flies; low enough to stay in the picture, high enough to drift from its shadow. */
const FLIGHT = 1.1;

function shadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  g.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** A bird seen from below: wings spread along the canvas height, head toward +x. */
function birdTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(14, 12, 10, 0.9)';
  ctx.beginPath();
  ctx.moveTo(30, 6);
  ctx.quadraticCurveTo(58, 34, 36, 64);
  ctx.quadraticCurveTo(58, 94, 30, 122);
  ctx.quadraticCurveTo(26, 90, 20, 64);
  ctx.quadraticCurveTo(26, 38, 30, 6);
  ctx.closePath();
  ctx.fill();
  // The body and head.
  ctx.beginPath();
  ctx.ellipse(34, 64, 14, 7, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(50, 64, 4, 0, TAU);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Something flying over: a bird's silhouette high up, and its soft shadow sweeping across the
 * ground in a second. Everyone gets scared when it is right overhead.
 */
export class Shadow {
  readonly group = new THREE.Group();
  private readonly shade: THREE.Mesh;
  private readonly bird: THREE.Mesh;
  private readonly shadeMat: THREE.MeshBasicMaterial;
  private readonly birdMat: THREE.MeshBasicMaterial;
  private readonly from = new THREE.Vector2();
  private readonly to = new THREE.Vector2();
  private height = 0;
  private size = 1;
  /** 0 … 1 across the view; negative when nothing is passing. */
  private t = -1;
  private fired = false;
  private onOverhead: (() => void) | null = null;

  constructor() {
    this.shadeMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0 });
    this.shade = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.shadeMat);
    this.birdMat = new THREE.MeshBasicMaterial({ map: birdTexture(), transparent: true, depthWrite: false, opacity: 0 });
    this.bird = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.birdMat);
    for (const m of [this.shade, this.bird]) {
      m.rotation.order = 'YXZ';
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 1;
    }
    this.group.visible = false;
    this.group.add(this.shade, this.bird);
  }

  /** Kept for callers that only need the mesh. */
  get mesh(): THREE.Object3D {
    return this.group;
  }

  get passing(): boolean {
    return this.t >= 0;
  }

  /** Sets off across the view in a random direction, the shadow at `height` (the water surface, or the ground). */
  start(b: Bounds, height: number, onOverhead: () => void): void {
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const reach = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) * 0.7;
    const a = rand(0, TAU);
    this.from.set(cx - Math.sin(a) * reach, cz - Math.cos(a) * reach);
    this.to.set(cx + Math.sin(a) * reach, cz + Math.cos(a) * reach);
    this.size = Math.min(b.maxX - b.minX, b.maxZ - b.minZ) * 0.45;
    // Longer along the direction of flight (the planes' x axis, turned to (sin a, cos a)).
    this.shade.scale.set(this.size * 1.6, this.size, 1);
    this.bird.scale.set(this.size * 0.55, this.size * 1.1, 1);
    for (const m of [this.shade, this.bird]) m.rotation.y = a - Math.PI / 2;
    this.height = height;
    this.shade.position.y = height;
    this.bird.position.y = height + FLIGHT;
    this.group.visible = true;
    this.t = 0;
    this.fired = false;
    this.onOverhead = onOverhead;
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt / DURATION;
    const k = Math.min(this.t, 1);
    const x = lerp(this.from.x, this.to.x, k), z = lerp(this.from.y, this.to.y, k);
    this.shade.position.set(x, this.height, z);
    // The bird is a little ahead of its shadow (the sun is not straight overhead) and flaps.
    this.bird.position.set(x + 0.15, this.height + FLIGHT, z - 0.1);
    this.bird.scale.y = this.size * (0.75 + 0.35 * Math.abs(Math.sin(this.t * 14)));
    const fade = Math.sin(Math.PI * k);
    this.shadeMat.opacity = 0.55 * fade;
    this.birdMat.opacity = 0.9 * Math.min(1, fade * 3);
    if (!this.fired && k >= 0.5) {
      this.fired = true;
      this.onOverhead?.();
    }
    if (this.t >= 1) {
      this.t = -1;
      this.group.visible = false;
    }
  }
}
