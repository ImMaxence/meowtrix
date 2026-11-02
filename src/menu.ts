import { COVERS, FETE_ICON, FETES, GROUNDS, SPECIES, THEMES, type Fete, type SpeciesInfo, type Theme } from './catalog';
import { groundPreview } from './game/ground';
import { t, type Key } from './i18n';
import { LangPicker } from './lang-picker';
import { CAT_NAME_MAX, SESSION_LENGTHS, STYLES, themeTotal, type Settings } from './settings';

export type Tab = 'animals' | 'scene' | 'game' | 'about';

const TABS: readonly { id: Tab; icon: string; label: Key }[] = [
  { id: 'animals', icon: '🐾', label: 'tab_animals' },
  { id: 'scene', icon: '🍂', label: 'tab_scene' },
  { id: 'game', icon: '⚙️', label: 'tab_game' },
  { id: 'about', icon: 'ℹ️', label: 'tab_about' },
];

const THEME_ICON: Record<Theme, string> = { land: '🌍', water: '🌊', sky: '🦋' };

const TAB_KEY = 'meowtrix.tab';

/** For keys built from data (species, variants, grounds): they all exist in the dictionaries. */
const tk = (key: string): string => t(key as Key);

export interface MenuHandlers {
  change: <K extends keyof Settings>(key: K, value: Settings[K], rerender?: boolean) => void;
  micSupported: boolean;
  vibrationSupported: boolean;
  /** Plays a short sound at the chosen volume. */
  previewVolume: () => void;
  /** Everything back to the defaults (a green lizard on stone). */
  reset: () => void;
  /** The fête on screen: the chosen one, or the one in season for 'auto'. */
  activeFete: () => Fete;
}

interface Elements {
  root: HTMLElement;
  themes: HTMLElement;
  fetes: HTMLElement;
  tabs: HTMLElement;
  panel: HTMLElement;
  /** The page's own text (what it is, how to play, questions), written in the HTML. */
  about: HTMLElement;
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

/** The options panel: language list, land/water switch, tabs and the active tab's controls. */
export class Menu {
  private tab: Tab = 'animals';
  /** The reset button asks for a second tap before wiping everything. */
  private confirmReset = false;
  private confirmTimer = 0;
  private langPicker: LangPicker | null = null;

