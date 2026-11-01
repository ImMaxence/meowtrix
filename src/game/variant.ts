/** One colour option of a species, as offered in the menu. */
export interface Variant {
  id: string;
  /** CSS background for the round swatch. */
  swatch: string;
}

/** A diagonal band across the swatch: main colour, band, second colour. */
export const banded = (a: string, band: string, b = a): string =>
  `linear-gradient(135deg, ${a} 0 45%, ${band} 45% 58%, ${b} 58% 100%)`;

/** Dots on a plain background (ladybugs, dalmatians). */
export const dotted = (base: string, dot: string): string =>
  `radial-gradient(circle at 30% 34%, ${dot} 0 13%, transparent 14%), radial-gradient(circle at 68% 58%, ${dot} 0 12%, transparent 13%), ` +
  `radial-gradient(circle at 38% 74%, ${dot} 0 9%, transparent 10%), ${base}`;

/** Two halves (piebald coats, koi). */
export const halves = (a: string, b: string): string => `linear-gradient(160deg, ${a} 0 52%, ${b} 52% 100%)`;

/** Picks the variant `offset` places after `id` in the list, wrapping around. */
export function variantAt<T extends Variant>(list: readonly T[], id: string, offset: number): T {
  const first = Math.max(0, list.findIndex((v) => v.id === id));
  return list[(first + offset) % list.length];
}
