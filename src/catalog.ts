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

const info = (key: AnimalKey, icon: string, max: number, group: Group, variants: readonly Variant[]): SpeciesInfo =>
  ({ key, icon, max, group, variants });

export const SPECIES: Record<Theme, readonly SpeciesInfo[]> = {
  land: [
    info('lizards', '🦎', 4, 'reptiles', LIZARD_SKINS),
    info('longtails', '🦎', 3, 'reptiles', LONGTAIL_SKINS),
    info('frogs', '🐸', 3, 'reptiles', FROG_COLORS),
    info('flies', '🪰', 3, 'bugs', FLY_COLORS),
    info('ladybugs', '🐞', 4, 'bugs', LADYBUG_COLORS),
    info('beetles', '🪲', 3, 'bugs', BUG_COLORS.beetles),
    info('grasshoppers', '🦗', 3, 'bugs', GRASSHOPPER_COLORS),
    info('roaches', '🪳', 4, 'bugs', BUG_COLORS.roaches),
    info('mice', '🐭', 3, 'small', COATS.mice),
    info('squirrels', '🐿️', 2, 'small', COATS.squirrels),
    info('birds', '🐦', 3, 'small', BIRD_COLORS),
  ],
  water: [
    info('goldfish', '🐠', 5, 'fish', FISH_COLORS.goldfish),
    info('kois', '🎏', 3, 'fish', FISH_COLORS.kois),
    info('sardines', '🐟', 2, 'fish', FISH_COLORS.sardines),
    info('trouts', '🐟', 3, 'fish', FISH_COLORS.trouts),
    info('salmons', '🐟', 2, 'fish', FISH_COLORS.salmons),
    info('sharks', '🦈', 2, 'fish', FISH_COLORS.sharks),
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
