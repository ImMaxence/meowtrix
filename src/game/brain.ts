import { Vector2 } from 'three';
import type { Cover } from './covers';
import type { Lizard } from './lizard/lizard';
import { chance, clamp, rand, TAU, wrapAngle } from './math';
import type { Bounds } from './world';

type State =
  | 'idle' | 'display' | 'wander' | 'alert' | 'flee'
  | 'hide' | 'covered' | 'peek'
  | 'exit' | 'hidden' | 'enter';

/** States in which the lizard can notice things and get startled. */
const CALM: ReadonlySet<State> = new Set<State>(['idle', 'display', 'wander', 'alert', 'peek']);

/** How far inside the screen edge targets are kept, in lizard lengths. */
const INSET = 0.35;
/** Lizards steer away from each other below this distance. */
const PERSONAL_SPACE = 0.25;

/** What a lizard knows about its surroundings. */
export interface Habitat {
  readonly bounds: Bounds;
  readonly lizards: readonly Lizard[];
  readonly covers: readonly Cover[];
}

export interface BrainVoice {
  chirp(): void;
  squeak(): void;
}

const tmp = new Vector2();

/**
 * Decides what one lizard does: stop-and-go wandering, basking, head-bob displays,
 * freezing when something moves, fleeing, hiding under leaves and stones, and
 * leaving the screen for a while when really scared.
 */
export class Brain {
  /** 0 calm … 1 terrified; decays over time. */
  fear = 0;

  private state: State = 'idle';
  private t = 0;
  private dur = 0;
  private readonly target = new Vector2();
  private readonly threat = new Vector2();
  private readonly lookPoint = new Vector2();
  private looking = false;
  private cover: Cover | null = null;
  private moveLeft = 0;
  private pauseLeft = 0;
  private moveSpeed = 1;
  private turnLeft = 0;
  private nextGlance = 0;
  private nextFlick = 0;

  constructor(
    readonly lizard: Lizard,
    private readonly habitat: Habitat,
    private readonly voice: BrainVoice,
  ) {
    this.go('idle');
  }

  update(dt: number): void {
    this.t += dt;
    this.fear = Math.max(0, this.fear - dt * 0.05);
    this.lizard.arousal = this.fear;

    switch (this.state) {
      case 'idle': this.idle(dt); break;
      case 'display': this.display(); break;
      case 'wander': this.wander(dt); break;
      case 'alert': this.alert(dt); break;
      case 'flee': this.flee(); break;
      case 'hide': this.hide(); break;
      case 'covered': this.covered(dt); break;
      case 'peek': this.peek(); break;
      case 'exit': this.exit(); break;
      case 'hidden': this.hidden(); break;
      case 'enter': this.enter(); break;
    }

    if (this.looking) {
      const n = this.lizard.neck;
      const a = Math.atan2(this.lookPoint.x - n.x, this.lookPoint.y - n.y);
      this.lizard.lookTarget = wrapAngle(a - this.lizard.heading);
    }
  }

  /** Something touched the screen at a ground point. */
  touch(x: number, z: number): void {
    if (this.state === 'hidden') return;
    const d = this.lizard.distanceTo(x, z);
    if (d < 0.07) {
      this.scare(0.5);
      this.voice.squeak();
      this.startle(x, z);
    } else if (d < 0.5) {
      this.scare(0.25);
      this.startle(x, z);
    } else if (d < 1.3) {
      this.scare(0.08);
      this.notice(x, z);
    }
  }

  /** A pointer is moving over the ground at `speed` lizard lengths per second. */
  pointer(x: number, z: number, speed: number): void {
    if (!CALM.has(this.state)) return;
    const d = this.lizard.distanceTo(x, z);
    if (d < 0.3 && speed > 1.2) {
      this.scare(0.15);
      this.startle(x, z);
    } else if (d < 1.1 && speed > 0.4) {
      this.notice(x, z);
    }
  }

