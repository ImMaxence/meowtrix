import type { CoverMode } from './game/covers';
import type { GroundTheme } from './game/ground';
import { SKIN_IDS, type SkinId } from './game/lizard/skin';
import type { ViewSize } from './game/world';
import { detectLang, type Lang } from './i18n';

export type Speed = 'slow' | 'normal' | 'fast';

export const SPEED_FACTOR: Record<Speed, number> = { slow: 0.6, normal: 1, fast: 1.45 };

/** Maximum number of each animal on screen. */
export const MAX_COUNT = { lizards: 4, mice: 3, flies: 3 } as const;

export type AnimalKey = keyof typeof MAX_COUNT;

export interface Settings {
  lang: Lang;
  lizards: number;
  mice: number;
  flies: number;
  skin: SkinId;
  covers: CoverMode;
  size: ViewSize;
  ground: GroundTheme;
  speed: Speed;
  sound: boolean;
  mic: boolean;
}

const KEY = 'meowtrix.settings';

const oneOf = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const count = (value: unknown, max: number, fallback: number): number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max ? (value as number) : fallback;

export function loadSettings(): Settings {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    // Storage blocked or corrupted: use defaults.
  }
  const s: Settings = {
    lang: oneOf(saved.lang, ['fr', 'en'] as const, detectLang()),
    // `count` is the lizard count saved by earlier versions.
    lizards: count(saved.lizards ?? saved.count, MAX_COUNT.lizards, 1),
    mice: count(saved.mice, MAX_COUNT.mice, 0),
    flies: count(saved.flies, MAX_COUNT.flies, 0),
    skin: oneOf(saved.skin, SKIN_IDS, 'green'),
    covers: oneOf(saved.covers, ['none', 'leaves', 'stones', 'both'] as const, 'both'),
    size: oneOf(saved.size, ['small', 'medium', 'large'] as const, 'medium'),
    ground: oneOf(saved.ground, ['stone', 'sand', 'night'] as const, 'stone'),
    speed: oneOf(saved.speed, ['slow', 'normal', 'fast'] as const, 'normal'),
    sound: oneOf(saved.sound, [true, false], true),
    mic: oneOf(saved.mic, [true, false], false),
  };
  if (s.lizards + s.mice + s.flies === 0) s.lizards = 1;
  return s;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not persisted; fine.
  }
}
