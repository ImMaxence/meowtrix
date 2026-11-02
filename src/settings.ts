import { ALL_SPECIES, COVERS, FETE_CHOICES, GROUNDS, SPECIES, THEMES, type AnimalKey, type FeteChoice, type Theme } from './catalog';
import type { CoverKind } from './game/covers';
import type { GroundTheme } from './game/ground';
import type { RenderStyle, ViewSize } from './game/world';
import { detectLang } from './i18n';
import { LANG_CODES, type Lang } from './langs';

/** 'auto' follows how the cat does (see Game.weighAuto). */
export type Speed = 'auto' | 'slow' | 'normal' | 'fast';
export const SPEEDS: readonly Speed[] = ['auto', 'slow', 'normal', 'fast'];

export const SPEED_FACTOR: Record<Speed, number> = { auto: 1, slow: 0.6, normal: 1, fast: 1.45 };

/** Hours between two automatic sessions on a tablet left on its stand; 0 for none. */
export type RestHours = 0 | 1 | 2 | 4;
export const REST_HOURS: readonly RestHours[] = [0, 1, 2, 4];

/** Length of a play session in minutes; 0 for no limit. */
export type SessionLength = 0 | 5 | 10 | 15;
export const SESSION_LENGTHS: readonly SessionLength[] = [0, 5, 10, 15];

export const STYLES: readonly RenderStyle[] = ['classic', 'pixel'];

/** Longest cat name kept. */
export const CAT_NAME_MAX = 24;

export interface Settings {
  lang: Lang;
  theme: Theme;
  /** Christmas, Halloween or Easter: outfits, decorations and weather on top of the theme; 'auto' follows the calendar. */
  fete: FeteChoice;
  /** How many of each animal; only the current theme's are on screen. */
  animals: Record<AnimalKey, number>;
  /** Chosen colour of each animal (a variant id). */
  colors: Record<AnimalKey, string>;
  ground: Record<Theme, GroundTheme>;
  covers: Record<Theme, CoverKind[]>;
  size: ViewSize;
  style: RenderStyle;
  speed: Speed;
  session: SessionLength;
  /** With a timed session: the screen rests, then a new session starts on its own. */
  rest: RestHours;
  /** Catches and time left in a corner of the screen while playing. */
  hud: boolean;
  /** Used in the catch count and the shared message; may be empty. */
  catName: string;
  /** Sound volume, 0 (off) … 1 (loudest). */
  volume: number;
  mic: boolean;
  /** Buzz when a paw catches an animal (phones that support it). */
  vibration: boolean;
}

const KEY = 'meowtrix.settings';

const DEFAULT_ANIMALS: Partial<Record<AnimalKey, number>> = { lizards: 1, goldfish: 2, kois: 1, butterflies: 2, laser: 1 };
const DEFAULT_COVERS: Record<Theme, CoverKind[]> = { land: ['leaf', 'stone'], water: ['lily', 'rock', 'weed'], sky: ['tulip', 'grass'] };

const oneOf = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const count = (value: unknown, max: number, fallback: number): number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max ? (value as number) : fallback;

type Saved = Record<string, unknown>;
const obj = (v: unknown): Saved => (v && typeof v === 'object' ? (v as Saved) : {});

/** Total number of animals of a theme. */
export const themeTotal = (s: Settings, theme: Theme): number => SPECIES[theme].reduce((n, sp) => n + s.animals[sp.key], 0);

/** Settings from what was saved, with defaults for anything missing or invalid. */
export function fromSaved(saved: Saved): Settings {
  const animals = obj(saved.animals), colors = obj(saved.colors), ground = obj(saved.ground), covers = obj(saved.covers);
  // Earlier versions saved the land animals, skin, ground and covers flat.
  const legacy: Saved = { lizards: saved.lizards ?? saved.count, mice: saved.mice, flies: saved.flies };
  const legacyCovers: Record<string, CoverKind[]> = { none: [], leaves: ['leaf'], stones: ['stone'], both: ['leaf', 'stone'] };

  const s = {
    lang: oneOf(saved.lang, LANG_CODES, detectLang()),
    theme: oneOf(saved.theme, THEMES, 'land'),
    // Before the automatic fête (0.5), 'none' was only the default: let those follow the calendar too.
    fete: saved.fete === 'none' && !('session' in saved) ? 'auto' : oneOf(saved.fete, FETE_CHOICES, 'auto'),
    animals: {} as Record<AnimalKey, number>,
    colors: {} as Record<AnimalKey, string>,
    ground: {} as Record<Theme, GroundTheme>,
    covers: {} as Record<Theme, CoverKind[]>,
    size: oneOf(saved.size, ['small', 'medium', 'large'] as const, 'medium'),
    style: oneOf(saved.style, STYLES, 'classic'),
    speed: oneOf(saved.speed, SPEEDS, 'auto'),
    session: oneOf(saved.session, SESSION_LENGTHS, 0),
    rest: oneOf(saved.rest, REST_HOURS, 0),
    hud: oneOf(saved.hud, [true, false], true),
    catName: typeof saved.catName === 'string' ? saved.catName.slice(0, CAT_NAME_MAX) : '',
    // Earlier versions only had sound on or off.
    volume: typeof saved.volume === 'number' && saved.volume >= 0 && saved.volume <= 1 ? saved.volume : saved.sound === false ? 0 : 0.7,
    mic: oneOf(saved.mic, [true, false], false),
    vibration: oneOf(saved.vibration, [true, false], true),
  } satisfies Settings;

  for (const sp of ALL_SPECIES) {
    s.animals[sp.key] = count(animals[sp.key] ?? legacy[sp.key], sp.max, DEFAULT_ANIMALS[sp.key] ?? 0);
    const ids = sp.variants.map((v) => v.id);
    s.colors[sp.key] = oneOf(colors[sp.key] ?? (sp.key === 'lizards' ? saved.skin : undefined), ids, ids[0]);
  }
  for (const theme of THEMES) {
    s.ground[theme] = oneOf(ground[theme] ?? (theme === 'land' ? saved.ground : undefined), GROUNDS[theme], GROUNDS[theme][0]);
    const kinds = COVERS[theme].map((c) => c.kind);
    const raw = covers[theme] ?? (theme === 'land' && typeof saved.covers === 'string' ? legacyCovers[saved.covers] : undefined);
    s.covers[theme] = Array.isArray(raw) ? kinds.filter((k) => raw.includes(k)) : [...DEFAULT_COVERS[theme]];
    // Keep at least one animal on screen.
    if (themeTotal(s, theme) === 0) s.animals[SPECIES[theme][0].key] = 1;
  }
  return s;
}

export function loadSettings(): Settings {
  let saved: Saved = {};
  try {
    saved = obj(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
  } catch {
    // Storage blocked or corrupted: use defaults.
  }
  return fromSaved(saved);
}

/** Back to a single green lizard on stone, keeping the owner's preferences (language, volume, mic, vibration, session, cat's name). */
export function resetSettings(s: Settings): void {
  Object.assign(s, fromSaved({
    lang: s.lang, volume: s.volume, mic: s.mic, vibration: s.vibration, session: s.session, catName: s.catName, hud: s.hud,
  }));
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not persisted; fine.
  }
}
