import { currentLang, t } from './i18n';
import { LANGS, type Lang } from './langs';

/** Lowercase and without accents, so "espanol" finds "Español". */
const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Language names written in `lang` ("allemand" for de in French); nothing where the browser can't. */
function namesIn(lang: string): (code: Lang) => string {
  try {
    const names = new Intl.DisplayNames([lang], { type: 'language' });
    return (code) => names.of(code) ?? '';
  } catch {
    return () => '';
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** A line icon (globe, chevron, magnifier), drawn in the text colour. */
function icon(className: string, d: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `lang-icon ${className}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

const GLOBE = 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3.5 9h17M3.5 15h17M12 3c-2.4 2.6-3.6 5.6-3.6 9s1.2 6.4 3.6 9c2.4-2.6 3.6-5.6 3.6-9S14.4 5.6 12 3';
const CHEVRON = 'm6 9 6 6 6-6';
const SEARCH = 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13M15.5 15.5 20 20';

interface Option {
  lang: Lang;
  el: HTMLButtonElement;
  /** The language's name in the current language, under its own. */
  local: HTMLElement;
  /** Everything it can be found by, folded. */
  words: string;
}

/**
 * The language menu: a button with the current language, opening the list of all of them and a
 * field to filter it. A language is found by its own name, its name in the current language or in
 * English, or its code ("deutsch", "allemand", "german", "de"). Works with a mouse, touch, a
 * keyboard or a TV remote (arrows, OK, back).
 */
export class LangPicker {
  readonly root = el('div', 'lang-picker');
  private readonly button = el('button', 'lang-button');
  private readonly name = el('span', 'lang-name');
  private readonly popup = el('div', 'lang-popup');
  private readonly input = el('input', 'lang-input');
  private readonly list = el('div', 'lang-list');
  private readonly empty = el('p', 'lang-empty', '—');
  private readonly options: Option[];
  private readonly english = namesIn('en');
  private current: Lang = 'fr';

  constructor(private readonly choose: (lang: Lang) => void) {
    this.button.type = 'button';
    this.button.dataset.focus = 'lang';
    this.button.setAttribute('aria-haspopup', 'listbox');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'lang-list');
    this.button.append(icon('lang-globe', GLOBE), this.name, icon('lang-chevron', CHEVRON));
    this.button.addEventListener('click', () => (this.popup.hidden ? this.open() : this.close(true)));

    this.input.type = 'text';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('aria-controls', 'lang-list');
    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => this.inputKey(e));
    const search = el('div', 'lang-search');
    search.append(icon('lang-magnifier', SEARCH), this.input);

    this.list.id = 'lang-list';
    this.list.setAttribute('role', 'listbox');
    this.list.addEventListener('keydown', (e) => this.listKey(e));
    this.options = LANGS.map(({ code, name }) => {
      const b = el('button', 'lang-option');
      b.type = 'button';
      b.tabIndex = -1;
      b.setAttribute('role', 'option');
      const native = el('span', 'lang-native', name);
      native.lang = code;
      const local = el('span', 'lang-local');
      b.append(native, local);
      b.addEventListener('click', () => this.select(code));
      return { lang: code, el: b, local, words: '' };
    });
    this.list.append(...this.options.map((o) => o.el));

    // Focusable, so a tap on the popup's padding doesn't count as leaving it.
    this.popup.tabIndex = -1;
    this.popup.hidden = true;
    this.popup.append(search, this.list, this.empty);
    this.root.append(this.button, this.popup);

    this.root.addEventListener('focusout', (e) => {
      if (!this.root.contains(e.relatedTarget as Node | null)) this.close(false);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.popup.hidden && !this.root.contains(e.target as Node)) this.close(false);
    });
  }

  /** Shows `lang` as the current one, with the words of the language the menu is now in. */
  update(lang: Lang): void {
    this.current = lang;
    const own = LANGS.find((l) => l.code === lang)!.name;
    this.name.textContent = own;
    this.name.lang = lang;
    this.button.title = t('language');
    this.button.setAttribute('aria-label', `${t('language')}: ${own}`);
    this.input.placeholder = `${t('language')}…`;
    this.input.setAttribute('aria-label', t('language'));
    this.list.setAttribute('aria-label', t('language'));
    const local = namesIn(currentLang());
    for (const o of this.options) {
      const native = LANGS.find((l) => l.code === o.lang)!.name;
      const there = local(o.lang);
      // Even when it reads the same ("Filipino"), so that every line has one.
      o.local.textContent = there && there.charAt(0).toLocaleUpperCase() + there.slice(1);
      o.words = fold([native, o.lang, there, this.english(o.lang)].join(' '));
      o.el.setAttribute('aria-selected', String(o.lang === lang));
    }
    this.filter();
  }

  private open(): void {
    this.popup.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.input.value = '';
    this.filter();
    const selected = this.options.find((o) => o.lang === this.current)!.el;
    this.list.scrollTop = selected.offsetTop - (this.list.clientHeight - selected.offsetHeight) / 2;
    // With a mouse, type right away; on a touch screen or a TV, no keyboard popping up uninvited.
    if (matchMedia('(pointer: fine)').matches) this.input.focus({ preventScroll: true });
    else selected.focus({ preventScroll: true });
  }

  private close(refocus: boolean): void {
    if (this.popup.hidden) return;
    this.popup.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    if (refocus) this.button.focus();
  }

  private select(lang: Lang): void {
    this.close(true);
    if (lang !== this.current) this.choose(lang);
  }

  private filter(): void {
    const q = fold(this.input.value.trim());
    let shown = 0;
    for (const o of this.options) {
      o.el.hidden = !!q && !o.words.includes(q);
      if (!o.el.hidden) shown++;
    }
    this.empty.hidden = shown > 0;
  }

  private visible(): HTMLButtonElement[] {
    return this.options.filter((o) => !o.el.hidden).map((o) => o.el);
  }

  private inputKey(e: KeyboardEvent): void {
    const first = this.visible()[0];
    if (e.key === 'ArrowDown' && first) first.focus();
    else if (e.key === 'Enter' && first) first.click();
    else if (e.key === 'Escape') this.close(true);
    else return;
    e.preventDefault();
  }

  private listKey(e: KeyboardEvent): void {
    const items = this.visible();
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') items[Math.min(i + 1, items.length - 1)]?.focus();
    else if (e.key === 'ArrowUp') (i > 0 ? items[i - 1] : this.input).focus();
    else if (e.key === 'Home') items[0]?.focus();
    else if (e.key === 'End') items[items.length - 1]?.focus();
    // Some remotes send Enter without the click a keyboard would make.
    else if (e.key === 'Enter' && i >= 0) items[i].click();
    else if (e.key === 'Escape') this.close(true);
    // Typing while on the list goes to the filter.
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      this.input.focus();
      return;
    } else return;
    e.preventDefault();
  }
}