  /** A sound in the room: 1 = noticeable, 2 = loud. Hidden lizards stay put. */
  noise(level: 1 | 2): void {
    if (this.state === 'hidden' || this.state === 'exit' || this.state === 'covered') return;
    const n = this.lizard.neck;
    const a = rand(0, TAU);
    if (level === 2) {
      this.scare(0.35);
      this.startle(n.x + Math.sin(a), n.y + Math.cos(a));
    } else {
      this.scare(0.1);
      this.notice(n.x + Math.sin(a) * 1.5, n.y + Math.cos(a) * 1.5);
    }
  }

  dispose(): void {
    this.releaseCover();
  }

  private scare(amount: number): void {
    this.fear = Math.min(1, this.fear + amount);
  }

  /** Runs for the nearest safe cover if there is one, otherwise just away. */
  private startle(x: number, z: number): void {
    const running = this.state === 'flee' || (this.state === 'hide' && this.moveSpeed > 2);
    if (running && this.t < 0.3) return;
    this.threat.set(x, z);
    const cover = this.pickCover(1.8, true);
    if (cover && chance(0.8)) this.hideIn(cover, 3 + this.fear * 0.8);
    else this.go('flee');
  }

  private notice(x: number, z: number): void {
    if (!CALM.has(this.state)) return;
    this.lookPoint.set(x, z);
    this.looking = true;
    if (this.state === 'alert') this.dur = Math.max(this.dur, this.t + 1);
    else this.go('alert');
  }

  private go(state: State): void {
    const L = this.lizard;
    if (state !== 'hide' && state !== 'covered') this.releaseCover();
    this.state = state;
    this.t = 0;
    L.raiseTarget = 0;
    L.tailTwitch = 0;

    switch (state) {
      case 'idle':
        this.looking = false;
        L.targetSpeed = 0;
        this.dur = rand(1.2, 4.5) * (1 + this.fear);
        this.nextGlance = rand(0.4, 1.5);
        this.nextFlick = rand(0.6, 2.5);
        break;
      case 'display': {
        const bobs = 2 + Math.floor(Math.random() * 3);
        L.targetSpeed = 0;
        L.raiseTarget = 0.4;
        L.headBob(bobs);
        this.dur = bobs * 0.42 + 0.6;
        break;
      }
      case 'wander':
        this.looking = false;
        this.pickTarget(0.7);
        this.dur = 10;
        this.moveLeft = rand(0.25, 1.0);
        this.moveSpeed = rand(0.6, 1.5) * (1 + this.fear * 0.5);
        break;
      case 'alert':
        L.targetSpeed = 0;
        this.turnLeft = 0;
        this.dur = rand(1.2, 3) + this.fear * 2;
        break;
      case 'flee':
        this.looking = false;
        this.pickEscape();
        this.moveSpeed = 3 + this.fear * 0.8;
        this.dur = rand(0.6, 1.1);
        L.lookTarget = 0;
        L.turnBoost = 1;
        break;
      case 'hide':
        this.looking = false;
        this.dur = 6;
        L.lookTarget = 0;
        if (this.moveSpeed > 2) L.turnBoost = 1;
        break;
      case 'covered':
        L.targetSpeed = 0;
        this.dur = rand(2.5, 6) * (1 + this.fear * 1.5);
        this.nextGlance = rand(0.8, 2);
        this.nextFlick = rand(1, 3);
        break;
      case 'peek': {
        // Creep forward until the head pokes out, then look around.
        const h = L.heading;
        this.target.set(L.neck.x + Math.sin(h) * 0.35, L.neck.y + Math.cos(h) * 0.35);
        this.clampInside(this.target);
        this.moveSpeed = 0.35;
        this.dur = 1.6;
        break;
      }
      case 'exit':
        this.pickExit();
        this.moveSpeed = 2.6 + this.fear * 0.6;
        this.dur = 4;
        break;
      case 'hidden':
        L.targetSpeed = 0;
        this.dur = rand(2.5, 7);
        break;
      case 'enter':
        this.spawnOutside();
        this.moveSpeed = 1.2;
        this.dur = 6;
        break;
    }
  }

