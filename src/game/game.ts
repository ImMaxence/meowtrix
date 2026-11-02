import * as THREE from 'three';
import type { Voice } from '../audio/voice';
import { FETE_COVER, SPECIES, type AnimalKey, type Fete, type Theme } from '../catalog';
import { Brain, type BrainVoice, type Habitat, type Species } from './brain';
import { Bug } from './bug/bug';
import { BEETLE_BUILD, BUG_COLORS, ROACH_BUILD } from './bug/bugs';
import { Caterpillar, CATERPILLAR_COLORS } from './bug/caterpillar';
import { Burst } from './burst';
import { Covers, type Cover, type CoverKind } from './covers';
import type { Creature, Walker } from './creature';
import { dress } from './fete';
import { Fish } from './fish/fish';
import { FISH_BUILDS, FISH_COLORS } from './fish/kinds';
import { School } from './fish/school';
import { BIRD_COLORS, BIRD_STYLE, BirdBody } from './flyer/bird';
import { FLY_COLORS, FLY_STYLE, FlyBody } from './flyer/fly';
import { Flyer, type FlyerBody, type FlightStyle, type FlyerSound } from './flyer/flyer';
import { LADYBUG_COLORS, LADYBUG_STYLE, LadybugBody } from './flyer/ladybug';
import { Frog, FROG_COLORS } from './hopper/frog';
import { Grasshopper, GRASSHOPPER_COLORS } from './hopper/grasshopper';
import { Lizard } from './lizard/lizard';
import { LIZARD_BUILD, LONGTAIL_BUILD } from './lizard/profile';
import { LIZARD_SKINS, LONGTAIL_SKINS } from './lizard/skin';
import { COATS, MOUSE_BUILD, SQUIRREL_BUILD, type Coat, type MammalBuild } from './mammal/builds';
import { Mammal } from './mammal/mammal';
import { chance, rand, TAU } from './math';
import { Shadow } from './shadow';
import { BUTTERFLY_COLORS, BUTTERFLY_STYLE, ButterflyBody } from './sky/butterfly';
import { Feather, FEATHER_COLORS } from './sky/feather';
import { FIREFLY_COLORS, FIREFLY_STYLE, FireflyBody } from './sky/firefly';
import { LASER_COLORS, LaserDot } from './sky/laser';
import type { Toy } from './sky/toy';
import * as SP from './species';
import { variantAt, type Variant } from './variant';
import { SURFACE } from './water';
import type { Bounds, World } from './world';

/** Fish are touched where they swim, not on the bottom. */
const SWIM_HEIGHT = 0.28;

/** A paw lands with several pads at once: touches this close together count as one catch. */
const CATCH_GAP = 0.4;

/** Seconds between two surprises (a passing shadow, a visitor) while the cat plays. */
const EVENT_GAP: readonly [number, number] = [50, 130];
/** How long a visitor stays before heading home. */
const VISIT: readonly [number, number] = [25, 50];

/** Auto speed: touches and catches are weighed over this many seconds, within these bounds. */
const AUTO_WINDOW = 30;
const AUTO_MIN = 0.6;
const AUTO_MAX = 1.45;

type Actor = { brain: Brain } | { flyer: Flyer } | { toy: Toy };

/** How to make one animal of a species, wearing a given colour. */
type Spawner = (color: string, offset: number) => Actor;

/** An animal of the theme that isn't in the menu's count: it comes by for a while, then leaves. */
interface Visitor {
  key: AnimalKey;
  actor: { brain: Brain };
  leaveAt: number;
  leaving: boolean;
}

const tmp = new THREE.Vector3();

/** All the animals and hiding spots of the current theme, wired to the world, the input and the sound. */
export class Game implements Habitat {
  /** Speed setting (slow / normal / fast). */
  speed = 1;
  /** Speed set to Auto: follows how the cat does (see weighAuto). */
  autoSpeed = false;
  /** 0 … 1, raised near the end of a timed session (see Habitat.tired). */
  tired = 0;
  /** True while the cat plays (menu closed): surprises happen only then. */
  active = false;
  /** A paw landed right on an animal: counted, and a little vibration. */
  onCatch: ((key: AnimalKey) => void) | null = null;
  private time = 0;
  private lastCatch = -Infinity;
  private theme: Theme = 'land';
  private fete: Fete = 'none';
  /** Hiding spots chosen in the menu; a fête adds its own on land. */
  private chosenCovers: readonly CoverKind[] = [];
  private readonly actors = new Map<AnimalKey, Actor[]>();
  private readonly colors = new Map<AnimalKey, string>();
  private visitors: Visitor[] = [];
  private brains: Brain[] = [];
  private flyers: Flyer[] = [];
  private toys: Toy[] = [];
  private walkerList: Walker[] = [];
  private readonly coverField: Covers;
  private readonly spawners: Record<AnimalKey, Spawner>;
  private readonly shadow = new Shadow();
  private readonly burst = new Burst();
  private nextEvent = rand(...EVENT_GAP);
  private autoFactor = 1;
  private autoClock = 0;
  private touches = 0;
  private catches = 0;

