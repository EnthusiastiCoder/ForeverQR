// Writes the checker test fixtures to tests/fixtures/*.png with our own encoder and a plain
// module-to-pixel rasteriser (no styling), so every fixture is a clean, known code.
//   npx tsx scripts/make-fixtures.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { encode, type Matrix } from '../src/lib/qr/encode';
import { buildPayload } from '../src/lib/qr/payloads';
import { VECTORS } from '../tests/helpers/vectors';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, 'tests', 'fixtures');
const SCALE = 8;
const MARGIN = 4;

interface Bitmap {
  width: number;
  height: number;
  /** One byte per pixel: 0 = black, 255 = white (or any grey). */
  grey: Uint8Array;
}

function blank(width: number, height: number, value = 255): Bitmap {
  return { width, height, grey: new Uint8Array(width * height).fill(value) };
}

/** Draw the matrix with a MARGIN-module quiet zone at (x, y). */
function drawCode(bmp: Bitmap, m: Matrix, x: number, y: number) {
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.isDark(r, c)) continue;
      const px = x + (c + MARGIN) * SCALE;
      const py = y + (r + MARGIN) * SCALE;
      for (let dy = 0; dy < SCALE; dy++) bmp.grey.fill(0, (py + dy) * bmp.width + px, (py + dy) * bmp.width + px + SCALE);
    }
  }
}

const sidePx = (m: Matrix) => (m.size + 2 * MARGIN) * SCALE;

function single(text: string): Bitmap {
  const m = encode(text, 'M');
  const bmp = blank(sidePx(m), sidePx(m));
  drawCode(bmp, m, 0, 0);
  return bmp;
}

function payload(type: string): string {
  const v = VECTORS.find((x) => x.type === type);
  if (!v) throw new Error(`no vector for ${type}`);
  const r = buildPayload(v.type as never, v.fields as never);
  if ('error' in r) throw new Error(`${type}: ${r.error}`);
  return r.text;
}

function writePng(name: string, bmp: Bitmap) {
  const png = new PNG({ width: bmp.width, height: bmp.height, colorType: 0, inputColorType: 0, bitDepth: 8 });
  for (let i = 0; i < bmp.grey.length; i++) {
    const g = bmp.grey[i];
    png.data[i * 4] = g;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = g;
    png.data[i * 4 + 3] = 255;
  }
  writeFileSync(join(OUT, name), PNG.sync.write(png, { colorType: 0 }));
  console.log(`wrote tests/fixtures/${name} (${bmp.width}x${bmp.height})`);
}

mkdirSync(OUT, { recursive: true });

writePng('vendor-qrco.png', single('https://qrco.de/bfAbc1'));
writePng('shortener-bitly.png', single('https://bit.ly/3xYz12'));
writePng('direct.png', single('https://example.com/menu'));
writePng('wifi.png', single(payload('wifi')));
writePng('vcard.png', single(payload('vcard')));

{
  const a = encode('https://example.com/menu', 'M');
  const b = encode('https://bit.ly/3xYz12', 'M');
  const gap = 10 * SCALE;
  const h = Math.max(sidePx(a), sidePx(b));
  const bmp = blank(sidePx(a) + gap + sidePx(b), h);
  drawCode(bmp, a, 0, 0);
  drawCode(bmp, b, sidePx(a) + gap, 0);
  writePng('two-codes.png', bmp);
}

writePng('no-qr.png', blank(400, 400, 200));