  private idle(dt: number): void {
    this.lizard.targetSpeed = 0;
    this.glanceAndFlick(dt);
    if (this.t < this.dur) return;
    if (this.fear < 0.4 && chance(0.18)) this.voice.chirp();
    // Sometimes go and rest in the shade of a leaf or a stone.
    const shade = chance(0.22) ? this.pickCover(3, false) : null;
    if (shade) this.hideIn(shade, rand(0.7, 1.2));
    else this.go(this.fear < 0.3 && chance(0.25) ? 'display' : 'wander');
  }

  private display(): void {
    this.lizard.targetSpeed = 0;
    if (this.t < this.dur) return;
    if (chance(0.3)) this.voice.chirp();
    this.go('wander');
  }

  /** Short dashes toward a target, with pauses in between. */
  private wander(dt: number): void {
    const L = this.lizard;
    const dist = this.target.distanceTo(L.neck);
    if (dist < 0.2 || this.t > this.dur) {
      this.go('idle');
      return;
    }
    if (this.moveLeft > 0) {
      this.moveLeft -= dt;
      this.steer(this.target, Math.min(this.moveSpeed, dist * 3 + 0.3));
      L.lookTarget = 0;
      if (this.moveLeft <= 0) this.pauseLeft = rand(0.15, 1.2) * (1 - this.fear * 0.5);
    } else {
      L.targetSpeed = 0;
      this.pauseLeft -= dt;
      this.glanceAndFlick(dt);
      if (this.pauseLeft <= 0) {
        this.moveLeft = rand(0.25, 1.1);
        this.moveSpeed = rand(0.6, 1.5) * (1 + this.fear * 0.5);
      }
    }
  }

  /** Frozen, head up, watching. Turns around with a quick step if the threat is behind. */
  private alert(dt: number): void {
    const L = this.lizard;
    L.raiseTarget = 0.35;
    L.tailTwitch = this.fear < 0.5 ? 0.7 : 0.3;
    if (this.turnLeft > 0) {
      this.turnLeft -= dt;
      this.steer(this.lookPoint, 0.5);
    } else {
      L.targetSpeed = 0;
      if (this.looking) {
        const n = L.neck;
        const rel = wrapAngle(Math.atan2(this.lookPoint.x - n.x, this.lookPoint.y - n.y) - L.heading);
        if (Math.abs(rel) > 1.2 && this.t < this.dur - 0.6) this.turnLeft = 0.45;
      }
    }
    if (this.t < this.dur) return;
    if (this.fear < 0.35 && chance(0.4)) this.go('display');
    else this.go(chance(0.5) ? 'wander' : 'idle');
  }

  private flee(): void {
    this.steer(this.target, this.moveSpeed);
    if (this.target.distanceTo(this.lizard.neck) > 0.15 && this.t < this.dur) return;
    if (this.fear > 0.5 && chance(0.55)) {
      this.go('exit');
    } else {
      this.lookPoint.copy(this.threat);
      this.looking = true;
      this.go('alert');
    }
  }

  /** Heading for the cover picked in hideIn(). */
  private hide(): void {
    if (!this.cover || this.cover.removed) {
      this.go('alert');
      return;
    }
    const dist = this.target.distanceTo(this.lizard.neck);
    this.steer(this.target, Math.min(this.moveSpeed, dist * 5 + 0.35));
    if (dist < 0.09) this.go('covered');
    else if (this.t > this.dur) this.go('alert');
  }

  /** Lying still under the cover, glancing around now and then. */
  private covered(dt: number): void {
    this.lizard.targetSpeed = 0;
    if (!this.cover || this.cover.removed) {
      this.go('alert');
      return;
    }
    this.glanceAndFlick(dt);
    if (this.t > this.dur) this.go('peek');
  }

