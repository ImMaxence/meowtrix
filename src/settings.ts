import type { CoverMode } from './game/covers';
import type { GroundTheme } from './game/ground';
import { SKINS, type SkinId } from './game/lizard/skin';
import type { ViewSize } from './game/world';
import { detectLang, type Lang } from './i18n';

export interface Settings {
  lang: Lang;
  skin: SkinId;
  count: 1 | 2 | 3 | 4;
  covers: CoverMode;
  size: ViewSize;
  ground: GroundTheme;
  sound: boolean;
  mic: boolean;
}

const KEY = 'meowtrix.settings';

const oneOf = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function loadSettings(): Settings {
  let saved: Partial<Record<keyof Settings, unknown>> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    // Storage blocked or corrupted: use defaults.
  }
  return {
    lang: oneOf(saved.lang, ['fr', 'en'] as const, detectLang()),
    skin: oneOf(saved.skin, Object.keys(SKINS) as SkinId[], 'green'),
    count: oneOf(saved.count, [1, 2, 3, 4] as const, 1),
    covers: oneOf(saved.covers, ['none', 'leaves', 'stones', 'both'] as const, 'both'),
    size: oneOf(saved.size, ['small', 'medium', 'large'] as const, 'medium'),
    ground: oneOf(saved.ground, ['stone', 'sand', 'night'] as const, 'stone'),
    sound: oneOf(saved.sound, [true, false], true),
    mic: oneOf(saved.mic, [true, false], false),
  };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not persisted; fine.
  }
}
