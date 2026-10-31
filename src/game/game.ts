import { Vector3 } from 'three';
import type { Voice } from '../audio/voice';
import { Brain, LIZARD, MOUSE, type BrainVoice, type Habitat, type Species } from './brain';
import { Covers, type Cover, type CoverMode } from './covers';
import type { GroundCreature } from './creature';
import { Fly } from './fly/fly';
import { Lizard } from './lizard/lizard';
import { SKIN_IDS, SKINS, type SkinId } from './lizard/skin';
import { rand, TAU } from './math';
import { Mouse, MOUSE_COATS } from './mouse/mouse';
import type { Bounds, World } from './world';

export interface Population {
  lizards: number;
  mice: number;
  flies: number;
}

const tmp = new Vector3();

/** All the animals and hiding spots, wired to the world, the input and the sound. */
export class Game implements Habitat {
  speedFactor = 1;
  private readonly lizards: Brain[] = [];
  private readonly mice: Brain[] = [];
  private readonly flies: Fly[] = [];
  private walkerList: GroundCreature[] = [];
  private brainList: Brain[] = [];
  private readonly coverField: Covers;
  private skin: SkinId = 'green';

  constructor(private readonly world: World, private readonly voice: Voice) {
    this.coverField = new Covers(world.scene);
  }

  get bounds(): Bounds {
    return this.world.bounds;
  }

  get walkers(): readonly GroundCreature[] {
    return this.walkerList;
  }

  get covers(): readonly Cover[] {
    return this.coverField.list;
  }

  /** True while our own animals make sound the microphone could pick up. */
  get noisy(): boolean {
    return this.walkerList.some((w) => w.speed > 0.8) || this.flies.some((f) => f.buzzing);
  }

  setPopulation(p: Population, skin: SkinId): void {
    this.skin = skin;
    this.resize(this.lizards, p.lizards, () => this.spawnLizard());
    this.resize(this.mice, p.mice, () => this.spawnMouse());
    while (this.flies.length > p.flies) this.flies.pop()!.dispose();
    while (this.flies.length < p.flies) {
      const fly = new Fly(this, this.voice.createBuzz());
      this.world.scene.add(fly.group);
      this.flies.push(fly);
    }
    this.brainList = [...this.lizards, ...this.mice];
    this.walkerList = this.brainList.map((b) => b.body as GroundCreature);
    this.applySkins();
  }

  /** The first lizard wears `skin`, the others the next skins in the list. */
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

  touch(x: number, z: number, sx: number, sy: number): void {
    this.coverField.touch(x, z);
    for (const b of this.brainList) b.touch(x, z);
    // Flies may be in the air: test the touch at their altitude.
    for (const f of this.flies) if (this.world.pick(sx, sy, tmp, f.pos.y + 0.05)) f.touch(tmp.x, tmp.z);
  }

  pointer(x: number, z: number, speed: number, sx: number, sy: number): void {
    for (const b of this.brainList) b.pointer(x, z, speed);
    for (const f of this.flies) if (this.world.pick(sx, sy, tmp, f.pos.y + 0.05)) f.pointer(tmp.x, tmp.z, speed);
  }

  noise(level: 1 | 2): void {
    for (const b of this.brainList) b.noise(level);
    for (const f of this.flies) f.noise(level);
  }

  update(dt: number): void {
    for (const b of this.brainList) b.update(dt);
    for (const w of this.walkerList) w.update(dt);
    for (const f of this.flies) f.update(dt);
    this.coverField.update(dt, this.walkerList);
  }

  private resize(list: Brain[], count: number, spawn: () => Brain): void {
    while (list.length > count) {
      const brain = list.pop()!;
      brain.dispose();
      brain.body.dispose();
    }
    while (list.length < count) list.push(spawn());
  }

  private applySkins(): void {
    const first = SKIN_IDS.indexOf(this.skin);
    this.lizards.forEach((b, i) => (b.body as Lizard).setSkin(SKINS[SKIN_IDS[(first + i) % SKIN_IDS.length]]));
  }

  private spawnLizard(): Brain {
    const lizard = new Lizard(SKINS[this.skin], this.world.maxAnisotropy);
    lizard.onFootfall = (intensity, fx) => this.voice.step(intensity, this.world.panOf(fx));
    return this.place(lizard, LIZARD, {
      call: () => this.voice.chirp(this.world.panOf(lizard.bodyX)),
      alarm: () => this.voice.squeak(this.world.panOf(lizard.bodyX)),
    });
  }

  private spawnMouse(): Brain {
    const mouse = new Mouse(MOUSE_COATS[this.mice.length % MOUSE_COATS.length]);
    mouse.onFootfall = (intensity, fx) => this.voice.step(intensity, this.world.panOf(fx));
    return this.place(mouse, MOUSE, {
      call: () => this.voice.mouseSqueak(this.world.panOf(mouse.bodyX), false),
      alarm: () => this.voice.mouseSqueak(this.world.panOf(mouse.bodyX), true),
    });
  }

  /** Puts a new animal somewhere on screen, not on top of the others. */
  private place(body: GroundCreature, species: Species, voice: BrainVoice): Brain {
    const b = this.bounds;
    let x = 0, z = 0;
    for (let i = 0; i < 20; i++) {
      x = rand(b.minX + 0.4, b.maxX - 0.4);
      z = rand(b.minZ + 0.4, b.maxZ - 0.4);
      if (this.walkerList.every((o) => Math.hypot(o.pos.x - x, o.pos.y - z) > 0.9)) break;
    }
    body.teleport(x, z, rand(0, TAU));
    this.world.scene.add(body.group);
    const brain = new Brain(body, species, this, voice);
    this.walkerList = [...this.walkerList, body];
    return brain;
  }
}
