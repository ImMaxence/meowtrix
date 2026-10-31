import * as THREE from 'three';
import { TAU } from '../math';
import { makeFrame, type Frame, type Spine } from './spine';

/**
 * A body skin lofted along a spine: elliptic cross-sections with a flatter belly.
 * UVs: u runs along the body (the ring's s), v around it (0 on one flank, 0.25 on the back).
 */
export class Tube {
  readonly geometry = new THREE.BufferGeometry();
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly cos: number[];
  private readonly sin: number[];
  private readonly frame: Frame = makeFrame();

  constructor(private readonly ringS: ArrayLike<number>, private readonly sides: number) {
    const rings = ringS.length;
    const verts = rings * (sides + 1);
    this.positions = new Float32Array(verts * 3);
    this.normals = new Float32Array(verts * 3);
    this.cos = Array.from({ length: sides + 1 }, (_, k) => Math.cos((k / sides) * TAU));
    this.sin = Array.from({ length: sides + 1 }, (_, k) => Math.sin((k / sides) * TAU));
    const uvs = new Float32Array(verts * 2);
    const index: number[] = [];
    for (let r = 0; r < rings; r++) {
      for (let k = 0; k <= sides; k++) {
        const i = r * (sides + 1) + k;
        uvs[i * 2] = ringS[r];
        uvs[i * 2 + 1] = k / sides;
        if (r < rings - 1 && k < sides) {
          const next = i + sides + 1;
          index.push(i, next, i + 1, next, next + 1, i + 1);
        }
      }
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(index);
  }

  /** Rebuilds the vertices from the spine; `width` and `height` are half sizes at s. */
  update(spine: Spine, width: (s: number) => number, height: (s: number) => number, belly: number): void {
    const pos = this.positions, sides = this.sides;
    for (let r = 0; r < this.ringS.length; r++) {
      const s = this.ringS[r];
      const f = spine.sample(s, this.frame);
      const w = width(s), h = height(s);
      const cx = f.pos.x, cy = f.pos.y + h * belly, cz = f.pos.z;
      for (let k = 0; k <= sides; k++) {
        const sx = this.cos[k] * w;
        const sy = this.sin[k] >= 0 ? this.sin[k] * h : this.sin[k] * h * belly;
        const o = (r * (sides + 1) + k) * 3;
        pos[o] = cx + f.side.x * sx + f.up.x * sy;
        pos[o + 1] = cy + f.side.y * sx + f.up.y * sy;
        pos[o + 2] = cz + f.side.z * sx + f.up.z * sy;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // The first and last vertex of each ring coincide: share their normal to hide the seam.
    const nrm = this.normals;
    for (let r = 0; r < this.ringS.length; r++) {
      const a = r * (sides + 1) * 3, b = a + sides * 3;
      const x = nrm[a] + nrm[b], y = nrm[a + 1] + nrm[b + 1], z = nrm[a + 2] + nrm[b + 2];
      const l = Math.hypot(x, y, z) || 1;
      nrm[a] = nrm[b] = x / l;
      nrm[a + 1] = nrm[b + 1] = y / l;
      nrm[a + 2] = nrm[b + 2] = z / l;
    }
  }
}