  constructor(private readonly world: World, private readonly voice: Voice) {
    this.coverField = new Covers(world.scene);
    this.spawners = this.makeSpawners();
    world.scene.add(this.shadow.mesh, this.burst.points);
  }

  get bounds(): Bounds {
    return this.world.bounds;
  }

  /** Tired animals slow down to half speed. */
  get speedFactor(): number {
    return (this.autoSpeed ? this.autoFactor : this.speed) * (1 - 0.5 * this.tired);
  }

  get walkers(): readonly Walker[] {
    return this.walkerList;
  }

  get covers(): readonly Cover[] {
    return this.coverField.list;
  }

  /** True while our own animals make sound the microphone could pick up. */
  get noisy(): boolean {
    return this.walkerList.some((w) => w.speed > 0.8) || this.flyers.some((f) => f.buzzing);
  }

  /** Switches between land and water: everything is replaced. */
  setTheme(theme: Theme, covers: readonly CoverKind[], animals: Record<AnimalKey, number>, colors: Record<AnimalKey, string>): void {
    for (const key of [...this.actors.keys()]) this.clear(key);
    for (const v of this.visitors) this.remove(v.actor);
    this.visitors = [];
    this.theme = theme;
    this.world.setWater(theme === 'water');
    this.setCovers(covers);
    this.setPopulation(animals, colors);
  }

  /** Dresses every animal for the fête and adds its hiding spot (stocking, pumpkin, egg) on land. */
  setFete(fete: Fete): void {
    this.fete = fete;
    this.world.setFete(fete);
    for (const a of this.allActors()) dress(this.heads(a), fete);
    this.setCovers(this.chosenCovers);
  }

  /** Adds or removes animals of the current theme; a species whose colour changed is recreated. */
  setPopulation(animals: Record<AnimalKey, number>, colors: Record<AnimalKey, string>): void {
    for (const { key } of SPECIES[this.theme]) {
      const list = this.actors.get(key) ?? [];
      this.actors.set(key, list);
      if (this.colors.get(key) !== colors[key]) this.clear(key);
      this.colors.set(key, colors[key]);
      while (list.length > animals[key]) this.remove(list.pop()!);
      while (list.length < animals[key]) {
        const a = this.spawners[key](colors[key], list.length);
        dress(this.heads(a), this.fete);
        list.push(a);
      }
    }
    this.refreshLists();
  }

  setCovers(kinds: readonly CoverKind[]): void {
    this.chosenCovers = kinds;
    const extra = this.theme !== 'water' && this.fete !== 'none' ? [FETE_COVER[this.fete]] : [];
    this.coverField.setKinds([...kinds, ...extra], this.bounds);
  }

  /** After the visible area changed. `force` re-lays out covers even if they still fit. */
  relayout(force: boolean): void {
    if (force) this.coverField.layout(this.bounds);
    else this.coverField.fit(this.bounds);
  }

  touch(x: number, z: number, sx: number, sy: number): void {
    this.touches++;
    if (this.world.underwater) {
      if (this.world.pick(sx, sy, tmp, SURFACE)) {
        this.world.ripple(tmp.x, tmp.z, 1);
        this.voice.splash(this.world.panOf(tmp.x), 0.5);
      }
      if (this.world.pick(sx, sy, tmp, SWIM_HEIGHT)) {
        x = tmp.x;
        z = tmp.z;
      }
    }
    this.coverField.touch(x, z);
    for (const b of this.brains) b.touch(x, z);
    // Flyers may be in the air: test the touch at their altitude.
    for (const f of this.flyers) {
      if (!this.world.pick(sx, sy, tmp, f.pos.y + 0.05)) continue;
      if (f.group.visible && Math.hypot(f.pos.x - tmp.x, f.pos.z - tmp.z) < 0.1 + 0.05 * this.tired) {
        this.caught(this.keyOf((a) => 'flyer' in a && a.flyer === f), f.pos.x, f.pos.y, f.pos.z);
      }
      f.touch(tmp.x, tmp.z);
    }
    for (const t of this.toys) {
      if (this.world.pick(sx, sy, tmp, t.pos.y) && t.touch(tmp.x, tmp.z)) {
        this.caught(this.keyOf((a) => 'toy' in a && a.toy === t), t.pos.x, t.pos.y, t.pos.z);
      }
    }
  }

