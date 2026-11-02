// What a language's pages say: one file per language in seo/locales/.

/** The pages every language has: the home page, the other themes and the fêtes. */
export type PageId = 'home' | 'water' | 'sky' | 'christmas' | 'halloween' | 'easter';

export interface PageText {
  /** Short name for links between pages. */
  name: string;
  title: string;
  description: string;
  imageAlt: string;
  /** The article shown in the menu's About tab (HTML); {water}, {sky}… become those pages' addresses. */
  body: string;
}

export interface SeoText {
  tagline: string;
  /** What kind of app it is, for structured data ("Game for cats"). */
  genre: string;
  howTitle: string;
  /** How to play, in three steps (HTML). */
  how: readonly [string, string, string];
  faqTitle: string;
  /** Questions and answers, on the home page. */
  faq: readonly (readonly [string, string])[];
  otherPages: string;
  /** Heading of the links to the same page in the other languages. */
  languages: string;
  /** "Meowtrix is a personal project" */
  note: string;
  /** "source code on GitHub" */
  source: string;
  pages: Record<PageId, PageText>;
}
