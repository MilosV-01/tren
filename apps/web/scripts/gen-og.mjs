/**
 * Generates static branding PNGs into apps/web/public/ from inline SVG.
 * Run once (and whenever the brand mark changes):  node scripts/gen-og.mjs
 *
 * Geometric only — no text/font rendering — so output is identical on every OS.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
mkdirSync(pub, { recursive: true });

const ROSE = '#e11d48';
const INK = '#1c1917';

// Tren camera mark inside a rounded square. `dark` = ink mark on white,
// otherwise white mark on rose.
const logoMark = (s, r, dark = false) => {
  const bg = dark ? '#ffffff' : ROSE;
  const fg = dark ? INK : '#ffffff';
  const hl = dark ? '#ffffff' : ROSE;
  const k = s / 128; // camera path is authored on a 128x104 grid, centered
  const ox = (s - 128 * k) / 2;
  const oy = (s - 104 * k) / 2;
  return `
  <rect width="${s}" height="${s}" rx="${r}" fill="${bg}"/>
  <g transform="translate(${ox},${oy}) scale(${k})">
    <path d="M20 92 a12 12 0 0 1 -12 -12 V44 a12 12 0 0 1 12 -12 h14 l10 -14 h28 l10 14 h14 a12 12 0 0 1 12 12 v36 a12 12 0 0 1 -12 12"
          fill="none" stroke="${fg}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="64" cy="60" r="22" fill="${fg}"/>
    <path d="M74 47 a15 15 0 0 1 7 10" fill="none" stroke="${hl}" stroke-width="5" stroke-linecap="round"/>
  </g>`;
};

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1f2"/><stop offset="0.55" stop-color="#ffe4e6"/>
      <stop offset="1" stop-color="#fecdd3"/>
    </linearGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#fb7185"/></linearGradient>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
    <linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a5b4fc"/><stop offset="1" stop-color="#818cf8"/></linearGradient>
    <linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#34d399"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="90" r="220" fill="#fecdd3" opacity="0.55"/>
  <circle cx="120" cy="560" r="160" fill="#fbcfe8" opacity="0.45"/>

  <g transform="translate(96,150)">${logoMark(96, 24)}</g>

  <!-- text placeholders -->
  <rect x="96" y="286" width="560" height="34" rx="17" fill="#1c1917"/>
  <rect x="96" y="336" width="440" height="34" rx="17" fill="#1c1917"/>
  <rect x="96" y="400" width="380" height="20" rx="10" fill="#9f1239" opacity="0.6"/>

  <!-- photo grid card -->
  <g transform="translate(760,120)">
    <rect x="-24" y="-24" width="420" height="420" rx="28" fill="#fff"/>
    <rect x="8"   y="8"   width="176" height="176" rx="16" fill="url(#a)"/>
    <rect x="204" y="8"   width="176" height="176" rx="16" fill="url(#b)"/>
    <rect x="8"   y="204" width="176" height="176" rx="16" fill="url(#c)"/>
    <rect x="204" y="204" width="176" height="176" rx="16" fill="url(#d)"/>
  </g>
</svg>`;

const icon = (size, radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${logoMark(size, radius)}</svg>`;

async function main() {
  await sharp(Buffer.from(og)).png().toFile(resolve(pub, 'og.png'));
  await sharp(Buffer.from(icon(180, 40))).png().toFile(resolve(pub, 'apple-icon.png'));
  await sharp(Buffer.from(icon(512, 96))).png().toFile(resolve(pub, 'icon-512.png'));
  await sharp(Buffer.from(icon(512, 0))).png().toFile(resolve(pub, 'icon-512-maskable.png'));
  console.log('wrote og.png, apple-icon.png, icon-512.png, icon-512-maskable.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