  pointer(x: number, z: number, speed: number, sx: number, sy: number): void {
    if (this.world.underwater && this.world.pick(sx, sy, tmp, SWIM_HEIGHT)) {
      x = tmp.x;
      z = tmp.z;
    }
    for (const b of this.brains) b.pointer(x, z, speed);
    for (const f of this.flyers) if (this.world.pick(sx, sy, tmp, f.pos.y + 0.05)) f.pointer(tmp.x, tmp.z, speed);
    for (const t of this.toys) if (this.world.pick(sx, sy, tmp, t.pos.y)) t.pointer(tmp.x, tmp.z, speed);
  }

  noise(level: 1 | 2): void {
    for (const b of this.brains) b.noise(level);
    for (const f of this.flyers) f.noise(level);
    for (const t of this.toys) t.noise(level);
  }

  update(dt: number): void {
    this.time += dt;
    for (const b of this.brains) b.update(dt);
    for (const w of this.walkerList) w.update(dt);
    for (const f of this.flyers) f.update(dt);
    for (const t of this.toys) t.update(dt);
    this.coverField.update(dt, this.walkerList);
    this.shadow.update(dt);
    this.burst.update(dt);
    this.updateVisitors();
    this.updateEvents(dt);
    this.weighAuto(dt);
  }

  /**
   * Auto speed, every 30 s of play: many touches and no catch, the animals slow down; most
   * touches a catch, they speed up. A kitten and an old cat don't get the same game.
   */
  private weighAuto(dt: number): void {
    if (!this.active) return;
    this.autoClock += dt;
    if (this.autoClock < AUTO_WINDOW) return;
    this.autoClock = 0;
    const touches = this.touches, catches = this.catches;
    this.touches = this.catches = 0;
    if (!this.autoSpeed || touches < 3) return;
    if (catches === 0) this.autoFactor = Math.max(AUTO_MIN, this.autoFactor - 0.12);
    else if (catches >= 3 && catches / touches > 0.5) this.autoFactor = Math.min(AUTO_MAX, this.autoFactor + 0.1);
  }

  /** Now and then while the cat plays: a visitor comes by, or a shadow sweeps over and scares everyone. */
  private updateEvents(dt: number): void {
    if (!this.active || this.tired > 0) return;
    this.nextEvent -= dt;
    if (this.nextEvent > 0) return;
    this.nextEvent = rand(...EVENT_GAP);
    if (chance(0.5) && this.inviteVisitor()) return;
    this.shadow.start(this.bounds, this.world.underwater ? SURFACE + 0.01 : 0.01, () => this.noise(2));
  }

  /** A species of the theme that isn't on screen walks in for a while. Only walkers: flyers have no way in or out. */
  private inviteVisitor(): boolean {
    if (this.visitors.length) return false;
    const candidates = SPECIES[this.theme].filter((sp) => !this.actors.get(sp.key)?.length && sp.group !== 'toys');
    if (!candidates.length) return false;
    const sp = candidates[Math.floor(rand(0, candidates.length))];
    const actor = this.spawners[sp.key](sp.variants[Math.floor(rand(0, sp.variants.length))].id, 0);
    if (!('brain' in actor)) {
      this.remove(actor);
      return false;
    }
    dress(this.heads(actor), this.fete);
    actor.brain.arrive();
    this.visitors.push({ key: sp.key, actor, leaveAt: this.time + rand(...VISIT), leaving: false });
    this.refreshLists();
    return true;
  }

  private updateVisitors(): void {
    let left = false;
    for (const v of this.visitors) {
      if (!v.leaving && this.time >= v.leaveAt) {
        v.leaving = true;
        v.actor.brain.leave();
      }
      if (v.leaving && v.actor.brain.gone) {
        this.remove(v.actor);
        left = true;
      }
    }
    if (!left) return;
    this.visitors = this.visitors.filter((v) => !(v.leaving && v.actor.brain.gone));
    this.refreshLists();
  }

  private allActors(): Actor[] {
    return [...[...this.actors.values()].flat(), ...this.visitors.map((v) => v.actor)];
  }

  private refreshLists(): void {
    const all = this.allActors();
    this.brains = all.flatMap((a) => ('brain' in a ? [a.brain] : []));
    this.flyers = all.flatMap((a) => ('flyer' in a ? [a.flyer] : []));
    this.toys = all.flatMap((a) => ('toy' in a ? [a.toy] : []));
    this.walkerList = this.brains.map((b) => b.body);
  }

