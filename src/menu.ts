import { SKINS, swatchCss, type SkinId } from './game/lizard/skin';
import { t, type Key, type Lang } from './i18n';
import type { Settings } from './settings';

interface Choice<T> {
  value: T;
  label: string;
  swatch?: string;
}

interface Group<T> {
  title: Key;
  current: T;
  choices: Choice<T>[];
  /** Shows the current choice's label next to the title (useful for swatches). */
  showValue?: boolean;
  help?: Key;
  pick: (value: T) => void;
}

function renderGroup<T>(g: Group<T>): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'opt';
  const head = document.createElement('div');
  head.className = 'opt-label';
  const title = document.createElement('span');
  title.textContent = t(g.title);
  head.append(title);
  if (g.showValue) {
    const value = document.createElement('span');
    value.className = 'opt-value';
    value.textContent = g.choices.find((c) => c.value === g.current)?.label ?? '';
    head.append(value);
  }

  const chips = document.createElement('div');
  chips.className = 'chips';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', t(g.title));
  for (const c of g.choices) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(c.value === g.current));
    if (c.swatch) {
      btn.className = 'chip swatch';
      btn.style.setProperty('--sw', c.swatch);
      btn.setAttribute('aria-label', c.label);
      btn.title = c.label;
    } else {
      btn.className = 'chip';
      btn.textContent = c.label;
    }
    btn.addEventListener('click', () => g.pick(c.value));
    chips.append(btn);
  }
  wrap.append(head, chips);

  if (g.help) {
    const help = document.createElement('p');
    help.className = 'opt-help';
    help.textContent = t(g.help);
    wrap.append(help);
  }
  return wrap;
}

export interface MenuHandlers {
  change: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  micSupported: boolean;
}

/** Rebuilds the options panel from the current settings. */
export function renderOptions(container: HTMLElement, s: Settings, h: MenuHandlers): void {
  const onOff: Choice<boolean>[] = [
    { value: true, label: t('on') },
    { value: false, label: t('off') },
  ];
  const groups: HTMLElement[] = [
    renderGroup<Lang>({
      title: 'language', current: s.lang, pick: (v) => h.change('lang', v),
      choices: [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }],
    }),
    renderGroup({
      title: 'lizard', current: s.skin, showValue: true, pick: (v) => h.change('skin', v),
      choices: (Object.keys(SKINS) as SkinId[]).map((id) => ({
        value: id, label: t(`skin_${id}`), swatch: swatchCss(SKINS[id]),
      })),
    }),
    renderGroup<Settings['count']>({
      title: 'count', current: s.count, pick: (v) => h.change('count', v),
      choices: ([1, 2, 3, 4] as const).map((v) => ({ value: v, label: String(v) })),
    }),
    renderGroup({
      title: 'covers', current: s.covers, pick: (v) => h.change('covers', v),
      choices: (['none', 'leaves', 'stones', 'both'] as const).map((v) => ({ value: v, label: t(`covers_${v}`) })),
    }),
    renderGroup({
      title: 'size', current: s.size, pick: (v) => h.change('size', v),
      choices: (['small', 'medium', 'large'] as const).map((v) => ({ value: v, label: t(`size_${v}`) })),
    }),
    renderGroup({
      title: 'ground', current: s.ground, pick: (v) => h.change('ground', v),
      choices: (['stone', 'sand', 'night'] as const).map((v) => ({ value: v, label: t(`ground_${v}`) })),
    }),
    renderGroup({ title: 'sound', current: s.sound, choices: onOff, pick: (v) => h.change('sound', v) }),
  ];
  if (h.micSupported) {
    groups.push(renderGroup({ title: 'mic', current: s.mic, choices: onOff, help: 'micHelp', pick: (v) => h.change('mic', v) }));
  }
  container.replaceChildren(...groups);
}
