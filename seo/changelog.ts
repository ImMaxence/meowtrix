// What each version added, in English, for the /changelog/ page (written by seo/plugin.ts).
// The newest comes first and must be the version in package.json: the build checks it.
// CHANGELOG.md tells the same story in French, with the developer details.

import { REPO, SITE } from './pages.ts';

export interface Release {
  version: string;
  /** Release day, YYYY-MM-DD. */
  date: string;
  /** One line on what the version is about. */
  summary: string;
  /** New things (HTML). */
  added?: readonly string[];
  /** Things that work better than before (HTML). */
  improved?: readonly string[];
  /** Things that were wrong and now aren't (HTML). */
  fixed?: readonly string[];
}

export const RELEASES: readonly Release[] = [
  {
    version: '0.7.0',
    date: '2026-11-02',
    summary: 'Easier for AI assistants to read, and to recommend.',
    improved: [
      'AI assistants and search engines now get each page’s full text and its questions and answers, even without running the game. Before, most of it was tucked away in the Info tab, where many of them didn’t look.',
      'Every page also comes in <strong>Markdown</strong>, the plain text AI agents prefer: add index.md to its address (<a href="/en/index.md">/en/index.md</a>), or simply ask for it, as agents do.',
      'The whole site’s text in one file for assistants: <a href="/llms-full.txt">llms-full.txt</a>.',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-11-02',
    summary: 'A tidier timeline on this page.',
    fixed: [
      'The dots of this page’s timeline sit exactly on the line, whatever the screen’s scaling, and the line now runs from the first version to the last without sticking out.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-11-02',
    summary: 'Meowtrix now speaks 44 languages.',
    added: [
      '<strong>44 languages</strong> for the game and its pages: English, French, Spanish, Portuguese (Brazil and Portugal), German, Italian, Dutch, Swedish, Danish, Norwegian, Finnish, Estonian, Latvian, Lithuanian, Polish, Czech, Slovak, Hungarian, Romanian, Bulgarian, Greek, Croatian, Serbian, Slovenian, Ukrainian, Russian, Turkish, Arabic, Hebrew, Persian, Japanese, Korean, Chinese (simplified and traditional), Hindi, Bengali, Urdu, Indonesian, Malay, Thai, Vietnamese, Filipino and Swahili. On a first visit, the menu opens in your browser’s language.',
      '<strong>A page for every theme and holiday in every language</strong>, 264 in all, such as <a href="/de/">German</a> or <a href="/ja/water/">Japanese water</a>, each one linking to its translations.',
      '<strong>A new language menu</strong>: the globe button lists every language in its own words, with its name in yours alongside, and a search field that finds one by any of its names or its code (“german”, “deutsch”, “de”). It works with a mouse, a finger, a keyboard or a TV remote.',
      '<strong>Right-to-left layout</strong> for Arabic, Hebrew, Persian and Urdu.',
      '<strong>This page</strong>, to see what each version brought.',
    ],
    improved: [
      'People searching in a language Meowtrix doesn’t have yet now land on the English version.',
      'Menu buttons make room for long words: the icon moves above the label, then the text gets smaller. Chinese, Japanese and Korean words are no longer split in two.',
      'The Share button links to the home page in the menu’s language.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-01',
    summary: 'A sky to hunt in, a retro look and short play sessions.',
    added: [
      '<strong>Sky theme</strong>: butterflies, fireflies, feathers drifting in the wind and a laser dot that can actually be caught, on a meadow, at dusk or by moonlight.',
      '<strong>Pixel style</strong>, for a retro video game look.',
      '<strong>Timed sessions</strong> of 5, 10 or 15 minutes: in the last minute the animals tire, so your cat ends on a catch. Plus a catch counter, your cat’s name and a summary at the end.',
      '<strong>Automatic holidays</strong>: the one in season turns on by itself.',
      '<strong>Share links</strong> that recreate your scene for a friend.',
      '<strong>Pages for search engines</strong>, one per theme and holiday, in French and English, with preview pictures.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-11-01',
    summary: 'Holidays: every theme can dress up.',
    added: [
      '<strong>Christmas</strong>: falling snow, Santa hats and a stocking to hide in.',
      '<strong>Halloween</strong>: glowing pumpkins, bats, embers and witch hats.',
      '<strong>Easter</strong>: bunny ears, giant eggs and a shower of petals.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-11-01',
    summary: 'Water, and many more animals.',
    added: [
      '<strong>Water theme</strong>: goldfish, koi carp, a school of sardines, trout, salmon and baby sharks, in a pond, a lagoon or a river.',
      '<strong>More animals on land</strong>: frogs, grasshoppers, ladybirds, beetles, cockroaches, squirrels and birds, each in several colours.',
      '<strong>New hiding spots</strong>: an old boot, grass, tulips, water lilies, rocks and seaweed.',
    ],
  },
  {
    version: 'First versions',
    date: '2026-10-31',
    summary: 'Where it all started.',
    added: [
      '3D lizards that wander about, hide under leaves and stones and dash off under a paw, then flies and mice.',
      'Sounds made live, animals that startle at noises in the room, fullscreen, and an app you can install.',
    ],
  },
];

const day = (date: string): string =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

const anchor = (r: Release): string => (r.version.match(/^\d/) ? `v${r.version}` : 'first');

function release(r: Release, latest: boolean): string {
  const list = (title: string, kind: string, items?: readonly string[]) =>
    items?.length ? `<h3 class="${kind}">${title}</h3>\n<ul>\n${items.map((i) => `<li>${i}</li>`).join('\n')}\n</ul>` : '';
  return `<li class="release${latest ? ' latest' : ''}" id="${anchor(r)}">
<article>
<header class="release-head">
<h2><a href="#${anchor(r)}">${r.version}</a></h2>
${latest ? '<span class="badge">Latest</span>' : ''}
<time datetime="${r.date}">${day(r.date)}</time>
</header>
<p class="summary">${r.summary}</p>
${list('New', 'new', r.added)}
${list('Improved', 'improved', r.improved)}
${list('Fixed', 'fixed', r.fixed)}
</article>
</li>`;
}

/** The /changelog/ page: a standalone page in the game's colours, newest version first. */
export function changelogPage(): string {
  const latest = RELEASES[0];
  const description = `What each version of Meowtrix, the free 3D game for cats, added and when. Latest: ${latest.version}, ${day(latest.date)}.`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>What’s new in Meowtrix – Changelog</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${SITE}/changelog/" />
    <link rel="alternate" type="text/markdown" href="${SITE}/changelog/index.md" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Meowtrix" />
    <meta property="og:title" content="What’s new in Meowtrix" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${SITE}/changelog/" />
    <meta property="og:image" content="${SITE}/og/home.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0f1412" />
    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
    <style>
      :root {
        --bg: #0f1412;
        --card: rgba(255, 255, 255, 0.045);
        --line: rgba(255, 255, 255, 0.12);
        --text: #eef5ea;
        --muted: #a3b2a0;
        --accent: #b6f36b;
        --accent-soft: rgba(182, 243, 107, 0.14);
        --accent-ink: #13200c;
      }
      * {
        box-sizing: border-box;
      }
      html {
        background: var(--bg);
        scroll-padding-top: 24px;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(900px 500px at 50% -120px, rgba(182, 243, 107, 0.1), transparent 70%), var(--bg);
        color: var(--text);
        font-family: ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.55;
        -webkit-font-smoothing: antialiased;
      }
      a {
        color: var(--accent);
      }
      a:focus-visible {
        outline: 3px solid #fff;
        outline-offset: 2px;
        border-radius: 4px;
      }
      .wrap {
        width: min(720px, 100%);
        margin: 0 auto;
        padding: 0 16px;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-top: 22px;
      }
      .logo {
        color: var(--text);
        font-size: 1.6rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        text-decoration: none;
      }
      .logo span {
        color: var(--accent);
      }
      .play {
        padding: 9px 18px;
        border-radius: 999px;
        background: var(--accent);
        color: var(--accent-ink);
        font-weight: 800;
        text-decoration: none;
        box-shadow: 0 6px 20px rgba(182, 243, 107, 0.25);
      }
      .play:hover {
        filter: brightness(1.06);
      }
      .intro {
        padding: 40px 0 28px;
      }
      h1 {
        margin: 0;
        font-size: clamp(2.1rem, 7vw, 3rem);
        line-height: 1.05;
        letter-spacing: -0.03em;
      }
      .lead {
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 1.05rem;
      }
      .releases {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      /* The timeline: each version draws its dot, level with its title, and the line down to the
         next dot. Both are centred on the same axis by the same transform, so they stay aligned
         whatever the screen's scaling. */
      .release {
        --axis: 8px;
        --dot: 16px;
        --dot-y: 37px;
        position: relative;
        padding: 0 0 22px 34px;
      }
      .release::before,
      .release::after {
        content: '';
        position: absolute;
        left: var(--axis);
        transform: translateX(-50%);
      }
      .release::before {
        z-index: 1;
        top: calc(var(--dot-y) - var(--dot) / 2);
        width: var(--dot);
        height: var(--dot);
        border: 2px solid var(--muted);
        border-radius: 50%;
        background: var(--bg);
      }
      .release::after {
        top: var(--dot-y);
        bottom: calc(-1 * var(--dot-y));
        width: 2px;
        background: var(--line);
      }
      .release:last-child::after {
        display: none;
      }
      .release.latest::before {
        border-color: var(--accent);
        background: var(--accent);
        box-shadow: 0 0 0 5px var(--accent-soft), 0 0 18px rgba(182, 243, 107, 0.5);
      }
      .release.latest::after {
        background: linear-gradient(var(--accent), var(--line));
      }
      article {
        padding: 18px 20px 6px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--card);
      }
      .latest article {
        border-color: rgba(182, 243, 107, 0.35);
        background: linear-gradient(160deg, rgba(182, 243, 107, 0.07), var(--card) 45%);
      }
      .release-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 12px;
      }
      h2 {
        margin: 0;
        font-size: 1.45rem;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }
      h2 a {
        color: var(--text);
        text-decoration: none;
      }
      h2 a:hover {
        color: var(--accent);
      }
      .badge {
        padding: 2px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      time {
        margin-left: auto;
        color: var(--muted);
        font-size: 0.9rem;
        font-weight: 600;
      }
      .summary {
        margin: 8px 0 4px;
        font-size: 1.08rem;
        font-weight: 700;
      }
      h3 {
        margin: 16px 0 6px;
        font-size: 0.75rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      h3.new {
        color: var(--accent);
      }
      h3.improved {
        color: #7fd3ff;
      }
      h3.fixed {
        color: #ffb36b;
      }
      ul {
        margin: 0 0 12px;
        padding: 0;
        list-style: none;
      }
      article li {
        position: relative;
        margin: 0 0 8px;
        padding-left: 18px;
        color: #d6e2d2;
      }
      article li::before {
        content: '';
        position: absolute;
        top: 0.62em;
        left: 2px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--muted);
      }
      h3.new + ul li::before {
        background: var(--accent);
      }
      h3.improved + ul li::before {
        background: #7fd3ff;
      }
      h3.fixed + ul li::before {
        background: #ffb36b;
      }
      strong {
        color: var(--text);
      }
      .foot {
        padding: 18px 0 40px;
        color: var(--muted);
        font-size: 0.85rem;
        text-align: center;
      }
      @media (max-width: 480px) {
        .release {
          --axis: 7px;
          --dot: 14px;
          --dot-y: 35px;
          padding-left: 26px;
        }
        article {
          padding: 16px 16px 4px;
        }
        time {
          width: 100%;
          margin-left: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header class="top">
        <a class="logo" href="/en/">Meow<span>trix</span></a>
        <a class="play" href="/en/">Play</a>
      </header>
      <main>
        <div class="intro">
          <h1>What’s new</h1>
          <p class="lead">Every version of Meowtrix, the free 3D game for cats, newest first.</p>
        </div>
        <ol class="releases">
${RELEASES.map((r, i) => release(r, i === 0)).join('\n')}
        </ol>
      </main>
      <footer class="foot">Meowtrix is a personal project · <a href="${REPO}" rel="noopener">source code on GitHub</a></footer>
    </div>
  </body>
</html>
`;
}
