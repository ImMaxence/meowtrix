import * as THREE from 'three';
import { clamp } from '../math';
import { UP } from './spine';

const dirTmp = new THREE.Vector3();
const perpTmp = new THREE.Vector3();
const segTmp = new THREE.Vector3();

/** Two-bone IK: places the joint between `root` and `target`, bending toward `pole`. */
export function solveTwoBone(
  root: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3,
  joint: THREE.Vector3, end: THREE.Vector3,
): void {
  const dir = dirTmp.subVectors(target, root);
  const dist = clamp(dir.length(), Math.abs(l1 - l2) + 1e-4, (l1 + l2) * 0.999);
  dir.normalize();
  end.copy(root).addScaledVector(dir, dist);
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const perp = perpTmp.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (perp.lengthSq() < 1e-10) perp.copy(UP);
  perp.normalize();
  joint.copy(root).addScaledVector(dir, l1 * cosA).addScaledVector(perp, l1 * sinA);
}

/** Stretches a unit-height, Y-aligned mesh between two points. */
export function placeSegment(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const dir = segTmp.subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.multiplyScalar(1 / (len || 1)));
  mesh.scale.set(1, len, 1);
}
