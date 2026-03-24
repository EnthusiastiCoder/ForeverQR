#!/usr/bin/env node
// Writes public/og/<slug>.png (1200x630): a QR code of the page's own URL on the brand colour.
// Output is committed, so the build needs no image tooling.
//   node scripts/make-og.mjs
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';

const require = createRequire(import.meta.url);
const qrcode = require('qrcode-generator');
const SITE = 'https://foreverqr.pages.dev';
const slugs = ['home', ...readdirSync('src/content/landing').map((f) => f.replace(/\.md$/, ''))];
mkdirSync('public/og', { recursive: true });

for (const slug of slugs) {
  const url = slug === 'home' ? `${SITE}/` : `${SITE}/${slug}/`;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const png = new PNG({ width: 1200, height: 630 });
  const fill = (x0, y0, w, h, [r, g, b]) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const i = (y * 1200 + x) * 4;
        png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
      }
  };
  fill(0, 0, 1200, 630, [11, 107, 79]);
  const cell = Math.floor(520 / (n + 8));
  const size = cell * (n + 8);
  const ox = Math.floor((1200 - size) / 2);
  const oy = Math.floor((630 - size) / 2);
  fill(ox, oy, size, size, [255, 255, 255]);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) fill(ox + (c + 4) * cell, oy + (r + 4) * cell, cell, cell, [11, 16, 14]);
  writeFileSync(`public/og/${slug}.png`, PNG.sync.write(png));
}
console.log(`wrote ${slugs.length} images`);