  constructor(private readonly els: Elements, private readonly s: Settings, private readonly h: MenuHandlers) {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (TABS.some((x) => x.id === saved)) this.tab = saved as Tab;
    } catch {
      // Storage blocked: start on the first tab.
    }
    // A turned phone or a resized window may make the labels fit, or not.
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.fit()).observe(els.root);
  }

  render(): void {
    // Rebuilding the DOM would lose keyboard focus (TV remotes): restore it afterwards.
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.focus;
    this.renderLang();
    this.renderThemes();
    this.renderFetes();
    this.renderTabs();
    const about = this.tab === 'about';
    this.els.about.hidden = !about;
    this.els.panel.hidden = about;
    if (!about) this.els.panel.replaceChildren(...this.content());
    this.fit();
    if (focused) this.els.root.querySelector<HTMLElement>(`[data-focus="${focused}"]`)?.focus();
  }

  /**
   * Some languages' labels are too long for their row: the row gets tighter, one step at a time,
   * until it fits (see .tight and .tighter in the CSS).
   */
  private fit(): void {
    for (const row of [this.els.themes, this.els.fetes, this.els.tabs]) {
      row.classList.remove('tight', 'tighter');
      for (const step of ['tight', 'tighter']) {
        if (row.scrollWidth <= row.clientWidth) break;
        row.classList.add(step);
      }
    }
  }

  private select(tab: Tab): void {
    this.tab = tab;
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      // Not remembered; fine.
    }
    this.render();
    this.els.panel.scrollTop = this.els.about.scrollTop = 0;
  }

  /** The language menu, built once so that it stays open while the rest is redrawn. */
  private renderLang(): void {
    if (!this.langPicker) {
      this.langPicker = new LangPicker((lang) => this.h.change('lang', lang));
      this.els.lang.replaceChildren(this.langPicker.root);
    }
    this.langPicker.update(this.s.lang);
  }

  private renderThemes(): void {
    const group = this.els.themes;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', t('theme'));
    group.replaceChildren(
      ...THEMES.map((theme) => {
        const b = button(`theme theme-${theme}`, `theme-${theme}`, () => {
          if (this.s.theme === theme) return;
          this.h.change('theme', theme);
          this.els.panel.scrollTop = 0;
        });
        b.setAttribute('aria-pressed', String(this.s.theme === theme));
        b.append(h('span', 'theme-icon', THEME_ICON[theme]), h('span', 'theme-label', tk(`theme_${theme}`)));
        return b;
      }),
    );
  }

  /**
   * Auto follows the calendar; Christmas, Halloween, Easter: tap one to dress everything up, tap it
   * again to go back. With Auto, the fête in season is shown on, with a dashed outline.
   */
  private renderFetes(): void {
    const group = this.els.fetes;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', t('fete'));
    const choice = this.s.fete, active = this.h.activeFete();
    const auto = button('fete fete-auto', 'fete-auto', () => this.h.change('fete', choice === 'auto' ? 'none' : 'auto'));
    auto.setAttribute('aria-pressed', String(choice === 'auto'));
    auto.title = t('fete_autoHelp');
    auto.append(h('span', 'fete-icon', '📅'), h('span', 'fete-label', t('fete_auto')));
    group.replaceChildren(
      auto,
      ...FETES.filter((f) => f !== 'none').map((fete) => {
        const on = active === fete;
        const b = button(`fete fete-${fete}${on && choice === 'auto' ? ' is-auto' : ''}`, `fete-${fete}`, () => this.h.change('fete', on ? 'none' : fete));
        b.setAttribute('aria-pressed', String(on));
        // The label is hidden on narrow screens.
        b.setAttribute('aria-label', tk(`fete_${fete}`));
        b.title = tk(`fete_${fete}`);
        b.append(h('span', 'fete-icon', FETE_ICON[fete]), h('span', 'fete-label', tk(`fete_${fete}`)));
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
      case 'about': return [];
    }
  }

  private animals(): HTMLElement[] {
    const list = SPECIES[this.s.theme];
    const grouped = new Set(list.map((sp) => sp.group)).size > 1;
    const items: HTMLElement[] = [];
    list.forEach((sp, i) => {
      if (grouped && sp.group !== list[i - 1]?.group) items.push(h('h2', 'group-label', tk(`group_${sp.group}`)));
      items.push(this.species(sp));
    });
    return items;
  }

  private species(sp: SpeciesInfo): HTMLElement {
    const s = this.s, key = sp.key;
    const n = s.animals[key];
    const setCount = (value: number) => this.h.change('animals', { ...s.animals, [key]: value });
    const card = h('div', `species${n ? '' : ' is-off'}`);
    const row = h('div', 'species-row');
    const info = h('div', 'species-info');
    info.append(h('div', 'species-name', tk(key)), h('div', 'species-desc', tk(`${key}_desc`)));

    const stepper = h('div', 'stepper');
    stepper.setAttribute('role', 'group');
    stepper.setAttribute('aria-label', tk(key));
    const minus = button('step', `${key}-minus`, () => setCount(n - 1), '−');
    minus.setAttribute('aria-label', `${t('less')} – ${tk(key)}`);
    // Keep at least one animal on screen.
    minus.disabled = n === 0 || themeTotal(s, s.theme) === 1;
    const plus = button('step', `${key}-plus`, () => setCount(n + 1), '+');
    plus.setAttribute('aria-label', `${t('more')} – ${tk(key)}`);
    plus.disabled = n >= sp.max;
    const value = h('output', 'step-value', String(n));
    value.setAttribute('aria-live', 'polite');
    stepper.append(minus, value, plus);

    row.append(h('div', 'species-icon', sp.icon), info, stepper);
    card.append(row);
    if (n > 0 && sp.variants.length > 1) card.append(this.colors(sp));
    return card;
  }

  private colors(sp: SpeciesInfo): HTMLElement {
    const key = sp.key, current = this.s.colors[key];
    const wrap = h('div', 'skins');
    const head = h('div', 'skins-head');
    head.append(h('span', '', t('skin')), h('span', 'skins-name', tk(`${key}_${current}`)));
    const row = h('div', 'swatches');
    for (const v of sp.variants) {
      const b = button('swatch', `${key}-color-${v.id}`, () => this.h.change('colors', { ...this.s.colors, [key]: v.id }));
      b.style.setProperty('--sw', v.swatch);
      b.setAttribute('aria-pressed', String(current === v.id));
      b.setAttribute('aria-label', tk(`${key}_${v.id}`));
      b.title = tk(`${key}_${v.id}`);
      row.append(b);
    }
    wrap.append(head, row);
    return wrap;
  }

  private scene(): HTMLElement[] {
    const s = this.s, theme = s.theme;
    const grounds = h('div', 'cards');
    for (const g of GROUNDS[theme]) {
      const b = button('card', `ground-${g}`, () => this.h.change('ground', { ...s.ground, [theme]: g }));
      b.setAttribute('aria-pressed', String(s.ground[theme] === g));
      const preview = h('span', 'card-preview');
      preview.style.backgroundImage = `url(${groundPreview(g)})`;
      b.append(preview, h('span', 'card-label', tk(`ground_${g}`)));
      grounds.append(b);
    }

    const covers = h('div', 'chips');
    covers.setAttribute('role', 'group');
    const chosen = s.covers[theme];
    for (const { kind, icon } of COVERS[theme]) {
      const on = chosen.includes(kind);
      const toggle = () => {
        const kinds = COVERS[theme].map((c) => c.kind).filter((k) => (k === kind ? !on : chosen.includes(k)));
        this.h.change('covers', { ...s.covers, [theme]: kinds });
      };
      const b = button('chip', `covers-${kind}`, toggle);
      b.setAttribute('aria-pressed', String(on));
      b.append(h('span', 'chip-icon', icon), h('span', '', tk(`covers_${kind}`)));
      covers.append(b);
    }
    const coversSection = this.section('covers', covers);
    coversSection.append(h('p', 'opt-help', t('coversHelp')));

    return [
      this.section('ground', grounds),
      coversSection,
      this.section('size', this.chips('size', ['small', 'medium', 'large'] as const, (v) => tk(`size_${v}`))),
      this.section('style', this.chips('style', STYLES, (v) => tk(`style_${v}`)), 'styleHelp'),
    ];
  }

  private game(): HTMLElement[] {
    const items = [
      this.section('session', this.chips('session', SESSION_LENGTHS, (v) => tk(`session_${v}`)), 'sessionHelp'),
      this.catName(),
      this.section('speed', this.chips('speed', ['slow', 'normal', 'fast'] as const, (v) => tk(`speed_${v}`))),
      this.volume(),
    ];
    if (this.h.micSupported) items.push(this.toggle('mic', 'micHelp'));
    if (this.h.vibrationSupported) items.push(this.toggle('vibration', 'vibrationHelp'));
    items.push(this.resetButton());
    return items;
  }

  private resetButton(): HTMLElement {
    const b = button(`reset${this.confirmReset ? ' is-armed' : ''}`, 'reset', () => {
      clearTimeout(this.confirmTimer);
      if (this.confirmReset) {
        this.confirmReset = false;
        this.h.reset();
        return;
      }
      this.confirmReset = true;
      this.render();
      this.confirmTimer = window.setTimeout(() => {
        this.confirmReset = false;
        this.render();
      }, 4000);
    }, t(this.confirmReset ? 'resetConfirm' : 'reset'));
    const wrap = h('div', 'reset-wrap');
    wrap.append(b, h('p', 'opt-help', t('resetHelp')));
    return wrap;
  }

  private section(title: Key, body: HTMLElement, help?: Key): HTMLElement {
    const sec = h('section', 'opt');
    const label = h('h2', 'opt-label', t(title));
    sec.append(label, body);
    if (help) sec.append(h('p', 'opt-help', t(help)));
    return sec;
  }

  /** Saved on each key without rebuilding the menu, which would close the on-screen keyboard. */
  private catName(): HTMLElement {
    const sec = h('section', 'opt');
    const label = h('label', 'opt-label', t('catName'));
    label.htmlFor = 'cat-name';
    const input = h('input', 'text-input');
    input.id = 'cat-name';
    input.type = 'text';
    input.maxLength = CAT_NAME_MAX;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.enterKeyHint = 'done';
    input.placeholder = t('catNamePlaceholder');
    input.value = this.s.catName;
    input.dataset.focus = 'cat-name';
    input.addEventListener('input', () => this.h.change('catName', input.value, false));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    sec.append(label, input, h('p', 'opt-help', t('catNameHelp')));
    return sec;
  }

  private chips<K extends 'size' | 'speed' | 'style' | 'session'>(key: K, values: readonly Settings[K][], label: (v: Settings[K]) => string): HTMLElement {
    const row = h('div', 'chips');
    row.setAttribute('role', 'group');
    for (const v of values) {
      const b = button('chip', `${key}-${v}`, () => this.h.change(key, v), label(v));
      b.setAttribute('aria-pressed', String(this.s[key] === v));
      row.append(b);
    }
    return row;
  }

  private volume(): HTMLElement {
    const sec = h('section', 'opt');
    const head = h('div', 'volume-head');
    const value = h('output', 'volume-value');
    head.append(h('h2', 'opt-label', t('sound')), value);
    const slider = h('input', 'volume');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = '5';
    slider.dataset.focus = 'volume';
    slider.setAttribute('aria-label', t('sound'));
    const show = (v: number) => {
      slider.value = String(Math.round(v * 100));
      slider.style.setProperty('--fill', `${v * 100}%`);
      value.textContent = v ? `${Math.round(v * 100)} %` : t('soundOff');
      slider.setAttribute('aria-valuetext', value.textContent);
    };
    show(this.s.volume);
    slider.addEventListener('input', () => {
      const v = Number(slider.value) / 100;
      show(v);
      this.h.change('volume', v, false);
    });
    slider.addEventListener('change', () => this.h.previewVolume());
    const row = h('div', 'volume-row');
    row.append(h('span', 'volume-icon', '🔈'), slider, h('span', 'volume-icon', '🔊'));
    sec.append(head, row, h('p', 'opt-help', t('soundHelp')));
    return sec;
  }

  private toggle(key: 'mic' | 'vibration', help: Key): HTMLElement {
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
