import type { Plugin } from 'vite';
import { llmsText, PAGES, REPO, SITE, type Page } from './pages.ts';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pageAt = (path: string): Page => PAGES.find((p) => p.path === path || p.path === `${path}/`) ?? PAGES[0];

/** The French and English versions of a page. */
function versions(page: Page): { fr: Page; en: Page } {
  const other = pageAt(page.alt);
  return page.lang === 'fr' ? { fr: page, en: other } : { fr: other, en: page };
}

/** What the page is, for search engines: the app, and its questions and answers on the home pages. */
function jsonLd(page: Page, version: string): string {
  const app = {
    '@type': 'WebApplication',
    name: 'Meowtrix',
    url: SITE + page.path,
    description: page.description,
    inLanguage: page.lang,
    applicationCategory: 'GameApplication',
    genre: page.lang === 'fr' ? 'Jeu pour chat' : 'Game for cats',
    operatingSystem: 'Web: Android, iOS, iPadOS, Windows, macOS, Linux, Smart TV',
    browserRequirements: 'WebGL',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    image: SITE + page.image,
    screenshot: SITE + page.image,
    softwareVersion: version,
    author: { '@type': 'Person', name: 'ImMaxence', url: 'https://github.com/ImMaxence' },
    sameAs: [REPO],
  };
  const faq = page.faq && {
    '@type': 'FAQPage',
    mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  // `<` escaped so the JSON can never close the script tag.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': faq ? [app, faq] : [app] }).replace(/</g, '\\u003c');
}

function head(page: Page, version: string): string {
  const { fr, en } = versions(page);
  const url = SITE + page.path, image = SITE + page.image;
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="fr" href="${SITE}${fr.path}" />`,
    `<link rel="alternate" hreflang="en" href="${SITE}${en.path}" />`,
    `<link rel="alternate" hreflang="x-default" href="${SITE}${fr.path}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Meowtrix" />`,
    `<meta property="og:locale" content="${page.lang === 'fr' ? 'fr_FR' : 'en_GB'}" />`,
    `<meta property="og:locale:alternate" content="${page.lang === 'fr' ? 'en_GB' : 'fr_FR'}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(page.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<script type="application/ld+json">${jsonLd(page, version)}</script>`,
  ].join('\n    ');
}

/** The About tab: the page's text, its questions, links to the other pages. */
function about(page: Page): string {
  const fr = page.lang === 'fr';
  const other = fr ? 'en' : 'fr';
  const faq = page.faq
    ? `<h3>${fr ? 'Questions fréquentes' : 'Frequently asked questions'}</h3>\n` +
      page.faq.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')
    : '';
  const links = PAGES.filter((p) => p.lang === page.lang && p.path !== page.path)
    .map((p) => `<a href="${p.path}">${esc(p.name)}</a>`).join(' · ');
  return `<p class="about-alt"><a href="${page.alt}" hreflang="${other}" lang="${other}">${fr ? 'English version' : 'Version française'}</a></p>
${page.body}
${faq}
<nav class="about-links" aria-label="${fr ? 'Les autres pages' : 'Other pages'}"><h3>${fr ? 'Les autres pages' : 'Other pages'}</h3><p>${links}</p></nav>
<p class="about-note">${fr ? 'Meowtrix est un projet personnel' : 'Meowtrix is a personal project'} · <a href="${REPO}" rel="noopener">${fr ? 'code source sur GitHub' : 'source code on GitHub'}</a></p>`;
}

/** Fills the placeholders of index.html for one page. */
export function renderPage(template: string, page: Page, version: string): string {
  const html = template
    .replace(/<html lang="[^"]*">/, `<html lang="${page.lang}"${page.preset ? ` data-preset="${esc(page.preset)}"` : ''}>`)
    .replace('<!-- seo:head -->', head(page, version))
    .replace('<!-- seo:tagline -->', esc(page.tagline))
    .replace('<!-- seo:about -->', about(page));
  if (html.includes('<!-- seo:')) throw new Error(`index.html: placeholder left in ${page.path}`);
  return html;
}

function sitemap(date: string): string {
  const urls = PAGES.map((page) => {
    const { fr, en } = versions(page);
    return `  <url>
    <loc>${SITE}${page.path}</loc>
    <lastmod>${date}</lastmod>
    <xhtml:link rel="alternate" hreflang="fr" href="${SITE}${fr.path}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${en.path}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${fr.path}"/>
  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

/**
 * Writes one HTML page per theme and fête and language (/, /eau/, /en/water/…) from index.html,
 * plus sitemap.xml and llms.txt. In the dev server, each path gets its page on the fly.
 */
export function seoPages(version: string): Plugin {
  let serve = false;
  return {
    name: 'meowtrix-seo',
    enforce: 'post',
    configResolved(config) {
      serve = config.command === 'serve';
    },
    transformIndexHtml(html, ctx) {
      if (!serve) return html;
      return renderPage(html, pageAt(new URL(ctx.originalUrl ?? ctx.path, SITE).pathname), version);
    },
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') throw new Error('index.html is missing from the bundle');
      const template = String(index.source);
      for (const page of PAGES) {
        const html = renderPage(template, page, version);
        if (page.path === '/') index.source = html;
        else this.emitFile({ type: 'asset', fileName: `${page.path.slice(1)}index.html`, source: html });
      }
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(new Date().toISOString().slice(0, 10)) });
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsText(version) });
    },
  };
}
