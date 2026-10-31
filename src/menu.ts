import { SKIN_IDS, SKINS, swatchCss } from './game/lizard/skin';
import { t, type Key, type Lang } from './i18n';
import { MAX_COUNT, type AnimalKey, type Settings } from './settings';

export type Tab = 'animals' | 'scene' | 'game';

const TABS: readonly { id: Tab; icon: string; label: Key }[] = [
  { id: 'animals', icon: '🐾', label: 'tab_animals' },
  { id: 'scene', icon: '🍂', label: 'tab_scene' },
  { id: 'game', icon: '⚙️', label: 'tab_game' },
];

const SPECIES: readonly { key: AnimalKey; icon: string; desc: Key }[] = [
  { key: 'lizards', icon: '🦎', desc: 'lizards_desc' },
  { key: 'mice', icon: '🐭', desc: 'mice_desc' },
  { key: 'flies', icon: '🪰', desc: 'flies_desc' },
];

/** Previews of the ground themes, for the scenery cards. */
const GROUND_PREVIEW = {
  stone: 'radial-gradient(circle at 30% 35%, #6d675f 0 3px, transparent 4px), radial-gradient(circle at 70% 65%, #615b54 0 4px, transparent 5px), linear-gradient(135deg, #4a4642, #3b3835)',
  sand: 'repeating-linear-gradient(170deg, #d3bb8f 0 6px, #c4a878 6px 10px)',
  night: 'radial-gradient(circle at 60% 40%, #232a33 0 4px, transparent 5px), linear-gradient(135deg, #1a1f26, #0e1115)',
} as const;

const TAB_KEY = 'meowtrix.tab';

export interface MenuHandlers {
  change: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  micSupported: boolean;
}

interface Elements {
  root: HTMLElement;
  tabs: HTMLElement;
  panel: HTMLElement;
  lang: HTMLElement;
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

function button(className: string, focus: string, onClick: () => void, text = ''): HTMLButtonElement {
  const b = h('button', className, text);
  b.type = 'button';
  b.dataset.focus = focus;
  b.addEventListener('click', onClick);
  return b;
}

/** The options panel: language toggle, tabs and the active tab's controls. */
export class Menu {
  private tab: Tab = 'animals';

  constructor(private readonly els: Elements, private readonly s: Settings, private readonly h: MenuHandlers) {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (TABS.some((x) => x.id === saved)) this.tab = saved as Tab;
    } catch {
      // Storage blocked: start on the first tab.
    }
  }

  render(): void {
    // Rebuilding the DOM would lose keyboard focus (TV remotes): restore it afterwards.
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.focus;
    this.renderLang();
    this.renderTabs();
    this.els.panel.replaceChildren(...this.content());
    if (focused) this.els.root.querySelector<HTMLElement>(`[data-focus="${focused}"]`)?.focus();
  }

