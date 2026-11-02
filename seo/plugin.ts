import type { Plugin } from 'vite';
import { langInfo, type Lang } from '../src/langs.ts';
import { changelogPage, RELEASES } from './changelog.ts';
import { changelogMarkdown, llmsFull, pageMarkdown } from './markdown.ts';
import { llmsText, pagePath, PAGES, REPO, SITE, type Page } from './pages.ts';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pageAt = (path: string): Page => PAGES.find((p) => p.path === path || p.path === `${path}/`) ?? PAGES[0];

/** The same page in every language, this one included. */
const versions = (page: Page): Page[] => PAGES.filter((p) => p.id === page.id);

const hreflang = (lang: Lang): string => langInfo(lang).hreflang ?? lang;

/** For searches in a language the site doesn't have: English. */
const fallback = (page: Page): string => SITE + pagePath('en', page.id);

/** What the page is, for search engines: the app, and its questions and answers on the home pages. */
function jsonLd(page: Page, version: string): string {
  const app = {
    '@type': 'WebApplication',
    name: 'Meowtrix',
    url: SITE + page.path,
    description: page.description,
    inLanguage: page.lang,
    applicationCategory: 'GameApplication',
    genre: page.text.genre,
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
  const url = SITE + page.path, image = SITE + page.image;
  const others = versions(page).filter((p) => p !== page);
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...versions(page).map((p) => `<link rel="alternate" hreflang="${hreflang(p.lang)}" href="${SITE}${p.path}" />`),
    `<link rel="alternate" hreflang="x-default" href="${fallback(page)}" />`,
    `<link rel="alternate" type="text/markdown" href="${url}index.md" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Meowtrix" />`,
    `<meta property="og:locale" content="${langInfo(page.lang).locale}" />`,
    ...others.map((p) => `<meta property="og:locale:alternate" content="${langInfo(p.lang).locale}" />`),
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

/** The About tab: the page's text, how to play, its questions, links to the other pages and languages. */
function about(page: Page): string {
  const { text } = page;
  const how = `<h3>${esc(text.howTitle)}</h3>\n<ol>\n${text.how.map((step) => `<li>${step}</li>`).join('\n')}\n</ol>`;
  const faq = page.faq
    ? `<h3>${esc(text.faqTitle)}</h3>\n` +
      page.faq.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')
    : '';
  const links = PAGES.filter((p) => p.lang === page.lang && p.path !== page.path)
    .map((p) => `<a href="${p.path}">${esc(p.name)}</a>`).join(' · ');
  const langs = versions(page).filter((p) => p !== page)
    .map((p) => `<a href="${p.path}" hreflang="${hreflang(p.lang)}" lang="${p.lang}">${esc(langInfo(p.lang).name)}</a>`).join(' · ');
  return `${page.body}
${how}
${faq}
<nav class="about-links" aria-label="${esc(text.otherPages)}"><h3>${esc(text.otherPages)}</h3><p>${links}</p></nav>
<nav class="about-links" aria-label="${esc(text.languages)}"><h3>${esc(text.languages)}</h3><p>${langs}</p></nav>
<p class="about-note">${esc(text.note)} · <a href="${REPO}" rel="noopener">${esc(text.source)}</a></p>`;
}

/** Fills the placeholders of index.html for one page. */
export function renderPage(template: string, page: Page, version: string): string {
  const dir = langInfo(page.lang).rtl ? ' dir="rtl"' : '';
  const html = template
    .replace(/<html lang="[^"]*">/, `<html lang="${page.lang}"${dir}${page.preset ? ` data-preset="${esc(page.preset)}"` : ''}>`)
    .replace('<!-- seo:head -->', head(page, version))
    .replace('<!-- seo:tagline -->', esc(page.tagline))
    .replace('<!-- seo:about -->', about(page));
  if (html.includes('<!-- seo:')) throw new Error(`index.html: placeholder left in ${page.path}`);
  return html;
}

function sitemap(date: string): string {
  const urls = PAGES.map((page) => `  <url>
    <loc>${SITE}${page.path}</loc>
    <lastmod>${date}</lastmod>
${versions(page).map((p) => `    <xhtml:link rel="alternate" hreflang="${hreflang(p.lang)}" href="${SITE}${p.path}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${fallback(page)}"/>
  </url>`);
  urls.push(`  <url>
    <loc>${SITE}/changelog/</loc>
    <lastmod>${RELEASES[0].date}</lastmod>
  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

/**
 * Writes one HTML page per theme and fête and language (/, /eau/, /en/water/, /de/water/…) from
 * index.html, each with its Markdown twin (index.md), plus /changelog/, sitemap.xml, llms.txt and
 * llms-full.txt. In the dev server, each path gets its HTML page on the fly.
 */
export function seoPages(version: string): Plugin {
  let serve = false;
  return {
    name: 'meowtrix-seo',
    enforce: 'post',
    configResolved(config) {
      serve = config.command === 'serve';
    },
    buildStart() {
      if (RELEASES[0].version !== version) {
        this.error(`seo/changelog.ts: add what version ${version} brings (the newest entry is ${RELEASES[0].version})`);
      }
    },
    configureServer(server) {
      server.middlewares.use('/changelog', (_req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(changelogPage());
      });
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
        this.emitFile({ type: 'asset', fileName: `${page.path.slice(1)}index.md`, source: pageMarkdown(page) });
      }
      this.emitFile({ type: 'asset', fileName: 'changelog/index.html', source: changelogPage() });
      this.emitFile({ type: 'asset', fileName: 'changelog/index.md', source: changelogMarkdown() });
      this.emitFile({ type: 'asset', fileName: 'llms-full.txt', source: llmsFull(version) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(new Date().toISOString().slice(0, 10)) });
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsText(version) });
    },
  };
}
