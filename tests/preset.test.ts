import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/catalog';
import { applyPreset, presetQuery } from '../src/preset';
import { fromSaved } from '../src/settings';

const fresh = () => fromSaved({ lang: 'fr' });
const koiColors = SPECIES.water.find((sp) => sp.key === 'kois')!.variants.map((v) => v.id);

describe('presets', () => {
  it('rebuilds the same scene from the link it wrote', () => {
    const a = fresh();
    a.theme = 'water';
    a.fete = 'christmas';
    a.animals.goldfish = 0;
    a.animals.kois = 2;
    a.animals.sardines = 1;
    a.colors.kois = koiColors[1];
    a.ground.water = 'lagoon';
    a.covers.water = ['rock'];
    a.size = 'large';
    a.speed = 'fast';
    a.style = 'pixel';

    const b = fresh();
    expect(applyPreset(b, `?${presetQuery(a)}`)).toBe(true);
    expect(b.theme).toBe('water');
    expect(b.fete).toBe('christmas');
    expect(b.animals.goldfish).toBe(0);
    expect(b.animals.kois).toBe(2);
    expect(b.animals.sardines).toBe(1);
    expect(b.colors.kois).toBe(a.colors.kois);
    expect(b.ground.water).toBe('lagoon');
    expect(b.covers.water).toEqual(['rock']);
    expect(b.size).toBe('large');
    expect(b.speed).toBe('fast');
    expect(b.style).toBe('pixel');
    // The owner's own preferences are not in the link.
    expect(presetQuery(a)).not.toContain('volume');
  });

  it('ignores what it does not know', () => {
    const s = fresh();
    expect(applyPreset(s, 'theme=moon&speed=warp&animals=dragons:3')).toBe(false);
    expect(s.theme).toBe('land');
    expect(s.speed).toBe('auto');
    expect(s.animals.lizards).toBe(1);
  });

  it('applies the valid part of a link', () => {
    const s = fresh();
    expect(applyPreset(s, 'theme=sky&speed=warp')).toBe(true);
    expect(s.theme).toBe('sky');
    expect(s.speed).toBe('auto');
  });

  it('does nothing with an empty link', () => {
    const s = fresh();
    expect(applyPreset(s, '')).toBe(false);
  });
});
