import * as THREE from 'three';
import { placeSegment } from '../body/limbs';
import { capsuleDistance, Creature, type SampleFn } from '../creature';
import { damp, rand, TAU } from '../math';
import type { BugBuild, BugColors } from './bugs';

const SPHERE = new THREE.SphereGeometry(1, 18, 12);
const LEG_GEO = new THREE.CylinderGeometry(0.7, 1, 1, 5);
const ANTENNA_POINTS = 12;

const hip = new THREE.Vector3(), knee = new THREE.Vector3(), foot = new THREE.Vector3();

interface Leg {
  pair: number;
  side: 1 | -1;
  femur: THREE.Mesh;
  tibia: THREE.Mesh;
}

/**
 * A walking insect (cockroach, beetle): a rigid shell on six legs moving in two tripods,
 * with feelers that sweep the air. It runs, freezes, and dives under the nearest cover.
 */
export class Bug extends Creature {
  private readonly model = new THREE.Group();
  private readonly legs: Leg[] = [];
  private readonly antennae: THREE.Line[] = [];
  private readonly materials: THREE.Material[] = [];
  private walkPhase = 0;
  private feel = 0;
  private feelLeft = 0;
  private raise = 0;

  constructor(private readonly build: BugBuild, colors: BugColors) {
    super();
    const shiny = (color: string) => {
      const m = new THREE.MeshPhysicalMaterial({
        color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, metalness: colors.metal,
        iridescence: colors.metal > 0.5 ? 0.7 : 0,
      });
      this.materials.push(m);
      return m;
    };
    const mats = { head: shiny(colors.head), pronotum: shiny(colors.pronotum), shell: shiny(colors.shell) };
    const legMat = shiny(colors.legs);

    for (const p of build.parts) {
      const m = new THREE.Mesh(SPHERE, mats[p.material]);
      m.scale.set(...p.size);
      m.position.set(0, p.y, p.z);
      m.castShadow = true;
      this.model.add(m);
    }
    // The seam between the wing cases, on top of the shell.
    const shell = build.parts[build.parts.length - 1];
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, shell.size[2] * 1.6), shiny('#120c08'));
    seam.position.set(0, shell.y + shell.size[1] * 0.98, shell.z - shell.size[2] * 0.15);
    this.model.add(seam);

    for (const side of [1, -1] as const) {
      build.legs.forEach((_, pair) => {
        const femur = new THREE.Mesh(LEG_GEO, legMat);
        const tibia = new THREE.Mesh(LEG_GEO, legMat);
        femur.castShadow = tibia.castShadow = true;
        this.model.add(femur, tibia);
        this.legs.push({ pair, side, femur, tibia });
      });

      const head = build.parts[0];
      const antenna = new THREE.Line(
        new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(ANTENNA_POINTS * 3), 3)),
        new THREE.LineBasicMaterial({ color: colors.head }),
      );
      antenna.position.set(side * head.size[0] * 0.5, head.y + head.size[1] * 0.4, head.z + head.size[2] * 0.6);
      antenna.userData.side = side;
      antenna.frustumCulled = false;
      this.antennae.push(antenna);
      this.model.add(antenna);

      if (build.cerci) {
        const cercus = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.14, 5).rotateX(-Math.PI / 2), mats.head);
        cercus.position.set(side * 0.06, shell.y, shell.z - shell.size[2] * 0.98);
        cercus.rotation.y = side * 0.35;
        this.model.add(cercus);
      }
      if (colors.mandibles) {
        // Stag beetle jaws: two curved antlers.
        const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.024, 6, 14, Math.PI * 0.62), shiny(colors.mandibles));
        jaw.rotation.set(-Math.PI / 2, 0, side > 0 ? -Math.PI * 0.1 : Math.PI * 1.1 - Math.PI * 0.62);
        jaw.position.set(side * 0.13, head.y, head.z + head.size[2] * 0.4);
        jaw.castShadow = true;
        this.model.add(jaw);
      }
    }

    this.model.scale.setScalar(build.length);
    this.group.add(this.model);
    this.teleport(0, 0, rand(0, TAU));
  }

  get bodyX(): number {
    return this.pos.x;
  }

  teleport(x: number, z: number, heading: number): void {
    this.pos.set(x, z);
    this.heading = this.targetHeading = heading;
    this.speed = this.targetSpeed = 0;
  }

  nearest(x: number, z: number, out: THREE.Vector2): number {
    const L = this.build.length;
    return capsuleDistance(x, z, this.pos.x, this.pos.y, this.heading, L * 0.35, L * this.build.width * 0.5, out);
  }

  forEachSample(fn: SampleFn): void {
    const L = this.build.length, fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    for (const p of this.build.parts) {
      fn(this.pos.x + fx * p.z * L, this.pos.y + fz * p.z * L, p.size[0] * L, (p.y + p.size[1]) * L);
    }
  }

  /** A sweep of the feelers. */
  fidget(): void {
    this.feelLeft = rand(0.6, 1.2);
  }

  /** Rises on its legs and waves its feelers. */
  display(): number {
    const d = rand(1, 1.8);
    this.feelLeft = d;
    this.raise = 1;
    return d;
  }

  update(dt: number): void {
    this.time += dt;
    const m = this.build.motion;
    this.locomote(dt, m);
    this.feelLeft = Math.max(0, this.feelLeft - dt);
    this.feel += ((this.feelLeft > 0 ? 1 : 0.25 + this.arousal * 0.5) - this.feel) * damp(6, dt);
    this.raise = Math.max(this.raiseTarget, this.raise - dt * 0.8);

    const moving = this.speed > 0.01 || Math.abs(this.turnRate) > 0.3;
    // Capped so fast legs blur instead of strobing.
    if (moving) this.walkPhase += dt * Math.min(60, (this.speed / this.build.length) * this.build.cadence + Math.abs(this.turnRate) * 3);
    const step = moving ? Math.min(1, this.speed * 3 + Math.abs(this.turnRate) * 0.2) : 0;

    this.group.position.set(this.pos.x, 0, this.pos.y);
    this.group.rotation.y = this.heading;
    this.model.position.y = this.build.length * (0.006 * step * Math.abs(Math.sin(this.walkPhase * 2)) + this.raise * 0.03);
    this.model.rotation.x = -this.raise * 0.12;

    for (const leg of this.legs) {
      const L = this.build.legs[leg.pair];
      const tripod = (leg.pair + (leg.side > 0 ? 0 : 1)) % 2;
      const ph = this.walkPhase + tripod * Math.PI;
      hip.set(L.hip[0] * leg.side, L.hip[1], L.hip[2]);
      foot.set(L.foot[0] * leg.side, 0, L.foot[1] + 0.09 * step * Math.sin(ph));
      foot.y = 0.05 * step * Math.max(0, Math.cos(ph)) - this.model.position.y / this.build.length;
      knee.lerpVectors(hip, foot, 0.45);
      knee.y = L.knee + this.raise * 0.04;
      knee.x += 0.04 * leg.side;
      placeSegment(leg.femur, hip, knee);
      placeSegment(leg.tibia, knee, foot);
      leg.femur.scale.x = leg.femur.scale.z = this.build.legRadius;
      leg.tibia.scale.x = leg.tibia.scale.z = this.build.legRadius * 0.7;
    }

    const a = this.build.antenna;
    for (const antenna of this.antennae) {
      const side = antenna.userData.side as number;
      const p = antenna.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < ANTENNA_POINTS; k++) {
        const f = k / (ANTENNA_POINTS - 1);
        const sweep = this.feel * 0.35 * Math.sin(this.time * (6 + side) + f * 2.5 + side);
        const ang = side * (a.spread * (0.25 + 0.75 * f) + sweep * f);
        const r = f * a.length;
        p.setXYZ(k, Math.sin(ang) * r, -a.droop * f * f + 0.04 * f, Math.cos(ang) * r);
      }
      p.needsUpdate = true;
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      if ((o instanceof THREE.Mesh || o instanceof THREE.Line) && o.geometry !== SPHERE && o.geometry !== LEG_GEO) o.geometry.dispose();
      if (o instanceof THREE.Line) (o.material as THREE.Material).dispose();
    });
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
