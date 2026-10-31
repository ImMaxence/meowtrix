import type { Voice } from '../audio/voice';
import { Brain, type Habitat } from './brain';
import { Covers, type Cover, type CoverMode } from './covers';
import { Lizard } from './lizard/lizard';
import { SKIN_IDS, SKINS, type SkinId } from './lizard/skin';
import { rand, TAU } from './math';
import type { Bounds, World } from './world';

/** All the lizards, their brains and the hiding spots, wired to the world and the sound. */
export class Game implements Habitat {
  readonly lizards: Lizard[] = [];
  private readonly brains: Brain[] = [];
  private readonly coverField: Covers;
  private skin: SkinId = 'green';

  constructor(private readonly world: World, private readonly voice: Voice) {
    this.coverField = new Covers(world.scene);
  }

  get bounds(): Bounds {
    return this.world.bounds;
  }

  get covers(): readonly Cover[] {
    return this.coverField.list;
  }

  /** Fastest lizard speed, used to ignore our own footsteps on the microphone. */
  get maxSpeed(): number {
    return this.lizards.reduce((m, l) => Math.max(m, l.speed), 0);
  }

  /** Adds or removes lizards. The first one wears `skin`, the others the next skins in the list. */
  setPopulation(count: number, skin: SkinId): void {
    this.skin = skin;
    while (this.brains.length > count) {
      const brain = this.brains.pop()!;
      brain.dispose();
      brain.lizard.dispose();
      this.lizards.pop();
    }
    while (this.brains.length < count) this.spawn();
    this.applySkins();
  }

  setSkin(skin: SkinId): void {
    this.skin = skin;
    this.applySkins();
  }

  setCoverMode(mode: CoverMode): void {
    this.coverField.setMode(mode, this.bounds);
  }

  /** After the visible area changed. `force` re-lays out covers even if they still fit. */
  relayout(force: boolean): void {
    if (force) this.coverField.layout(this.bounds);
    else this.coverField.fit(this.bounds);
  }

  touch(x: number, z: number): void {
    this.coverField.touch(x, z);
    for (const b of this.brains) b.touch(x, z);
  }

  pointer(x: number, z: number, speed: number): void {
    for (const b of this.brains) b.pointer(x, z, speed);
  }

  noise(level: 1 | 2): void {
    for (const b of this.brains) b.noise(level);
  }

  update(dt: number): void {
    for (const b of this.brains) b.update(dt);
    for (const l of this.lizards) l.update(dt);
    this.coverField.update(dt, this.lizards);
  }

  private applySkins(): void {
    const first = SKIN_IDS.indexOf(this.skin);
    this.lizards.forEach((l, i) => l.setSkin(SKINS[SKIN_IDS[(first + i) % SKIN_IDS.length]]));
  }

  /** A new lizard somewhere on screen, not on top of the others. */
  private spawn(): void {
    const lizard = new Lizard(SKINS[this.skin], this.world.maxAnisotropy);
    const b = this.bounds;
    let x = 0, z = 0;
    for (let i = 0; i < 20; i++) {
      x = rand(b.minX + 0.4, b.maxX - 0.4);
      z = rand(b.minZ + 0.4, b.maxZ - 0.4);
      if (this.lizards.every((o) => Math.hypot(o.neck.x - x, o.neck.y - z) > 0.9)) break;
    }
    lizard.teleport(x, z, rand(0, TAU));
    lizard.onFootfall = (intensity, fx) => this.voice.step(intensity, this.world.panOf(fx));
    const brain = new Brain(lizard, this, {
      chirp: () => this.voice.chirp(this.world.panOf(lizard.bodyX)),
      squeak: () => this.voice.squeak(this.world.panOf(lizard.bodyX)),
    });
    this.world.scene.add(lizard.group);
    this.lizards.push(lizard);
    this.brains.push(brain);
  }
}
