import { BUG_COLORS } from './game/bug/bugs';
import { CATERPILLAR_COLORS } from './game/bug/caterpillar';
import type { CoverKind } from './game/covers';
import { FISH_COLORS } from './game/fish/kinds';
import { BIRD_COLORS } from './game/flyer/bird';
import { FLY_COLORS } from './game/flyer/fly';
import { LADYBUG_COLORS } from './game/flyer/ladybug';
import { LAND_GROUNDS, SKY_GROUNDS, WATER_GROUNDS, type GroundTheme } from './game/ground';
import { FROG_COLORS } from './game/hopper/frog';
import { GRASSHOPPER_COLORS } from './game/hopper/grasshopper';
import { LIZARD_SKINS, LONGTAIL_SKINS } from './game/lizard/skin';
import { COATS } from './game/mammal/builds';
import { BUTTERFLY_COLORS } from './game/sky/butterfly';
import { FEATHER_COLORS } from './game/sky/feather';
import { FIREFLY_COLORS } from './game/sky/firefly';
import { LASER_COLORS } from './game/sky/laser';
import type { Variant } from './game/variant';

export type Theme = 'land' | 'water' | 'sky';
export const THEMES: readonly Theme[] = ['land', 'water', 'sky'];

/** A festive look on top of the theme: outfits, decorations and weather. */
export type Fete = 'none' | 'christmas' | 'halloween' | 'easter';
export const FETES: readonly Fete[] = ['none', 'christmas', 'halloween', 'easter'];

/** What the menu offers: a fête, none, or the one in season. */
export type FeteChoice = Fete | 'auto';
export const FETE_CHOICES: readonly FeteChoice[] = ['auto', ...FETES];

export const FETE_ICON: Record<Exclude<Fete, 'none'>, string> = { christmas: '🎄', halloween: '🎃', easter: '🐣' };

/** The hiding spot each fête adds on land, on top of the chosen ones. */
export const FETE_COVER: Record<Exclude<Fete, 'none'>, CoverKind> = { christmas: 'stocking', halloween: 'pumpkin', easter: 'egg' };

/** Easter Sunday (Gregorian calendar, anonymous algorithm). */
function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** The fête in season: Halloween from Oct 18 to Nov 2, Christmas from Dec 1 to Jan 6, Easter for the 10 days before and a week after. */
export function feteOn(date: Date): Fete {
  const month = date.getMonth() + 1, day = date.getDate();
  if ((month === 10 && day >= 18) || (month === 11 && day <= 2)) return 'halloween';
  if (month === 12 || (month === 1 && day <= 6)) return 'christmas';
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const easter = easterSunday(date.getFullYear()).getTime();
  const DAY = 86_400_000;
  if (today >= easter - 10 * DAY && today <= easter + 7 * DAY) return 'easter';
  return 'none';
}

export const resolveFete = (choice: FeteChoice, date = new Date()): Fete => (choice === 'auto' ? feteOn(date) : choice);

/** Same limit for every species. */
const MAX = 4;

export type AnimalKey =
  | 'lizards' | 'longtails' | 'frogs' | 'flies' | 'ladybugs' | 'beetles' | 'grasshoppers' | 'roaches' | 'caterpillars'
  | 'mice' | 'squirrels' | 'birds'
  | 'goldfish' | 'kois' | 'sardines' | 'sharks' | 'salmons' | 'trouts'
  | 'butterflies' | 'fireflies' | 'feathers' | 'laser';

/** Menu sections of a theme's animals. */
export type Group = 'reptiles' | 'bugs' | 'small' | 'fish' | 'winged' | 'toys';

export interface SpeciesInfo {
  key: AnimalKey;
  icon: string;
  /** Most of them on screen at once. */
  max: number;
  group: Group;
  variants: readonly Variant[];
}

const info = (key: AnimalKey, icon: string, group: Group, variants: readonly Variant[]): SpeciesInfo =>
  ({ key, icon, max: MAX, group, variants });

export const SPECIES: Record<Theme, readonly SpeciesInfo[]> = {
  land: [
    info('lizards', '🦎', 'reptiles', LIZARD_SKINS),
    info('longtails', '🦎', 'reptiles', LONGTAIL_SKINS),
    info('frogs', '🐸', 'reptiles', FROG_COLORS),
    info('flies', '🪰', 'bugs', FLY_COLORS),
    info('ladybugs', '🐞', 'bugs', LADYBUG_COLORS),
    info('beetles', '🪲', 'bugs', BUG_COLORS.beetles),
    info('grasshoppers', '🦗', 'bugs', GRASSHOPPER_COLORS),
    info('roaches', '🪳', 'bugs', BUG_COLORS.roaches),
    info('caterpillars', '🐛', 'bugs', CATERPILLAR_COLORS),
    info('mice', '🐭', 'small', COATS.mice),
    info('squirrels', '🐿️', 'small', COATS.squirrels),
    info('birds', '🐦', 'small', BIRD_COLORS),
  ],
  water: [
    info('goldfish', '🐠', 'fish', FISH_COLORS.goldfish),
    info('kois', '🎏', 'fish', FISH_COLORS.kois),
    info('sardines', '🐟', 'fish', FISH_COLORS.sardines),
    info('trouts', '🐟', 'fish', FISH_COLORS.trouts),
    info('salmons', '🐟', 'fish', FISH_COLORS.salmons),
    info('sharks', '🦈', 'fish', FISH_COLORS.sharks),
  ],
  sky: [
    info('butterflies', '🦋', 'winged', BUTTERFLY_COLORS),
    info('fireflies', '✨', 'winged', FIREFLY_COLORS),
    info('feathers', '🪶', 'toys', FEATHER_COLORS),
    info('laser', '🔴', 'toys', LASER_COLORS),
  ],
};

export const ALL_SPECIES: readonly SpeciesInfo[] = [...SPECIES.land, ...SPECIES.water, ...SPECIES.sky];

export const GROUNDS: Record<Theme, readonly GroundTheme[]> = { land: LAND_GROUNDS, water: WATER_GROUNDS, sky: SKY_GROUNDS };

export const COVERS: Record<Theme, readonly { kind: CoverKind; icon: string }[]> = {
  land: [
    { kind: 'leaf', icon: '🍂' },
    { kind: 'stone', icon: '🪨' },
    { kind: 'grass', icon: '🌿' },
    { kind: 'tulip', icon: '🌷' },
    { kind: 'boot', icon: '👢' },
  ],
  water: [
    { kind: 'lily', icon: '🪷' },
    { kind: 'rock', icon: '🪨' },
    { kind: 'weed', icon: '🌱' },
  ],
  sky: [
    { kind: 'tulip', icon: '🌷' },
    { kind: 'grass', icon: '🌿' },
    { kind: 'stone', icon: '🪨' },
  ],
};
