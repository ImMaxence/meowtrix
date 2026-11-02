// The languages Meowtrix speaks, shared by the app (menu, translations) and the build (one set of
// pages per language, see seo/). French lives at /, every other language under /<code>/.

export const LANGS = [
  { code: 'fr', name: 'Français', locale: 'fr_FR' },
  { code: 'en', name: 'English', locale: 'en_GB' },
  { code: 'es', name: 'Español', locale: 'es_ES' },
  { code: 'pt-BR', name: 'Português (Brasil)', locale: 'pt_BR' },
  { code: 'pt-PT', name: 'Português (Portugal)', locale: 'pt_PT' },
  { code: 'de', name: 'Deutsch', locale: 'de_DE' },
  { code: 'it', name: 'Italiano', locale: 'it_IT' },
  { code: 'nl', name: 'Nederlands', locale: 'nl_NL' },
  { code: 'sv', name: 'Svenska', locale: 'sv_SE' },
  { code: 'da', name: 'Dansk', locale: 'da_DK' },
  { code: 'nb', name: 'Norsk', locale: 'nb_NO' },
  { code: 'fi', name: 'Suomi', locale: 'fi_FI' },
  { code: 'et', name: 'Eesti', locale: 'et_EE' },
  { code: 'lv', name: 'Latviešu', locale: 'lv_LV' },
  { code: 'lt', name: 'Lietuvių', locale: 'lt_LT' },
  { code: 'pl', name: 'Polski', locale: 'pl_PL' },
  { code: 'cs', name: 'Čeština', locale: 'cs_CZ' },
  { code: 'sk', name: 'Slovenčina', locale: 'sk_SK' },
  { code: 'hu', name: 'Magyar', locale: 'hu_HU' },
  { code: 'ro', name: 'Română', locale: 'ro_RO' },
  { code: 'bg', name: 'Български', locale: 'bg_BG' },
  { code: 'el', name: 'Ελληνικά', locale: 'el_GR' },
  { code: 'hr', name: 'Hrvatski', locale: 'hr_HR' },
  { code: 'sr', name: 'Српски', locale: 'sr_RS' },
  { code: 'sl', name: 'Slovenščina', locale: 'sl_SI' },
  { code: 'uk', name: 'Українська', locale: 'uk_UA' },
  { code: 'ru', name: 'Русский', locale: 'ru_RU' },
  { code: 'tr', name: 'Türkçe', locale: 'tr_TR' },
  { code: 'ar', name: 'العربية', locale: 'ar_AR', rtl: true },
  { code: 'he', name: 'עברית', locale: 'he_IL', rtl: true },
  { code: 'fa', name: 'فارسی', locale: 'fa_IR', rtl: true },
  { code: 'ja', name: '日本語', locale: 'ja_JP' },
  { code: 'ko', name: '한국어', locale: 'ko_KR' },
  { code: 'zh-CN', name: '简体中文', locale: 'zh_CN' },
  { code: 'zh-TW', name: '繁體中文', locale: 'zh_TW' },
  { code: 'hi', name: 'हिन्दी', locale: 'hi_IN' },
  { code: 'bn', name: 'বাংলা', locale: 'bn_IN' },
  { code: 'ur', name: 'اردو', locale: 'ur_PK', rtl: true },
  { code: 'id', name: 'Bahasa Indonesia', locale: 'id_ID' },
  { code: 'ms', name: 'Bahasa Melayu', locale: 'ms_MY' },
  { code: 'th', name: 'ไทย', locale: 'th_TH' },
  { code: 'vi', name: 'Tiếng Việt', locale: 'vi_VN' },
  // Search engines expect two-letter codes in hreflang: Filipino goes by Tagalog's.
  { code: 'fil', name: 'Filipino', locale: 'tl_PH', hreflang: 'tl' },
  { code: 'sw', name: 'Kiswahili', locale: 'sw_KE' },
] as const;

export type Lang = (typeof LANGS)[number]['code'];
export type LangInfo = { code: Lang; name: string; locale: string; rtl?: boolean; hreflang?: string };

export const LANG_CODES: readonly Lang[] = LANGS.map((l) => l.code);

export const langInfo = (lang: Lang): LangInfo => LANGS.find((l) => l.code === lang)!;

/** Where a language's home page lives: / for French, /de/, /pt-br/… for the others. */
export const langHome = (lang: Lang): string => (lang === 'fr' ? '/' : `/${lang.toLowerCase()}/`);

/** The closest language to a browser's ("de-AT" → de, "pt" → pt-BR, "zh-HK" → zh-TW…), or null. */
export function matchLang(tag: string): Lang | null {
  const t = tag.toLowerCase();
  const exact = LANG_CODES.find((l) => l.toLowerCase() === t);
  if (exact) return exact;
  const [base, ...rest] = t.split('-');
  if (base === 'pt') return rest.some((r) => ['pt', 'ao', 'mz', 'cv', 'gw', 'st', 'tl'].includes(r)) ? 'pt-PT' : 'pt-BR';
  if (base === 'zh') return rest.some((r) => ['tw', 'hk', 'mo', 'hant'].includes(r)) ? 'zh-TW' : 'zh-CN';
  if (base === 'no' || base === 'nn') return 'nb';
  if (base === 'tl') return 'fil';
  // Serbian, Croatian and Bosnian understand each other; Bosnian is written in Latin script like Croatian.
  if (base === 'bs') return 'hr';
  return LANG_CODES.find((l) => l === base) ?? null;
}
