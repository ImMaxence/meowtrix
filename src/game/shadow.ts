import * as THREE from 'three';
import { lerp, rand, TAU } from './math';
import type { Bounds } from './world';

const DURATION = 1.3;

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

/**
 * The shadow of something flying over: a soft dark patch that sweeps across the ground in a
 * second, and scares everyone when it is right overhead.
 */
export class Shadow {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly from = new THREE.Vector2();
  private readonly to = new THREE.Vector2();
  /** 0 … 1 across the view; negative when nothing is passing. */
  private t = -1;
  private fired = false;
  private onOverhead: (() => void) | null = null;

  constructor() {
    this.material = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0 });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.mesh.rotation.order = 'YXZ';
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = 1;
    this.mesh.visible = false;
  }

  get passing(): boolean {
    return this.t >= 0;
  }

  /** Sets off across the view in a random direction, at `height` (the water surface, or the ground). */
  start(b: Bounds, height: number, onOverhead: () => void): void {
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const reach = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) * 0.7;
    const a = rand(0, TAU);
    this.from.set(cx - Math.sin(a) * reach, cz - Math.cos(a) * reach);
    this.to.set(cx + Math.sin(a) * reach, cz + Math.cos(a) * reach);
    const size = Math.min(b.maxX - b.minX, b.maxZ - b.minZ) * 0.45;
    // Longer along the direction of flight (the plane's x axis, turned to (sin a, cos a)).
    this.mesh.scale.set(size * 1.6, size, 1);
    this.mesh.rotation.y = a - Math.PI / 2;
    this.mesh.position.y = height;
    this.mesh.visible = true;
    this.t = 0;
    this.fired = false;
    this.onOverhead = onOverhead;
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt / DURATION;
    const k = Math.min(this.t, 1);
    this.mesh.position.x = lerp(this.from.x, this.to.x, k);
    this.mesh.position.z = lerp(this.from.y, this.to.y, k);
    this.material.opacity = 0.55 * Math.sin(Math.PI * k);
    if (!this.fired && k >= 0.5) {
      this.fired = true;
      this.onOverhead?.();
    }
    if (this.t >= 1) {
      this.t = -1;
      this.mesh.visible = false;
    }
  }
}
