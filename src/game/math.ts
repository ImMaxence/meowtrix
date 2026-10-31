export const TAU = Math.PI * 2;

export const clamp = (x: number, min: number, max: number): number => (x < min ? min : x > max ? max : x);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite smoothstep; also works with reversed edges (e0 > e1). */
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Wraps an angle to [-PI, PI). */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export const rand = (min: number, max: number): number => min + Math.random() * (max - min);

export const chance = (p: number): boolean => Math.random() < p;

/** Frame-rate independent smoothing factor for an exponential approach at `rate` per second. */
export const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);