  private peek(): void {
    this.steer(this.target, this.moveSpeed);
    if (this.target.distanceTo(this.lizard.neck) < 0.08 || this.t > this.dur) {
      this.looking = false;
      this.go('alert');
    }
  }

  private exit(): void {
    this.steer(this.target, this.moveSpeed);
    if (this.outside(this.lizard.neck) > 1.15 || this.t > this.dur) this.go('hidden');
  }

  private hidden(): void {
    this.lizard.targetSpeed = 0;
    if (this.t > this.dur) this.go('enter');
  }

  private enter(): void {
    this.steer(this.target, this.moveSpeed);
    if (this.outside(this.lizard.neck) < -INSET || this.t > this.dur) {
      this.fear = Math.max(this.fear, 0.3);
      this.looking = false;
      this.go('alert');
    }
  }

  private glanceAndFlick(dt: number): void {
    const L = this.lizard;
    this.nextGlance -= dt;
    if (this.nextGlance <= 0) {
      this.looking = false;
      L.lookTarget = chance(0.3) ? 0 : rand(-0.5, 0.5);
      this.nextGlance = rand(0.6, 2);
    }
    this.nextFlick -= dt;
    if (this.nextFlick <= 0) {
      L.flickTongue();
      this.nextFlick = rand(1.5, 4);
    }
  }

  /** Points the lizard at a target, swerving around other lizards. */
  private steer(to: Vector2, speed: number): void {
    const L = this.lizard, n = L.neck;
    let dx = to.x - n.x, dz = to.y - n.y;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    for (const other of this.habitat.lizards) {
      if (other === L) continue;
      const d = other.nearest(n.x, n.y, tmp);
      if (d >= PERSONAL_SPACE) continue;
      const ax = n.x - tmp.x, az = n.y - tmp.y;
      const al = Math.hypot(ax, az) || 1;
      const w = ((PERSONAL_SPACE - d) / PERSONAL_SPACE) * 2;
      dx += (ax / al) * w;
      dz += (az / al) * w;
    }
    L.targetHeading = Math.atan2(dx, dz);
    L.targetSpeed = speed;
  }

