import { BUG_COLORS } from './game/bug/bugs';
import type { CoverKind } from './game/covers';
import { FISH_COLORS } from './game/fish/kinds';
import { BIRD_COLORS } from './game/flyer/bird';
import { FLY_COLORS } from './game/flyer/fly';
import { LADYBUG_COLORS } from './game/flyer/ladybug';
import { LAND_GROUNDS, WATER_GROUNDS, type GroundTheme } from './game/ground';
import { FROG_COLORS } from './game/hopper/frog';
import { GRASSHOPPER_COLORS } from './game/hopper/grasshopper';
import { LIZARD_SKINS, LONGTAIL_SKINS } from './game/lizard/skin';
import { COATS } from './game/mammal/builds';
import type { Variant } from './game/variant';

export type Theme = 'land' | 'water';
export const THEMES: readonly Theme[] = ['land', 'water'];

/** A festive look on top of the theme: outfits, decorations and weather. */
export type Fete = 'none' | 'christmas' | 'halloween' | 'easter';
export const FETES: readonly Fete[] = ['none', 'christmas', 'halloween', 'easter'];

export const FETE_ICON: Record<Exclude<Fete, 'none'>, string> = { christmas: '🎄', halloween: '🎃', easter: '🐣' };

/** The hiding spot each fête adds on land, on top of the chosen ones. */
export const FETE_COVER: Record<Exclude<Fete, 'none'>, CoverKind> = { christmas: 'stocking', halloween: 'pumpkin', easter: 'egg' };

/** Same limit for every species. */
const MAX = 4;

export type AnimalKey =
  | 'lizards' | 'longtails' | 'frogs' | 'flies' | 'ladybugs' | 'beetles' | 'grasshoppers' | 'roaches'
  | 'mice' | 'squirrels' | 'birds'
  | 'goldfish' | 'kois' | 'sardines' | 'sharks' | 'salmons' | 'trouts';

/** Menu sections of the land animals. */
export type Group = 'reptiles' | 'bugs' | 'small' | 'fish';

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
};

export const ALL_SPECIES: readonly SpeciesInfo[] = [...SPECIES.land, ...SPECIES.water];

export const GROUNDS: Record<Theme, readonly GroundTheme[]> = { land: LAND_GROUNDS, water: WATER_GROUNDS };

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
};