  private select(tab: Tab): void {
    this.tab = tab;
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      // Not remembered; fine.
    }
    this.render();
    this.els.panel.scrollTop = 0;
  }

  private renderLang(): void {
    const group = this.els.lang;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', t('language'));
    group.replaceChildren(
      ...(['fr', 'en'] as Lang[]).map((l) => {
        const b = button('lang-btn', `lang-${l}`, () => this.h.change('lang', l), l.toUpperCase());
        b.setAttribute('aria-pressed', String(this.s.lang === l));
        b.lang = l;
        b.title = l === 'fr' ? 'Français' : 'English';
        return b;
      }),
    );
  }

  private renderTabs(): void {
    this.els.tabs.setAttribute('role', 'tablist');
    this.els.tabs.replaceChildren(
      ...TABS.map((tab) => {
        const b = button('tab', `tab-${tab.id}`, () => this.select(tab.id));
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(this.tab === tab.id));
        b.append(h('span', 'tab-icon', tab.icon), h('span', 'tab-label', t(tab.label)));
        return b;
      }),
    );
  }

  private content(): HTMLElement[] {
    switch (this.tab) {
      case 'animals': return this.animals();
      case 'scene': return this.scene();
      case 'game': return this.game();
    }
  }

  private animals(): HTMLElement[] {
    const s = this.s;
    const total = s.lizards + s.mice + s.flies;
    return SPECIES.map(({ key, icon, desc }) => {
      const n = s[key];
      const card = h('div', `species${n ? '' : ' is-off'}`);
      const row = h('div', 'species-row');
      const info = h('div', 'species-info');
      info.append(h('div', 'species-name', t(key)), h('div', 'species-desc', t(desc)));

      const stepper = h('div', 'stepper');
      stepper.setAttribute('role', 'group');
      stepper.setAttribute('aria-label', t(key));
      const minus = button('step', `${key}-minus`, () => this.h.change(key, n - 1), '−');
      minus.setAttribute('aria-label', `${t('less')} – ${t(key)}`);
      // Keep at least one animal on screen.
      minus.disabled = n === 0 || total === 1;
      const plus = button('step', `${key}-plus`, () => this.h.change(key, n + 1), '+');
      plus.setAttribute('aria-label', `${t('more')} – ${t(key)}`);
      plus.disabled = n >= MAX_COUNT[key];
      const value = h('output', 'step-value', String(n));
      value.setAttribute('aria-live', 'polite');
      stepper.append(minus, value, plus);

      row.append(h('div', 'species-icon', icon), info, stepper);
      card.append(row);
      if (key === 'lizards' && n > 0) card.append(this.skins());
      return card;
    });
  }

  private skins(): HTMLElement {
    const wrap = h('div', 'skins');
    const head = h('div', 'skins-head');
    head.append(h('span', '', t('skin')), h('span', 'skins-name', t(`skin_${this.s.skin}`)));
    const row = h('div', 'swatches');
    for (const id of SKIN_IDS) {
      const b = button('swatch', `skin-${id}`, () => this.h.change('skin', id));
      b.style.setProperty('--sw', swatchCss(SKINS[id]));
      b.setAttribute('aria-pressed', String(this.s.skin === id));
      b.setAttribute('aria-label', t(`skin_${id}`));
      b.title = t(`skin_${id}`);
      row.append(b);
    }
    wrap.append(head, row);
    return wrap;
  }

  private scene(): HTMLElement[] {
    const s = this.s;
    const grounds = h('div', 'cards');
    for (const g of ['stone', 'sand', 'night'] as const) {
      const b = button('card', `ground-${g}`, () => this.h.change('ground', g));
      b.setAttribute('aria-pressed', String(s.ground === g));
      const preview = h('span', 'card-preview');
      preview.style.background = GROUND_PREVIEW[g];
      b.append(preview, h('span', 'card-label', t(`ground_${g}`)));
      grounds.append(b);
    }
    return [
      this.section('ground', grounds),
      this.section('covers', this.chips('covers', ['none', 'leaves', 'stones', 'both'] as const, (v) => t(`covers_${v}`))),
      this.section('size', this.chips('size', ['small', 'medium', 'large'] as const, (v) => t(`size_${v}`))),
    ];
  }

  private game(): HTMLElement[] {
    const items = [
      this.section('speed', this.chips('speed', ['slow', 'normal', 'fast'] as const, (v) => t(`speed_${v}`))),
      this.toggle('sound', 'soundHelp'),
    ];
    if (this.h.micSupported) items.push(this.toggle('mic', 'micHelp'));
    return items;
  }

  private section(title: Key, body: HTMLElement): HTMLElement {
    const sec = h('section', 'opt');
    const label = h('h2', 'opt-label', t(title));
    sec.append(label, body);
    return sec;
  }

  private chips<K extends 'covers' | 'size' | 'speed'>(
    key: K, values: readonly Settings[K][], label: (v: Settings[K]) => string,
  ): HTMLElement {
    const row = h('div', 'chips');
    row.setAttribute('role', 'group');
    for (const v of values) {
      const b = button('chip', `${key}-${v}`, () => this.h.change(key, v), label(v));
      b.setAttribute('aria-pressed', String(this.s[key] === v));
      row.append(b);
    }
    return row;
  }

  private toggle(key: 'sound' | 'mic', help: Key): HTMLElement {
    const on = this.s[key];
    const b = button('switch-row', `switch-${key}`, () => this.h.change(key, !on));
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(on));
    const text = h('span', 'switch-text');
    text.append(h('span', 'switch-label', t(key)), h('span', 'switch-help', t(help)));
    const sw = h('span', 'switch');
    sw.setAttribute('aria-hidden', 'true');
    sw.append(h('span', 'knob'));
    b.append(text, sw);
    return b;
  }
}
