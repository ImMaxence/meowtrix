// The site's pages for search engines and AI assistants: one per theme and fête, in every language
// of src/langs.ts. Each is the same app with its own title, description, picture, text and preset
// (see seo/plugin.ts, which writes them at build time). The words are in seo/locales/.

import { LANGS, langHome, type Lang } from '../src/langs.ts';
import { TEXTS } from './locales/index.ts';
import type { PageId, SeoText } from './text.ts';

export const SITE = 'https://meowtrix.mbonnici.fr';
export const REPO = 'https://github.com/ImMaxence/meowtrix';

export interface Page {
  path: string;
  lang: Lang;
  /** Which page it is; the same id in every language. */
  id: PageId;
  /** Short name for links between pages. */
  name: string;
  /** Settings the page applies (see src/preset.ts). */
  preset: string;
  title: string;
  description: string;
  /** Picture for link previews, 1200×630. */
  image: string;
  imageAlt: string;
  tagline: string;
  /** The page's own article for the menu's About tab (HTML). */
  body: string;
  faq?: SeoText['faq'];
  /** Everything else written in the page's language (headings, how to play…). */
  text: SeoText;
}

export const PAGE_IDS: readonly PageId[] = ['home', 'water', 'sky', 'christmas', 'halloween', 'easter'];

const IMAGE: Record<PageId, string> = {
  home: '/og/home.jpg', water: '/og/water.jpg', sky: '/og/sky.jpg',
  christmas: '/og/christmas.jpg', halloween: '/og/halloween.jpg', easter: '/og/easter.jpg',
};

const SCENE: Record<PageId, string> = {
  home: '', water: 'theme=water', sky: 'theme=sky', christmas: 'fete=christmas', halloween: 'fete=halloween', easter: 'fete=easter',
};

const SLUG: Record<PageId, string> = {
  home: '', water: 'water/', sky: 'sky/', christmas: 'christmas/', halloween: 'halloween/', easter: 'easter/',
};

const SLUG_FR: Record<PageId, string> = {
  home: '', water: 'eau/', sky: 'ciel/', christmas: 'noel/', halloween: 'halloween/', easter: 'paques/',
};

/** /eau/ in French, /en/water/, /de/water/… in the other languages. */
export const pagePath = (lang: Lang, id: PageId): string => langHome(lang) + (lang === 'fr' ? SLUG_FR : SLUG)[id];

/**
 * The other pages set their language; the French ones keep the visitor's, since / is also where the
 * installed app starts.
 */
const preset = (lang: Lang, id: PageId): string => [lang === 'fr' ? '' : `lang=${lang}`, SCENE[id]].filter(Boolean).join('&');

/** A body's {water}, {sky}… placeholders, as addresses in its language. */
const linked = (body: string, lang: Lang): string =>
  body.replace(/\{(\w+)\}/g, (m, id: string) => ((PAGE_IDS as readonly string[]).includes(id) ? pagePath(lang, id as PageId) : m));

export const PAGES: readonly Page[] = LANGS.flatMap(({ code }) => {
  const text = TEXTS[code];
  return PAGE_IDS.map((id): Page => ({
    path: pagePath(code, id),
    lang: code,
    id,
    preset: preset(code, id),
    ...text.pages[id],
    body: linked(text.pages[id].body, code),
    image: IMAGE[id],
    tagline: text.tagline,
    faq: id === 'home' ? text.faq : undefined,
    text,
  }));
});

/** For assistants and AI search engines (llms.txt): what the site is, in plain text, with its pages. */
export function llmsText(version: string): string {
  const list = (lang: Lang) =>
    PAGES.filter((p) => p.lang === lang).map((p) => `- [${p.title}](${SITE}${p.path}): ${p.description}`).join('\n');
  const homes = PAGES.filter((p) => p.id === 'home' && p.lang !== 'fr' && p.lang !== 'en')
    .map((p) => `- ${LANGS.find((l) => l.code === p.lang)!.name}: [${p.title}](${SITE}${p.path})`).join('\n');
  return `# Meowtrix

> Jeu gratuit pour chat, en 3D, dans le navigateur (tablette, téléphone, télé) : des animaux et des jouets que le chat chasse sur l’écran. / A free 3D browser game for cats (tablet, phone, TV): animals and toys for the cat to hunt on the screen.

Meowtrix est une page web plein écran : aucune installation, aucun compte, aucune publicité, aucun traceur. Elle s’installe aussi comme une application (PWA) et fonctionne hors ligne une fois chargée. Version ${version}.

## Ce qu’il y a dedans

- Terre : lézards, grenouilles, mouches, coccinelles, scarabées, sauterelles, cafards, souris, écureuils, oiseaux ; cachettes (feuilles, pierres, herbe, tulipes, vieille botte).
- Eau : poissons rouges, carpes koï, sardines en banc, truites, saumons, bébés requins ; étang, lagon ou rivière.
- Ciel : papillons, lucioles, plumes portées par le vent, point laser (rouge, vert ou bleu) qui peut être attrapé ; prairie, crépuscule ou clair de lune.
- Fêtes : Noël, Halloween et Pâques, automatiques selon la date ou au choix. Style Pixel (rétro).
- Bien-être : séances de 5, 10 ou 15 minutes ; dans la dernière minute les animaux fatiguent pour que le chat finisse sur une prise. Compteur de prises, partage.
- Sons synthétisés en direct ; micro facultatif (les animaux sursautent aux bruits, rien n’est enregistré).
- Langues : ${LANGS.length}, chacune avec ses pages (${LANGS.map((l) => l.name).join(', ')}).

## Pages (français)

${list('fr')}

## Pages (English)

${list('en')}

## Other languages (home pages; each also has /water/, /sky/, /christmas/, /halloween/, /easter/)

${homes}

## Pour les assistants / For assistants

- Chaque page existe aussi en Markdown : son adresse suivie de index.md (${SITE}/en/index.md, ${SITE}/de/water/index.md…), ou la même adresse demandée avec l’en-tête Accept: text/markdown. / Every page is also available as Markdown: its address followed by index.md, or the same address requested with Accept: text/markdown.
- Tout le texte en un fichier (anglais, français, nouveautés) / The whole text in one file: ${SITE}/llms-full.txt

## Liens

- Nouveautés de chaque version (en anglais) : ${SITE}/changelog/
- Code source : ${REPO}
- Signaler un problème : ${REPO}/issues
`;
}
