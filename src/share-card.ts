import type { Theme } from './catalog';

export interface CardInfo {
  theme: Theme;
  /** The cat's name, or the word for "my cat". */
  cat: string;
  catches: number;
  /** The sentence shared with the link (what the cat caught). */
  line: string;
  /** The animals on screen: icon and how many. */
  animals: readonly { icon: string; n: number }[];
  /** The site, shown at the bottom. */
  site: string;
  rtl: boolean;
}

const SIZE = 1080;

/** Background colours and a big faint emoji per theme. */
const LOOK: Record<Theme, { from: string; to: string; glow: string; mark: string }> = {
  land: { from: '#1c2a16', to: '#0f1412', glow: 'rgba(182, 243, 107, 0.35)', mark: '🦎' },
  water: { from: '#0f2a3a', to: '#0a1419', glow: 'rgba(127, 211, 255, 0.35)', mark: '🐠' },
  sky: { from: '#2a1f3f', to: '#141019', glow: 'rgba(212, 184, 255, 0.35)', mark: '🦋' },
};

const FONT = 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Breaks `text` into lines no wider than `width`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A square picture to share on social networks: the cat's name and score over the theme's
 * colours, the animals it hunted, and the site's address. Null if the browser can't make one.
 */
export async function shareCard(info: CardInfo): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const look = LOOK[info.theme];
  ctx.direction = info.rtl ? 'rtl' : 'ltr';

  const bg = ctx.createLinearGradient(0, 0, 0, SIZE);
  bg.addColorStop(0, look.from);
  bg.addColorStop(1, look.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const glow = ctx.createRadialGradient(SIZE * 0.5, SIZE * 0.42, 0, SIZE * 0.5, SIZE * 0.42, SIZE * 0.55);
  glow.addColorStop(0, look.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // The theme's animal, big and faint, behind everything.
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.font = `560px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(look.mark, SIZE * 0.5, SIZE * 0.5);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Wordmark, two colours like the menu's.
  ctx.font = `800 72px ${FONT}`;
  const meow = 'Meow', trix = 'trix';
  const w1 = ctx.measureText(meow).width, w2 = ctx.measureText(trix).width;
  const x0 = (SIZE - w1 - w2) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eef5ea';
  ctx.fillText(meow, x0, 150);
  ctx.fillStyle = '#b6f36b';
  ctx.fillText(trix, x0 + w1, 150);
  ctx.textAlign = 'center';

  ctx.fillStyle = '#a3b2a0';
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(info.cat, SIZE / 2, 330);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 300px ${FONT}`;
  ctx.fillText(String(info.catches), SIZE / 2, 600);

  ctx.fillStyle = '#eef5ea';
  ctx.font = `700 44px ${FONT}`;
  const lines = wrap(ctx, info.line, SIZE - 200).slice(0, 3);
  lines.forEach((l, i) => ctx.fillText(l, SIZE / 2, 690 + i * 58));

  // The animals, each with its count.
  const row = info.animals.slice(0, 6);
  if (row.length) {
    ctx.font = `700 64px ${FONT}`;
    const gap = 150;
    const start = SIZE / 2 - ((row.length - 1) * gap) / 2;
    row.forEach((a, i) => {
      const x = start + i * gap;
      ctx.fillText(a.icon, x, 905);
      ctx.fillStyle = '#a3b2a0';
      ctx.font = `700 34px ${FONT}`;
      ctx.fillText(`×${a.n}`, x, 955);
      ctx.fillStyle = '#eef5ea';
      ctx.font = `700 64px ${FONT}`;
    });
  }

  ctx.fillStyle = '#b6f36b';
  ctx.font = `700 36px ${FONT}`;
  ctx.fillText(info.site, SIZE / 2, 1030);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
