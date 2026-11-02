import type { AnimalKey } from './catalog';
import { clamp } from './game/math';

const STATS_KEY = 'meowtrix.stats';

/** The animals start to tire this long before the end, and are fully tired this much later. */
const TIRE_START = 60;
const TIRE_RAMP = 30;
/** Once time is up, the session ends just after the next catch, or after GRACE seconds anyway. */
const END_DELAY = 1.2;
const GRACE = 45;
/** Days of history kept. */
const DAYS_KEPT = 14;

/** Kept across sessions on this device. */
export interface Stats {
  total: number;
  /** Most catches in one session. */
  best: number;
  /** Catches per day (YYYY-MM-DD, local), the last two weeks. */
  days: Record<string, number>;
  /** Catches per species. */
  prey: Partial<Record<AnimalKey, number>>;
}

/** Local date as YYYY-MM-DD. */
export function dayKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function loadStats(): Stats {
  const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
  const counts = (v: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (v && typeof v === 'object') for (const [k, c] of Object.entries(v)) if (n(c)) out[k] = n(c);
    return out;
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}') as Partial<Stats>;
    return { total: n(saved.total), best: n(saved.best), days: counts(saved.days), prey: counts(saved.prey) };
  } catch {
    return { total: 0, best: 0, days: {}, prey: {} };
  }
}

/**
 * One play session: its catches and its timer. Near the end of a timed session the animals tire,
 * and the session ends right after a catch, so the hunt finishes on a success.
 */
export class Session {
  catches = 0;
  /** Seconds played; the timer stops while the menu is open. */
  elapsed = 0;
  readonly stats = loadStats();
  /** Seconds, 0 for no limit. */
  private limit = 0;
  private endAt = Infinity;

  start(minutes: number): void {
    this.catches = 0;
    this.elapsed = 0;
    this.endAt = Infinity;
    this.setLength(minutes);
  }

  /** The length can change during a session (from the menu). */
  setLength(minutes: number): void {
    this.limit = minutes * 60;
  }

  get timed(): boolean {
    return this.limit > 0;
  }

  /** 0 … 1: how tired the animals are. */
  get tired(): number {
    return this.limit ? clamp((this.elapsed - (this.limit - TIRE_START)) / TIRE_RAMP, 0, 1) : 0;
  }

  /** Whole minutes left, rounded up. */
  get minutesLeft(): number {
    return Math.max(0, Math.ceil((this.limit - this.elapsed) / 60));
  }

  caught(key: AnimalKey): void {
    this.catches++;
    const s = this.stats;
    s.total++;
    s.best = Math.max(s.best, this.catches);
    s.prey[key] = (s.prey[key] ?? 0) + 1;
    const today = dayKey();
    s.days[today] = (s.days[today] ?? 0) + 1;
    for (const day of Object.keys(s.days).sort().slice(0, -DAYS_KEPT)) delete s.days[day];
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(s));
    } catch {
      // Not kept; fine.
    }
    if (this.limit && this.elapsed >= this.limit) this.endAt = Math.min(this.endAt, this.elapsed + END_DELAY);
  }

  /** Advances the timer while playing; true when the session is over. */
  update(dt: number): boolean {
    this.elapsed += dt;
    if (!this.limit) return false;
    return this.elapsed >= this.endAt || this.elapsed >= this.limit + GRACE;
  }
}