  private hideIn(cover: Cover, speed: number): void {
    this.releaseCover();
    this.cover = cover;
    cover.occupant = this.lizard;
    // Stop just past the centre, so head and body end up underneath.
    const n = this.lizard.neck;
    let dx = cover.x - n.x, dz = cover.z - n.y;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) {
      dx = Math.sin(this.lizard.heading);
      dz = Math.cos(this.lizard.heading);
    } else {
      dx /= len;
      dz /= len;
    }
    this.target.set(cover.x + dx * 0.08, cover.z + dz * 0.08);
    this.moveSpeed = speed;
    this.go('hide');
  }

  private releaseCover(): void {
    if (this.cover?.occupant === this.lizard) this.cover.occupant = null;
    this.cover = null;
  }

  /** The closest free cover, optionally excluding ones on the threat's side. */
  private pickCover(maxDist: number, avoidThreat: boolean): Cover | null {
    const n = this.lizard.neck;
    const away = Math.atan2(n.x - this.threat.x, n.y - this.threat.y);
    let best: Cover | null = null;
    let bestDist = maxDist;
    for (const c of this.habitat.covers) {
      if (c.occupant && c.occupant !== this.lizard) continue;
      const d = c.distanceTo(n.x, n.y);
      if (d > bestDist) continue;
      if (avoidThreat) {
        if (c.distanceTo(this.threat.x, this.threat.y) < c.radius + 0.35) continue;
        const align = Math.cos(wrapAngle(Math.atan2(c.x - n.x, c.z - n.y) - away));
        if (align < -0.2 && d > 0.4) continue;
      }
      best = c;
      bestDist = d;
    }
    return best;
  }

  /** How far a point is outside the visible area (negative when inside). */
  private outside(p: Vector2): number {
    const b = this.habitat.bounds;
    return Math.max(b.minX - p.x, p.x - b.maxX, b.minZ - p.y, p.y - b.maxZ);
  }

  private clampInside(p: Vector2): Vector2 {
    const b = this.habitat.bounds;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    p.x = b.maxX - b.minX > 2 * INSET ? clamp(p.x, b.minX + INSET, b.maxX - INSET) : cx;
    p.y = b.maxZ - b.minZ > 2 * INSET ? clamp(p.y, b.minZ + INSET, b.maxZ - INSET) : cz;
    return p;
  }

  /** A random spot on screen, away from this lizard and the others. */
  private pickTarget(minDist: number): void {
    const b = this.habitat.bounds;
    for (let i = 0; i < 12; i++) {
      this.target.set(rand(b.minX, b.maxX), rand(b.minZ, b.maxZ));
      this.clampInside(this.target);
      if (this.target.distanceTo(this.lizard.neck) < minDist) continue;
      if (this.habitat.lizards.some((o) => o !== this.lizard && o.neck.distanceTo(this.target) < 0.5)) continue;
      return;
    }
  }

  /** Runs away from the threat, preferring directions that stay on screen. */
  private pickEscape(): void {
    const n = this.lizard.neck;
    const away = Math.atan2(n.x - this.threat.x, n.y - this.threat.y);
    const end = new Vector2();
    let best = -Infinity;
    for (let k = 0; k < 12; k++) {
      const a = away + (k / 12) * TAU + rand(-0.2, 0.2);
      const dist = rand(1.1, 1.6);
      end.set(n.x + Math.sin(a) * dist, n.y + Math.cos(a) * dist);
      const score = Math.cos(wrapAngle(a - away)) - 3 * Math.max(0, this.outside(end) + INSET);
      if (score > best) {
        best = score;
        this.target.copy(end);
      }
    }
    this.clampInside(this.target);
  }

  /** Heads for the nearest edge that does not lead back toward the threat. */
  private pickExit(): void {
    const b = this.habitat.bounds, n = this.lizard.neck;
    const away = Math.atan2(n.x - this.threat.x, n.y - this.threat.y);
    const edges: [number, number, number][] = [
      [n.x - b.minX, b.minX - 1.6, n.y],
      [b.maxX - n.x, b.maxX + 1.6, n.y],
      [n.y - b.minZ, n.x, b.minZ - 1.6],
      [b.maxZ - n.y, n.x, b.maxZ + 1.6],
    ];
    let best = Infinity;
    for (const [dist, x, z] of edges) {
      const align = Math.cos(wrapAngle(Math.atan2(x - n.x, z - n.y) - away));
      const score = dist - 0.6 * align;
      if (score < best) {
        best = score;
        this.target.set(x, z);
      }
    }
  }

  /** Re-enters from a random edge after hiding. */
  private spawnOutside(): void {
    const b = this.habitat.bounds;
    const edge = Math.floor(Math.random() * 4);
    const along = rand(0.15, 0.85);
    const x = b.minX + (b.maxX - b.minX) * along, z = b.minZ + (b.maxZ - b.minZ) * along;
    const spawn: [number, number, number][] = [
      [b.minX - 1.2, z, Math.PI / 2],
      [b.maxX + 1.2, z, -Math.PI / 2],
      [x, b.minZ - 1.2, 0],
      [x, b.maxZ + 1.2, Math.PI],
    ];
    const [sx, sz, heading] = spawn[edge];
    const h = heading + rand(-0.4, 0.4);
    this.lizard.teleport(sx, sz, h);
    this.target.set(sx + Math.sin(h) * 2.5, sz + Math.cos(h) * 2.5);
    this.clampInside(this.target);
  }
}
