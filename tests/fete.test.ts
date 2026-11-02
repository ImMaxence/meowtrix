import { describe, expect, it } from 'vitest';
import { feteOn } from '../src/catalog';

const on = (year: number, month: number, day: number) => feteOn(new Date(year, month - 1, day));

describe('feteOn', () => {
  it('is Halloween from October 18 to November 2', () => {
    expect(on(2026, 10, 17)).toBe('none');
    expect(on(2026, 10, 18)).toBe('halloween');
    expect(on(2026, 10, 31)).toBe('halloween');
    expect(on(2026, 11, 2)).toBe('halloween');
    expect(on(2026, 11, 3)).toBe('none');
  });

  it('is Christmas from December 1 to January 6', () => {
    expect(on(2026, 11, 30)).toBe('none');
    expect(on(2026, 12, 1)).toBe('christmas');
    expect(on(2026, 12, 25)).toBe('christmas');
    expect(on(2027, 1, 6)).toBe('christmas');
    expect(on(2027, 1, 7)).toBe('none');
  });

  it('is Easter for the ten days before Easter Sunday and the week after', () => {
    // Easter Sunday 2026 is April 5; 2027 is March 28.
    expect(on(2026, 3, 25)).toBe('none');
    expect(on(2026, 3, 26)).toBe('easter');
    expect(on(2026, 4, 5)).toBe('easter');
    expect(on(2026, 4, 12)).toBe('easter');
    expect(on(2026, 4, 13)).toBe('none');
    expect(on(2027, 3, 28)).toBe('easter');
  });

  it('is nothing in summer', () => {
    expect(on(2026, 7, 14)).toBe('none');
  });
});
