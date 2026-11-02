import { COVERS, FETE_CHOICES, GROUNDS, SPECIES, THEMES } from './catalog';
import { LANG_CODES, type Lang } from './langs';
import { SPEEDS, STYLES, themeTotal, type Settings } from './settings';

/**
 * The scene as link parameters: theme, fête, animals with their colours, ground, hiding spots,
 * size, speed and style. The owner's preferences (language, sound, microphone…) stay out of it.
 * Only plain ids, commas and colons, so the link needs no escaping.
 */
export function presetQuery(s: Settings): string {
  const t = s.theme;
  const animals = SPECIES[t].filter((sp) => s.animals[sp.key] > 0).map((sp) => `${sp.key}.${s.colors[sp.key]}:${s.animals[sp.key]}`);
  const parts = [
    `theme=${t}`, `fete=${s.fete}`, `animals=${animals.join(',')}`, `ground=${s.ground[t]}`,
    `covers=${s.covers[t].join(',')}`, `size=${s.size}`, `speed=${s.speed}`,
  ];
  if (s.style !== 'classic') parts.push(`style=${s.style}`);
  return parts.join('&');
}

/** Applies what a link or a landing page asks for; anything unknown is ignored. Returns true if something applied. */
export function applyPreset(s: Settings, query: string): boolean {
  const p = new URLSearchParams(query);
  let applied = false;
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | null => {
    const v = p.get(key);
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  };
  const set = <K extends keyof Settings>(key: K, value: Settings[K] | null) => {
    if (value === null) return;
    s[key] = value;
    applied = true;
  };

  set('theme', pick('theme', THEMES));
  const t = s.theme;
  set('fete', pick('fete', FETE_CHOICES));
  set('size', pick('size', ['small', 'medium', 'large'] as const));
  set('speed', pick('speed', SPEEDS));
  set('style', pick('style', STYLES));
  set('lang', pick<Lang>('lang', LANG_CODES));
  const ground = pick('ground', GROUNDS[t]);
  if (ground) set('ground', { ...s.ground, [t]: ground });

  const covers = p.get('covers');
  if (covers !== null) {
    const asked = covers.split(',');
    set('covers', { ...s.covers, [t]: COVERS[t].map((c) => c.kind).filter((k) => asked.includes(k)) });
  }

  const animals = p.get('animals');
  if (animals !== null) {
    const counts = { ...s.animals }, colors = { ...s.colors };
    for (const sp of SPECIES[t]) counts[sp.key] = 0;
    for (const entry of animals.split(',')) {
      const [name, n] = entry.split(':');
      const [key, color] = name.split('.');
      const sp = SPECIES[t].find((x) => x.key === key);
      const count = Number(n ?? 1);
      if (!sp || !Number.isInteger(count)) continue;
      counts[sp.key] = Math.max(0, Math.min(sp.max, count));
      if (sp.variants.some((v) => v.id === color)) colors[sp.key] = color;
    }
    // Keep at least one animal on screen: an empty list leaves the animals as they were.
    if (themeTotal({ ...s, animals: counts }, t) > 0) {
      set('animals', counts);
      set('colors', colors);
    }
  }
  return applied;
}
