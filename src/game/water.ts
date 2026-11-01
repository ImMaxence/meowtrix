import * as THREE from 'three';
import { damp, TAU } from './math';
import { hash3, noise2p } from './noise';

/** Height of the water surface above the bottom (the lizard is 1 long). */
export const SURFACE = 0.55;

const SIZE = 80;
const TILE = 2.5;
const RIPPLES = 14;
const BUBBLES = 48;

/** Tileable caustics: bright lines along the edges of a wrapped Voronoi pattern. */
function causticsTexture(): THREE.CanvasTexture {
  const N = 256, CELLS = 7;
  const pts: number[] = [];
  for (let j = 0; j < CELLS; j++) {
    for (let i = 0; i < CELLS; i++) pts.push((i + hash3(i, j, 0, 71)) / CELLS, (j + hash3(i, j, 1, 71)) / CELLS);
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Warp the lookup a little so the cells are not straight-edged.
      const u = x / N + (noise2p((x / N) * 4, (y / N) * 4, 4, 72) - 0.5) * 0.05;
      const v = y / N + (noise2p((x / N) * 4, (y / N) * 4, 4, 73) - 0.5) * 0.05;
      let f1 = 9, f2 = 9;
      for (let k = 0; k < pts.length; k += 2) {
        let dx = Math.abs(u - pts[k]), dy = Math.abs(v - pts[k + 1]);
        dx = Math.min(dx, 1 - dx);
        dy = Math.min(dy, 1 - dy);
        const d = dx * dx + dy * dy;
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) f2 = d;
      }
      const edge = Math.sqrt(f2) - Math.sqrt(f1);
      const light = Math.pow(Math.max(0, 1 - edge * 34), 4);
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = light * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Gentle wave normals for the surface. */
function waveNormals(): THREE.CanvasTexture {
  const N = 128;
  const h = (x: number, y: number) =>
    noise2p((x / N) * 6, (y / N) * 6, 6, 81) * 0.7 + noise2p((x / N) * 14, (y / N) * 14, 14, 82) * 0.3;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (h((x + 1) % N, y) - h((x + N - 1) % N, y)) * 6;
      const dy = (h(x, (y + 1) % N) - h(x, (y + N - 1) % N)) * 6;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

interface Bubble {
  mesh: THREE.Mesh;
  speed: number;
  phase: number;
  delay: number;
}

interface Ripple {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  size: number;
}

/**
 * The water theme's water: a tinted, glinting surface, a haze that makes the bottom look deep,
 * moving caustics on the bottom and rings spreading where something touches the surface.
 */
export class Water {
  readonly group = new THREE.Group();
  private readonly surfaceMat: THREE.MeshStandardMaterial;
  private readonly hazeMat: THREE.MeshBasicMaterial;
  private readonly caustics: THREE.Mesh[] = [];
  private readonly ripples: Ripple[] = [];
  private readonly bubblePool: Bubble[] = [];
  private t = 0;
  private next = 0;
  private nextBubble = 0;

  constructor() {
    const plane = new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2);
    const normals = waveNormals();
    normals.repeat.setScalar(SIZE / TILE / 1.5);
    this.surfaceMat = new THREE.MeshStandardMaterial({
      color: '#2f6b6a', transparent: true, opacity: 0.2, roughness: 0.06, metalness: 0.1,
      normalMap: normals, normalScale: new THREE.Vector2(0.35, 0.35), depthWrite: false,
    });
    const surface = new THREE.Mesh(plane, this.surfaceMat);
    surface.position.y = SURFACE;
    surface.renderOrder = 2;

    // Below most fish: tints the bottom more than the fish, for depth.
    this.hazeMat = new THREE.MeshBasicMaterial({ color: '#2f6b6a', transparent: true, opacity: 0.22, depthWrite: false });
    const haze = new THREE.Mesh(plane, this.hazeMat);
    haze.position.y = 0.05;
    haze.renderOrder = 1;

    const tex = causticsTexture();
    for (const [scale, y] of [[1, 0.003], [1.37, 0.004]] as const) {
      const map = tex.clone();
      map.needsUpdate = true;
      map.repeat.setScalar(SIZE / TILE / scale);
      const mat = new THREE.MeshBasicMaterial({
        map, color: '#fff6d8', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const m = new THREE.Mesh(plane, mat);
      m.position.y = y;
      this.caustics.push(m);
    }

    const ringGeo = new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2);
    for (let i = 0; i < RIPPLES; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 3;
      this.group.add(mesh);
      this.ripples.push({ mesh, mat, age: 1, size: 1 });
    }

    const bubbleGeo = new THREE.SphereGeometry(1, 10, 8);
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', transparent: true, opacity: 0.45, roughness: 0.05, clearcoat: 1, depthWrite: false,
    });
    for (let i = 0; i < BUBBLES; i++) {
      const mesh = new THREE.Mesh(bubbleGeo, bubbleMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.bubblePool.push({ mesh, speed: 0, phase: 0, delay: 0 });
    }

    this.group.add(surface, haze, ...this.caustics);
    this.group.visible = false;
  }

  /** A little stream of bubbles from a fish's mouth, wobbling up and popping at the surface. */
  bubbles(x: number, y: number, z: number): void {
    const n = 3 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      const b = this.bubblePool[this.nextBubble];
      this.nextBubble = (this.nextBubble + 1) % BUBBLES;
      b.mesh.position.set(x + (Math.random() - 0.5) * 0.02, y, z + (Math.random() - 0.5) * 0.02);
      b.mesh.scale.setScalar(0.006 + Math.random() * 0.01);
      b.speed = 0.25 + Math.random() * 0.2;
      b.phase = Math.random() * TAU;
      b.delay = k * 0.09;
      b.mesh.visible = false;
      b.mesh.userData.live = true;
    }
  }

  setTint(color: string): void {
    this.surfaceMat.color.set(color);
    this.hazeMat.color.set(color);
  }

  /** Rings spreading on the surface at (x, z); `size` around 1 for a tap. */
  ripple(x: number, z: number, size = 1): void {
    const r = this.ripples[this.next];
    this.next = (this.next + 1) % RIPPLES;
    r.age = 0;
    r.size = size;
    r.mesh.position.set(x, SURFACE + 0.003, z);
    r.mesh.visible = true;
  }

  update(dt: number): void {
    if (!this.group.visible) return;
    this.t += dt;
    const t = this.t;
    for (const b of this.bubblePool) {
      if (!b.mesh.userData.live) continue;
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      const p = b.mesh.position;
      b.mesh.visible = true;
      p.y += b.speed * dt;
      p.x += Math.sin(t * 9 + b.phase) * 0.03 * dt;
      p.z += Math.cos(t * 7 + b.phase) * 0.03 * dt;
      if (p.y >= SURFACE - 0.005) {
        b.mesh.visible = false;
        b.mesh.userData.live = false;
        this.ripple(p.x, p.z, 0.15);
      }
    }
    (this.caustics[0].material as THREE.MeshBasicMaterial).map!.offset.set(t * 0.013, t * 0.008);
    (this.caustics[1].material as THREE.MeshBasicMaterial).map!.offset.set(-t * 0.009, t * 0.011);
    this.caustics.forEach((m, i) => {
      (m.material as THREE.MeshBasicMaterial).opacity = 0.07 + 0.025 * Math.sin(t * 0.7 + i * 2);
    });
    this.surfaceMat.normalMap!.offset.set(t * 0.01, Math.sin(t * 0.2) * 0.02);
    for (const r of this.ripples) {
      if (!r.mesh.visible) continue;
      r.age += dt;
      const life = r.age / (1.4 + 0.4 * r.size);
      if (life >= 1) {
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar(0.03 + r.size * 0.45 * (1 - (1 - life) ** 2));
      r.mat.opacity += ((1 - life) ** 2 * 0.5 - r.mat.opacity) * damp(30, dt);
    }
  }
}

/** Angle helper for things floating on the surface. */
export const bob = (t: number, phase: number): number => 0.004 * Math.sin(t * 1.3 + phase) + 0.002 * Math.sin(t * 2.9 + phase * TAU);