  /** The species of the actor matching `test` (a visitor's included). */
  private keyOf(test: (a: Actor) => boolean): AnimalKey {
    for (const [key, list] of this.actors) if (list.some(test)) return key;
    return this.visitors.find((v) => test(v.actor))?.key ?? SPECIES[this.theme][0].key;
  }

  private clear(key: AnimalKey): void {
    const list = this.actors.get(key);
    while (list?.length) this.remove(list.pop()!);
  }

  private caught(key: AnimalKey, x: number, y: number, z: number): void {
    if (this.time - this.lastCatch < CATCH_GAP) return;
    this.lastCatch = this.time;
    this.catches++;
    this.burst.spawn(x, y, z);
    this.onCatch?.(key);
  }

  private heads(a: Actor): readonly THREE.Object3D[] {
    return 'brain' in a ? a.brain.body.heads : 'flyer' in a ? a.flyer.heads : a.toy.heads;
  }

  private remove(a: Actor): void {
    // Outfits are shared: take them off before the body frees its geometry.
    dress(this.heads(a), 'none');
    if ('brain' in a) {
      a.brain.dispose();
      a.brain.body.dispose();
    } else if ('flyer' in a) a.flyer.dispose();
    else a.toy.dispose();
  }

  private makeSpawners(): Record<AnimalKey, Spawner> {
    const v = this.voice, pan = (w: Walker) => this.world.panOf(w.bodyX);
    /** Footfall sounds: claw ticks, a frog's plop, or insect feet (a pitch for the ticks). */
    const steps = (c: Creature, sound: 'step' | 'plop' | number) => {
      c.onFootfall = (intensity, fx) => {
        const p = this.world.panOf(fx);
        if (sound === 'step') v.step(intensity, p);
        else if (sound === 'plop') v.plop(intensity, p);
        else v.tick(intensity, p, sound);
      };
      return c;
    };
    /** A paw landed on a walker: its species, and where it stands. */
    const walkerCaught = (b: Creature, height: number) =>
      this.caught(this.keyOf((a) => 'brain' in a && a.brain.body === b), b.pos.x, height, b.pos.y);
    /** A Brain-driven animal whose calls are `cry(pan, alarm)`. */
    const walker = <V extends Variant>(
      list: readonly V[], species: Species, body: (variant: V) => Creature, cry?: (pan: number, alarm: boolean) => void,
    ): Spawner => (color, offset) => {
      const b = body(variantAt(list, color, offset));
      return {
        brain: this.place(b, species, {
          call: () => cry?.(pan(b), false),
          alarm: () => {
            cry?.(pan(b), true);
            walkerCaught(b, species.height);
          },
        }),
      };
    };
    const mammal = (build: MammalBuild, list: readonly Coat[], species: Species, cry: (p: number, a: boolean) => void) =>
      walker(list, species, (coat) => steps(new Mammal(build, coat), 'step'), cry);
    const flyer = <V extends Variant>(list: readonly V[], style: FlightStyle, body: (variant: V) => FlyerBody, sound: () => FlyerSound): Spawner =>
      (color, offset) => {
        const f = new Flyer(this, body(variantAt(list, color, offset)), style, sound());
        this.world.scene.add(f.group);
        return { flyer: f };
      };
    /** Butterflies and fireflies make no sound. */
    const silent = (): FlyerSound => ({ update: () => {}, dispose: () => {} });
    const toy = <V extends Variant>(list: readonly V[], make: (variant: V) => Toy): Spawner => (color, offset) => {
      const t = make(variantAt(list, color, offset));
      this.world.scene.add(t.group);
      return { toy: t };
    };
    /** Fish blow bubbles you can see and hear; big ones splash when they break the surface. */
    const fish = (key: keyof typeof FISH_BUILDS, species: Species): Spawner => (color, offset) => {
      const build = FISH_BUILDS[key];
      const colors = variantAt(FISH_COLORS[key], color, offset);
      const body = key === 'sardines' ? new School(build, colors, this) : new Fish(build, colors, this);
      const splashy = key === 'trouts' || key === 'salmons' || key === 'sharks';
      if (body instanceof Fish) {
        body.onSurface = (x, z) => {
          this.world.ripple(x, z, splashy ? 1 : 0.6);
          if (splashy) v.splash(this.world.panOf(x), 0.6);
          else v.bubbles(this.world.panOf(x));
        };
      }
      const blow = () => {
        const m = body.mouth;
        this.world.bubbles(m.x, m.y, m.z);
        v.bubbles(this.world.panOf(m.x));
      };
      body.onBubble = blow;
      body.onDart = () => v.swish(this.world.panOf(body.bodyX));
      return {
        brain: this.place(body, species, {
          call: blow,
          alarm: () => {
            v.splash(this.world.panOf(body.bodyX));
            walkerCaught(body, SWIM_HEIGHT);
          },
        }),
      };
    };

    const lizardCry = (p: number, alarm: boolean) => (alarm ? v.squeak(p) : v.chirp(p));
    return {
      lizards: walker(LIZARD_SKINS, SP.LIZARD, (skin) => steps(new Lizard(skin, this.world.maxAnisotropy, LIZARD_BUILD), 'step'), lizardCry),
      longtails: walker(LONGTAIL_SKINS, SP.LONGTAIL, (skin) => steps(new Lizard(skin, this.world.maxAnisotropy, LONGTAIL_BUILD), 'step'), lizardCry),
      frogs: walker(FROG_COLORS, SP.FROG, (c) => steps(new Frog(c), 'plop'), (p, a) => v.croak(p, a)),
      grasshoppers: walker(GRASSHOPPER_COLORS, SP.GRASSHOPPER, (c) => steps(new Grasshopper(c), 'step'), (p, a) => v.chirr(p, a)),
      roaches: walker(BUG_COLORS.roaches, SP.ROACH, (c) => steps(new Bug(ROACH_BUILD, c), 5500), (p, a) => (a ? v.skitter(p) : v.tick(0.5, p, 5500))),
      beetles: walker(BUG_COLORS.beetles, SP.BEETLE, (c) => steps(new Bug(BEETLE_BUILD, c), 2800), (p, a) => (a ? v.whirr(p) : v.tick(0.6, p, 2800))),
      // Silent, and too soft-footed to be heard.
      caterpillars: walker(CATERPILLAR_COLORS, SP.CATERPILLAR, (c) => new Caterpillar(c)),
      mice: mammal(MOUSE_BUILD, COATS.mice, SP.MOUSE, (p, a) => v.mouseSqueak(p, a)),
      squirrels: mammal(SQUIRREL_BUILD, COATS.squirrels, SP.SQUIRREL, (p, a) => v.chatter(p, a)),
      flies: flyer(FLY_COLORS, FLY_STYLE, (c) => new FlyBody(c), () => v.createBuzz()),
      // A soft, high hum: a low buzz with tremolo sounded like a helicopter.
      ladybugs: flyer(LADYBUG_COLORS, LADYBUG_STYLE, (c) => new LadybugBody(c), () => v.createBuzz({ base: rand(165, 195), volume: 0.02, wave: 'triangle', tremolo: 0.05, filter: 900 })),
      birds: flyer(BIRD_COLORS, BIRD_STYLE, (c) => new BirdBody(c), () => v.createFlutter()),
      goldfish: fish('goldfish', SP.GOLDFISH),
      kois: fish('kois', SP.KOI),
      sardines: fish('sardines', SP.SARDINES),
      trouts: fish('trouts', SP.TROUT),
      salmons: fish('salmons', SP.SALMON),
      sharks: fish('sharks', SP.SHARK),
      butterflies: flyer(BUTTERFLY_COLORS, BUTTERFLY_STYLE, (c) => new ButterflyBody(c), silent),
      fireflies: flyer(FIREFLY_COLORS, FIREFLY_STYLE, (c) => new FireflyBody(c), silent),
      feathers: toy(FEATHER_COLORS, (c) => new Feather(this, c, (x, size) => v.swish(this.world.panOf(x), 0.05 + 0.05 * size))),
      laser: toy(LASER_COLORS, (c) => new LaserDot(this, c)),
    };
  }

  /** Puts a new animal somewhere on screen, not on top of the others. */
  private place(body: Creature, species: Species, voice: BrainVoice): Brain {
    const b = this.bounds;
    const inset = Math.min(0.4 + species.size * 0.2, (b.maxX - b.minX) / 2, (b.maxZ - b.minZ) / 2);
    let x = 0, z = 0;
    for (let i = 0; i < 20; i++) {
      x = rand(b.minX + inset, b.maxX - inset);
      z = rand(b.minZ + inset, b.maxZ - inset);
      if (this.walkerList.every((o) => o.distanceTo(x, z) > 0.5 + species.size * 0.4)) break;
    }
    body.teleport(x, z, rand(0, TAU));
    this.world.scene.add(body.group);
    const brain = new Brain(body, species, this, voice);
    this.walkerList = [...this.walkerList, body];
    return brain;
  }
}
