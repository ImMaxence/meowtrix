// The pages as Markdown, for assistants and agents: an index.md next to each page (also served to
// requests asking for text/markdown, see nginx.conf) and llms-full.txt, everything in one file.

import { langInfo } from '../src/langs.ts';
import { RELEASES } from './changelog.ts';
import { PAGES, REPO, SITE, type Page } from './pages.ts';

/** Our own HTML (headings, paragraphs, lists, bold, links) as Markdown, with absolute links. */
export function toMarkdown(html: string): string {
  const items = (list: string) => [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim());
  return html
    .replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href: string, text: string) =>
      `[${text}](${href.startsWith('/') ? SITE + href : href})`)
    .replace(/<\/?strong>/g, '**')
    .replace(/<h2>([\s\S]*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>([\s\S]*?)<\/h3>/g, '### $1\n\n')
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (_, list: string) => `${items(list).map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\n`)
    .replace(/<ul>([\s\S]*?)<\/ul>/g, (_, list: string) => `${items(list).map((item) => `- ${item}`).join('\n')}\n\n`)
    .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * One page as Markdown: its text, how to play, its questions and, unless `links` is false, the
 * other pages and its translations.
 */
export function pageMarkdown(page: Page, links = true): string {
  const { text } = page;
  const siblings = PAGES.filter((p) => p.lang === page.lang && p.path !== page.path);
  const translations = PAGES.filter((p) => p.id === page.id && p !== page);
  return [
    `# ${page.title}`,
    `> ${page.description}`,
    toMarkdown(page.body),
    `## ${text.howTitle}\n\n${text.how.map((step, i) => `${i + 1}. ${toMarkdown(step)}`).join('\n')}`,
    page.faq ? `## ${text.faqTitle}\n\n${page.faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')}` : '',
    links ? `## ${text.otherPages}\n\n${siblings.map((p) => `- [${p.name}](${SITE}${p.path})`).join('\n')}` : '',
    links ? `## ${text.languages}\n\n${translations.map((p) => `- [${langInfo(p.lang).name}](${SITE}${p.path})`).join('\n')}` : '',
    `---\n\n${text.note} · [${text.source}](${REPO}) · ${SITE}${page.path}`,
  ].filter(Boolean).join('\n\n') + '\n';
}

/** The /changelog/ page as Markdown. */
export function changelogMarkdown(): string {
  const list = (title: string, items?: readonly string[]) =>
    items?.length ? `### ${title}\n\n${items.map((item) => `- ${toMarkdown(item)}`).join('\n')}` : '';
  const releases = RELEASES.map((r) =>
    [`## ${r.version} (${r.date})`, r.summary, list('New', r.added), list('Improved', r.improved), list('Fixed', r.fixed)]
      .filter(Boolean).join('\n\n'));
  return `# What’s new in Meowtrix\n\n> Every version of Meowtrix, the free 3D game for cats, newest first.\n\n${releases.join('\n\n')}\n`;
}

/** Everything in one file for assistants: the English and French pages, then the changelog. */
export function llmsFull(version: string): string {
  const pages = (lang: 'en' | 'fr') => PAGES.filter((p) => p.lang === lang).map((p) => pageMarkdown(p, false));
  return [
    `# Meowtrix: full text\n\n> A free 3D browser game for cats (tablet, phone, TV), version ${version}. Below: every page in English, then in French, then the changelog. Each page in each of the 44 languages also exists on its own as Markdown, at its address followed by index.md (${SITE}/de/index.md, ${SITE}/ja/water/index.md…); the list of pages is in ${SITE}/llms.txt.`,
    ...pages('en'),
    ...pages('fr'),
    changelogMarkdown(),
  ].join('\n\n---\n\n');
}
