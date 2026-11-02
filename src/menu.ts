import { COVERS, FETE_ICON, FETES, GROUNDS, SPECIES, THEMES, type Fete, type FeteChoice, type SpeciesInfo, type Theme } from './catalog';
import { groundPreview } from './game/ground';
import { currentLang, plural, t, type Key } from './i18n';
import { LangPicker } from './lang-picker';
import type { Stats } from './session';
import { CAT_NAME_MAX, REST_HOURS, SESSION_LENGTHS, SPEEDS, STYLES, themeTotal, type Settings } from './settings';
import { dayKey } from './session';

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
  /** A random scene: theme, animals, colours, ground and hiding spots. */
  surprise: () => void;
  /** The fête on screen: the chosen one, or the one in season for 'auto'. */
  activeFete: () => Fete;
  /** Catches kept on this device. */
  stats: () => Stats;
}

interface Elements {
  root: HTMLElement;
  themes: HTMLElement;
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
    this.renderTabs();
    const about = this.tab === 'about';
    this.els.about.classList.toggle('open', about);
    this.els.panel.hidden = about;
    if (!about) this.els.panel.replaceChildren(...this.content());
    // Measured in the next frame, once the browser has laid the rows out anyway.
    requestAnimationFrame(() => this.fit());
    if (focused) this.els.root.querySelector<HTMLElement>(`[data-focus="${focused}"]`)?.focus();
  }

  /**
   * Some languages' labels are too long for their row: the row gets tighter, one step at a time,
   * until it fits (see .tight and .tighter in the CSS).
   */
  private fit(): void {
    for (const row of [this.els.themes, this.els.tabs]) {
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
    this.toTop();
  }

  /**
   * Back to the top of the tab's content. On phones the whole panel scrolls (see the CSS): there,
   * only as far up as the tabs, so that the header stays out of the way.
   */
  private toTop(): void {
    this.els.panel.scrollTop = this.els.about.scrollTop = 0;
    const outer = this.els.tabs.parentElement!, themes = this.els.themes;
    outer.scrollTop = Math.min(outer.scrollTop, themes.offsetTop + themes.offsetHeight);
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
          this.toTop();
        });
        b.setAttribute('aria-pressed', String(this.s.theme === theme));
        b.append(h('span', 'theme-icon', THEME_ICON[theme]), h('span', 'theme-label', tk(`theme_${theme}`)));
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

  /**
   * The animals on screen first, as full cards; the others as a compact grid to add one with a
   * tap, so the tab is as long as what was chosen, not as the whole catalogue.
   */
  private animals(): HTMLElement[] {
    const list = SPECIES[this.s.theme];
    const surprise = button('surprise', 'surprise', () => this.h.surprise());
    surprise.append(h('span', 'surprise-icon', '🎲'), h('span', '', t('surprise')));
    const items: HTMLElement[] = [surprise];
    items.push(...list.filter((sp) => this.s.animals[sp.key] > 0).map((sp) => this.species(sp)));
    const others = list.filter((sp) => this.s.animals[sp.key] === 0);
    if (others.length) {
      items.push(h('h2', 'group-label', t('addAnimal')));
      const grid = h('div', 'add-grid');
      for (const sp of others) {
        const b = button('add-chip', `${sp.key}-add`, () => this.h.change('animals', { ...this.s.animals, [sp.key]: 1 }));
        b.append(h('span', 'add-icon', sp.icon), h('span', 'add-name', tk(sp.key)));
        b.title = tk(`${sp.key}_desc`);
        grid.append(b);
      }
      items.push(grid);
    }
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
      this.fetes(),
      this.section('size', this.chips('size', ['small', 'medium', 'large'] as const, (v) => tk(`size_${v}`))),
      this.section('style', this.chips('style', STYLES, (v) => tk(`style_${v}`)), 'styleHelp'),
    ];
  }

  /**
   * Auto follows the calendar; None keeps every day plain; Christmas, Halloween, Easter dress
   * everything up all year round. With Auto, the fête in season is also shown on, with a dashed
   * outline.
   */
  private fetes(): HTMLElement {
    const choice = this.s.fete, active = this.h.activeFete();
    const row = h('div', 'chips');
    row.setAttribute('role', 'group');
    const chip = (id: FeteChoice, icon: string, label: string, help: string) => {
      const inSeason = choice === 'auto' && active === id;
      const b = button(`chip fete-${id}${inSeason ? ' is-auto' : ''}`, `fete-${id}`, () => this.h.change('fete', id));
      b.setAttribute('aria-pressed', String(choice === id || inSeason));
      b.title = help;
      if (icon) b.append(h('span', 'chip-icon', icon));
      b.append(h('span', '', label));
      row.append(b);
    };
    chip('auto', '📅', t('fete_auto'), t('fete_autoHelp'));
    chip('none', '', t('fete_none'), t('fete_noneHelp'));
    for (const fete of FETES) if (fete !== 'none') chip(fete, FETE_ICON[fete], tk(`fete_${fete}`), tk(`fete_${fete}`));
    return this.section('fete', row);
  }

  private game(): HTMLElement[] {
    const items: HTMLElement[] = [];
    if (this.h.stats().total) items.push(this.stats());
    items.push(this.section('session', this.chips('session', SESSION_LENGTHS, (v) => tk(`session_${v}`)), 'sessionHelp'));
    // The name goes on the session's score and summary; the rest mode needs a session that ends.
    if (this.s.session) {
      items.push(this.catName());
      items.push(this.section('rest', this.chips('rest', REST_HOURS, (v) => (v ? `${v} h` : t('rest_off'))), 'restHelp'));
    }
    items.push(
      this.section('speed', this.chips('speed', SPEEDS, (v) => tk(`speed_${v}`)), 'speed_autoHelp'),
      this.volume(),
      this.toggle('hud', 'hudHelp'),
    );
    if (this.h.micSupported) items.push(this.toggle('mic', 'micHelp'));
    if (this.h.vibrationSupported) items.push(this.toggle('vibration', 'vibrationHelp'));
    items.push(this.resetButton());
    return items;
  }

  /** Catches in all, the best session, the favourite prey, and the last seven days as bars. */
  private stats(): HTMLElement {
    const st = this.h.stats();
    const sec = h('section', 'opt');
    sec.append(h('h2', 'opt-label', t('stats')));
    const tiles = h('div', 'stat-tiles');
    const tile = (value: string, label: string) => {
      const d = h('div', 'stat');
      d.append(h('strong', '', value), h('span', '', label));
      tiles.append(d);
    };
    tile(plural(st.total, 'catch_one', 'catch_many'), tk('inTotal').replace('{n}', '').trim() || t('stats'));
    tile(plural(st.best, 'catch_one', 'catch_many'), t('bestSession'));
    const favourite = Object.entries(st.prey).sort((a, b) => b[1] - a[1])[0];
    if (favourite) {
      const sp = [...SPECIES.land, ...SPECIES.water, ...SPECIES.sky].find((x) => x.key === favourite[0]);
      if (sp) tile(`${sp.icon} ${tk(sp.key)}`, t('favoritePrey'));
    }
    sec.append(tiles);

    const bars = h('div', 'bars');
    bars.setAttribute('role', 'img');
    bars.setAttribute('aria-label', t('last7days'));
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const most = Math.max(1, ...days.map((d) => st.days[dayKey(d)] ?? 0));
    const initial = new Intl.DateTimeFormat(currentLang(), { weekday: 'narrow' });
    for (const d of days) {
      const n = st.days[dayKey(d)] ?? 0;
      const col = h('div', 'bar-col');
      const bar = h('div', `bar${n ? '' : ' is-empty'}`);
      bar.style.setProperty('--h', `${Math.max(n ? 8 : 3, (n / most) * 100)}%`);
      bar.title = `${n}`;
      col.append(h('span', 'bar-n', n ? String(n) : ''), bar, h('span', 'bar-day', initial.format(d)));
      bars.append(col);
    }
    sec.append(h('p', 'opt-help', t('last7days')), bars);
    return sec;
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

  private chips<K extends 'size' | 'speed' | 'style' | 'session' | 'rest'>(key: K, values: readonly Settings[K][], label: (v: Settings[K]) => string): HTMLElement {
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

  private toggle(key: 'mic' | 'vibration' | 'hud', help: Key): HTMLElement {
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
