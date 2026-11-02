import { describe, expect, it } from 'vitest';
import { fromSaved } from '../src/settings';

// A language is always given: without one, the defaults ask the browser for its language.
const load = (saved: Record<string, unknown>) => fromSaved({ lang: 'fr', ...saved });

describe('fromSaved', () => {
  it('starts with one green lizard on stone, following the calendar', () => {
    const s = load({});
    expect(s.theme).toBe('land');
    expect(s.animals.lizards).toBe(1);
    expect(s.colors.lizards).toBe('green');
    expect(s.ground.land).toBe('stone');
    expect(s.fete).toBe('auto');
    expect(s.speed).toBe('auto');
    expect(s.session).toBe(0);
    expect(s.rest).toBe(0);
    expect(s.hud).toBe(true);
  });

  it('reads the flat settings of the first versions', () => {
    const s = load({ count: 3, skin: 'gecko', ground: 'sand', covers: 'both', mice: 2, sound: false });
    expect(s.animals.lizards).toBe(3);
    expect(s.colors.lizards).toBe('gecko');
    expect(s.ground.land).toBe('sand');
    expect(s.covers.land).toEqual(['leaf', 'stone']);
    expect(s.animals.mice).toBe(2);
    expect(s.volume).toBe(0);
  });

  it('lets a "no fête" saved before the automatic fête follow the calendar', () => {
    expect(load({ fete: 'none' }).fete).toBe('auto');
    expect(load({ fete: 'none', session: 0 }).fete).toBe('none');
    expect(load({ fete: 'christmas', session: 5 }).fete).toBe('christmas');
  });

  it('ignores invalid values and keeps at least one animal per theme', () => {
    const s = load({
      theme: 'moon', speed: 'warp', session: 7, volume: 3, rest: 3,
      animals: { lizards: 0, mice: 0, frogs: 99, goldfish: 0, kois: 0, butterflies: 0, laser: 0 },
      colors: { lizards: 'rainbow' },
    });
    expect(s.theme).toBe('land');
    expect(s.speed).toBe('auto');
    expect(s.session).toBe(0);
    expect(s.volume).toBe(0.7);
    expect(s.rest).toBe(0);
    expect(s.animals.frogs).toBe(0);
    expect(s.animals.lizards).toBe(1);
    expect(s.animals.goldfish).toBe(1);
    expect(s.animals.butterflies).toBe(1);
    expect(s.colors.lizards).toBe('green');
  });
});
