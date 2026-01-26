// Frame CTA text as a vector path (opentype.js + the bundled Archivo Black TTF), so the
// text looks identical in SVG, PNG and PDF and needs no font at view time.
import { parse, type Font } from 'opentype.js';
import type { Box } from './path';

export const CTA_FONT_URL = '/fonts/ArchivoBlack-Regular.ttf';
const CTA_FONT_FILE = 'public/fonts/ArchivoBlack-Regular.ttf';

let fontPromise: Promise<Font> | null = null;

async function readFontBytes(): Promise<ArrayBuffer> {
  const isNode = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';
  if (isNode) {
    // Node (unit tests, scripts): read the file from the repo. The specifiers sit in
    // variables so bundlers leave them alone; this branch never runs in the browser.
    const fsSpec = 'node:fs/promises';
    const pathSpec = 'node:path';
    const fs = (await import(/* @vite-ignore */ fsSpec)) as typeof import('node:fs/promises');
    const path = (await import(/* @vite-ignore */ pathSpec)) as typeof import('node:path');
    const buf = await fs.readFile(path.resolve(process.cwd(), CTA_FONT_FILE));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  const res = await fetch(CTA_FONT_URL);
  if (!res.ok) throw new Error(`Could not load the frame font (${res.status})`);
  return res.arrayBuffer();
}

/** The parsed CTA font, loaded once. */
export function loadCtaFont(): Promise<Font> {
  if (!fontPromise) {
    fontPromise = readFontBytes()
      .then((bytes) => parse(bytes))
      .catch((err) => {
        fontPromise = null;
        throw err;
      });
  }
  return fontPromise;
}

export interface TextPath {
  d: string;
  box: Box; // bounding box of the glyph outlines, in scene units
}

/** Share of the band the text may use. */
const FIT_W = 0.84;
const FIT_H = 0.55;
const SAFETY = 0.9;

/**
 * Lay `text` out centred in `box`, auto-sizing it so the glyph outlines stay inside
 * FIT_W x FIT_H of the box.
 */
export function layoutText(font: Font, text: string, box: Box): TextPath | null {
  const t = text.trim();
  if (!t) return null;
  const ref = 100;
  const probe = font.getPath(t, 0, 0, ref).getBoundingBox();
  const pw = probe.x2 - probe.x1;
  const ph = probe.y2 - probe.y1;
  if (!(pw > 0) || !(ph > 0)) return null;
  const size = ref * Math.min((FIT_W * box.w) / pw, (FIT_H * box.h) / ph) * SAFETY;
  const k = size / ref;
  // Offset so the outline bbox is centred in the box.
  const x = box.x + (box.w - pw * k) / 2 - probe.x1 * k;
  const y = box.y + (box.h - ph * k) / 2 - probe.y1 * k;
  const path = font.getPath(t, x, y, size);
  const bb = path.getBoundingBox();
  return { d: path.toPathData(3), box: { x: bb.x1, y: bb.y1, w: bb.x2 - bb.x1, h: bb.y2 - bb.y1 } };
}
