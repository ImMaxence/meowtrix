// Generates the PWA icons (a paw print) as PNG files in public/icons.
// Run with: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/icons/', import.meta.url);
const BG = [0x14, 0x1c, 0x17];
const PAW = [0xb6, 0xf3, 0x6b];

// Pads in a 0..1 square.
const PADS = [
  { x: 0.5, y: 0.64, rx: 0.19, ry: 0.155 },
  { x: 0.285, y: 0.44, rx: 0.075, ry: 0.095 },
  { x: 0.415, y: 0.315, rx: 0.075, ry: 0.095 },
  { x: 0.585, y: 0.315, rx: 0.075, ry: 0.095 },
  { x: 0.715, y: 0.44, rx: 0.075, ry: 0.095 },
];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function render(size, { rounded, scale }) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // PNG filter: none
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, v = (y + 0.5) / size;
      let bg = 1;
      if (rounded) {
        const r = 0.22, qx = Math.max(Math.abs(u - 0.5) - (0.5 - r), 0), qy = Math.max(Math.abs(v - 0.5) - (0.5 - r), 0);
        bg = clamp01(0.5 - (Math.hypot(qx, qy) - r) * size);
      }
      const pu = (u - 0.5) / scale + 0.5, pv = (v - 0.5) / scale + 0.5;
      let paw = 0;
      for (const p of PADS) {
        const d = (Math.hypot((pu - p.x) / p.rx, (pv - p.y) / p.ry) - 1) * Math.min(p.rx, p.ry) * scale;
        paw = Math.max(paw, clamp01(0.5 - d * size));
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] + (PAW[c] - BG[c]) * paw);
      raw[o + 3] = Math.round(bg * 255);
    }
  }
  return png(size, raw);
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
const files = {
  'icon-192.png': render(192, { rounded: true, scale: 1 }),
  'icon-512.png': render(512, { rounded: true, scale: 1 }),
  // Maskable icons are cropped by the OS: full-bleed background, paw inside the safe zone.
  'icon-maskable-512.png': render(512, { rounded: false, scale: 0.78 }),
  // iOS rounds the corners itself.
  'apple-touch-icon.png': render(180, { rounded: false, scale: 0.9 }),
};
for (const [name, data] of Object.entries(files)) writeFileSync(new URL(name, OUT), data);

const ellipses = PADS.map((p) => `<ellipse cx="${p.x * 100}" cy="${p.y * 100}" rx="${p.rx * 100}" ry="${p.ry * 100}"/>`).join('');
writeFileSync(
  new URL('icon.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#141c17"/><g fill="#b6f36b">${ellipses}</g></svg>\n`,
);
console.log('Icons written to public/icons');
