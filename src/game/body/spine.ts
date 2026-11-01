import * as THREE from 'three';
import { clamp } from '../math';

export const UP = new THREE.Vector3(0, 1, 0);

/** Position and orientation along a body. `pos.y` is the height of the belly line. */
export interface Frame {
  pos: THREE.Vector3;
  /** Points toward the head. */
  tan: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
}

export const makeFrame = (): Frame => ({
  pos: new THREE.Vector3(), tan: new THREE.Vector3(), side: new THREE.Vector3(), up: new THREE.Vector3(),
});

/**
 * A chain of ground points from the nose (0) to the tail tip: a rigid head ahead of the
 * driven neck point, then a body and tail that follow the neck's path with limited bending.
 */
export class Spine {
  readonly seg: number;
  readonly chain: THREE.Vector2[];
  readonly frames: Frame[];

  constructor(
    readonly count: number,
    readonly neck: number,
    readonly length: number,
    /** Max bend per segment (radians) at body position s. */
    private readonly maxBend: (s: number) => number,
    /** Max bend between the motion direction and the first body segment. */
    private readonly neckBend: number,
  ) {
    this.seg = length / (count - 1);
    this.chain = Array.from({ length: count }, () => new THREE.Vector2());
    this.frames = Array.from({ length: count }, makeFrame);
  }

  /** Lays the whole body out straight, neck at (x, z). */
  straighten(x: number, z: number, heading: number): void {
    const bx = -Math.sin(heading), bz = -Math.cos(heading);
    for (let i = 0; i < this.count; i++) {
      this.chain[i].set(x + bx * (i - this.neck) * this.seg, z + bz * (i - this.neck) * this.seg);
    }
  }

  /** Head points ahead of the neck along heading + headYaw; the rest follows with limited bending. */
  follow(neck: THREE.Vector2, heading: number, headYaw: number): void {
    const c = this.chain, seg = this.seg;
    const hd = heading + headYaw;
    const hx = Math.sin(hd), hz = Math.cos(hd);
    for (let i = 0; i < this.neck; i++) c[i].set(neck.x + hx * (this.neck - i) * seg, neck.y + hz * (this.neck - i) * seg);
    c[this.neck].copy(neck);

    let px = -Math.sin(heading), pz = -Math.cos(heading);
    for (let i = this.neck + 1; i < this.count; i++) {
      const prev = c[i - 1], cur = c[i];
      let dx = cur.x - prev.x, dz = cur.y - prev.y;
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) {
        dx = px;
        dz = pz;
      } else {
        dx /= len;
        dz /= len;
      }
      const maxBend = i === this.neck + 1 ? this.neckBend : this.maxBend(i / (this.count - 1));
      const angle = Math.atan2(px * dz - pz * dx, px * dx + pz * dz);
      if (Math.abs(angle) > maxBend) {
        const a = Math.sign(angle) * maxBend;
        const ca = Math.cos(a), sa = Math.sin(a);
        dx = px * ca - pz * sa;
        dz = px * sa + pz * ca;
      }
      cur.set(prev.x + dx * seg, prev.y + dz * seg);
      px = dx;
      pz = dz;
    }
  }

  /**
   * Builds the 3D frames: chain + sideways offset + height, both given per point, and an optional
   * shift back along the body (so a body rearing up gets shorter on the ground instead of stretching).
   */
  compose(
    offset: (s: number, j: number) => number,
    height: (s: number, j: number) => number,
    back?: (s: number, j: number) => number,
  ): void {
    const n = this.count;
    for (let j = 0; j < n; j++) {
      const a = this.chain[Math.max(j - 1, 0)], b = this.chain[Math.min(j + 1, n - 1)];
      let tx = a.x - b.x, tz = a.y - b.y;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      const s = j / (n - 1);
      const off = offset(s, j);
      const shift = back ? back(s, j) : 0;
      this.frames[j].pos.set(this.chain[j].x + tz * off - tx * shift, height(s, j), this.chain[j].y - tx * off - tz * shift);
    }
    for (let j = 0; j < n; j++) {
      const f = this.frames[j];
      f.tan.subVectors(this.frames[Math.max(j - 1, 0)].pos, this.frames[Math.min(j + 1, n - 1)].pos).normalize();
      f.side.crossVectors(UP, f.tan).normalize();
      f.up.crossVectors(f.tan, f.side);
    }
  }

  /** Interpolated frame at body position s (0 nose … 1 tail tip). */
  sample(s: number, out: Frame): Frame {
    const f = clamp(s, 0, 1) * (this.count - 1);
    const j = Math.min(Math.floor(f), this.count - 2);
    const t = f - j;
    const a = this.frames[j], b = this.frames[j + 1];
    out.pos.lerpVectors(a.pos, b.pos, t);
    out.tan.lerpVectors(a.tan, b.tan, t).normalize();
    out.side.crossVectors(UP, out.tan).normalize();
    out.up.crossVectors(out.tan, out.side);
    return out;
  }
}
