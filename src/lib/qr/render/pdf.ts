// sceneToPdf: vector paths for solid fills (pdf-lib drawSvgPath). A gradient layer is a
// raster of the gradient (about 300 dpi) clipped by the layer's vector path. Logos are images.
import {
  PDFDocument,
  clip,
  degrees,
  drawImage,
  drawSvgPath,
  endPath,
  popGraphicsState,
  rgb,
  scale as scaleOp,
  type PDFOperator,
  type PDFPage,
} from 'pdf-lib';
import type { Fill } from '../options';
import { hexToRgb } from '../scan/contrast';
import type { Box } from './path';
import type { Layer, Scene } from './scene';
import { linearEnds, radialGeometry } from './svg';

export type PdfPage = 'fit' | 'A4' | 'Letter';

export interface PdfOptions {
  page?: PdfPage;
  /** Printed width of the scene in millimetres. */
  sizeMm?: number;
}

const PAGES: Record<Exclude<PdfPage, 'fit'>, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
};
const PT_PER_MM = 72 / 25.4;
const DPI = 300;
const MAX_RASTER = 2048;

const color = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return rgb(r / 255, g / 255, b / 255);
};

/** Colour of a gradient at scene point (x, y), as 0..255 RGB. */
export function gradientAt(fill: Exclude<Fill, { kind: 'solid' }>, box: Box, x: number, y: number): [number, number, number] {
  let t: number;
  if (fill.kind === 'radial') {
    const g = radialGeometry(box);
    t = Math.hypot(x - g.cx, y - g.cy) / g.r;
  } else {
    const e = linearEnds(box, fill.angle);
    const dx = e.x2 - e.x1;
    const dy = e.y2 - e.y1;
    const len2 = dx * dx + dy * dy || 1;
    t = ((x - e.x1) * dx + (y - e.y1) * dy) / len2;
  }
  t = Math.min(1, Math.max(0, t));
  const stops = fill.stops;
  if (t <= stops[0].offset) return hexToRgb(stops[0].color);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (t <= b.offset) {
      const k = b.offset > a.offset ? (t - a.offset) / (b.offset - a.offset) : 1;
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      return [0, 1, 2].map((j) => Math.round(ca[j] + (cb[j] - ca[j]) * k)) as [number, number, number];
    }
  }
  return hexToRgb(stops[stops.length - 1].color);
}

// --- a minimal PNG writer (RGB, 8 bit), so gradients work without a canvas ---

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function zlib(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export async function encodePngRgb(width: number, height: number, rgbBytes: Uint8Array): Promise<Uint8Array> {
  const raw = new Uint8Array(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    raw.set(rgbBytes.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', await zlib(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function gradientPng(fill: Exclude<Fill, { kind: 'solid' }>, box: Box, printedPt: number) {
  const px = Math.max(16, Math.min(MAX_RASTER, Math.ceil((printedPt / 72) * DPI)));
  const w = px;
  const h = Math.max(1, Math.round((px * box.h) / box.w));
  const bytes = new Uint8Array(w * h * 3);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = gradientAt(fill, box, box.x + ((i + 0.5) / w) * box.w, box.y + ((j + 0.5) / h) * box.h);
      bytes.set(c, (j * w + i) * 3);
    }
  }
  return encodePngRgb(w, h, bytes);
}

function dataUrlBytes(href: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(href);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes };
}

/** WebP or SVG logos need a canvas to become PNG; that only exists in the browser. */
async function rasterLogo(href: string, px: number): Promise<Uint8Array | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = href;
  await img.decode();
  const canvas = document.createElement('canvas');
  const k = px / Math.max(img.naturalWidth || px, img.naturalHeight || px);
  canvas.width = Math.max(1, Math.round((img.naturalWidth || px) * k));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || px) * k));
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/** Draw one gradient layer: the raster, clipped by the layer path. */
async function drawGradientLayer(doc: PDFDocument, page: PDFPage, layer: Layer, x: number, y: number, s: number) {
  const fill = layer.fill as Exclude<Fill, { kind: 'solid' }>;
  const png = await doc.embedPng(await gradientPng(fill, layer.box, layer.box.w * s));
  const name = page.node.newXObject('Image', png.ref);
  // Path ops in the flipped SVG space, without the trailing close/pop.
  const ops = drawSvgPath(layer.d, { x, y, scale: s }) as PDFOperator[];
  const pathOps = ops.slice(0, -2);
  page.pushOperators(
    ...pathOps,
    clip(),
    endPath(),
    // Undo the SVG flip/scale: back to PDF points relative to the scene's top-left.
    scaleOp(1 / s, -1 / s),
    ...drawImage(name, {
      x: layer.box.x * s,
      y: -(layer.box.y + layer.box.h) * s,
      width: layer.box.w * s,
      height: layer.box.h * s,
      rotate: degrees(0),
      xSkew: degrees(0),
      ySkew: degrees(0),
    }),
    popGraphicsState(),
  );
}

export async function sceneToPdf(scene: Scene, opts: PdfOptions = {}): Promise<Uint8Array> {
  const pageKind = opts.page ?? 'A4';
  const doc = await PDFDocument.create();
  doc.setTitle('QR code');
  doc.setCreator('Forever QR');
  doc.setProducer('Forever QR');

  let widthPt = (opts.sizeMm ?? 60) * PT_PER_MM;
  let pageW: number;
  let pageH: number;
  if (pageKind === 'fit') {
    pageW = widthPt;
    pageH = (widthPt * scene.height) / scene.width;
  } else {
    [pageW, pageH] = PAGES[pageKind];
    const maxW = pageW - 20 * PT_PER_MM;
    const maxH = pageH - 20 * PT_PER_MM;
    widthPt = Math.min(widthPt, maxW, (maxH * scene.width) / scene.height);
  }
  const s = widthPt / scene.width;
  const heightPt = scene.height * s;
  const page = doc.addPage([pageW, pageH]);
  const left = (pageW - widthPt) / 2;
  const top = (pageH + heightPt) / 2; // PDF y of the scene's top edge

  page.drawRectangle({ x: left, y: top - heightPt, width: widthPt, height: heightPt, color: color(scene.background) });

  for (const layer of scene.layers) {
    if (!layer.d) continue;
    if (layer.fill.kind === 'solid') {
      page.drawSvgPath(layer.d, { x: left, y: top, scale: s, color: color(layer.fill.color) });
    } else {
      await drawGradientLayer(doc, page, layer, left, top, s);
    }
  }

  if (scene.logo) {
    const l = scene.logo;
    const parsed = dataUrlBytes(l.href);
    if (parsed) {
      let image = null;
      if (parsed.mime === 'image/png') image = await doc.embedPng(parsed.bytes);
      else if (parsed.mime === 'image/jpeg' || parsed.mime === 'image/jpg') image = await doc.embedJpg(parsed.bytes);
      else {
        const png = await rasterLogo(l.href, Math.ceil(((l.w * s) / 72) * DPI));
        if (png) image = await doc.embedPng(png);
      }
      if (image) {
        // Fit the image inside the logo box, keeping its aspect ratio.
        const k = Math.min((l.w * s) / image.width, (l.h * s) / image.height);
        const w = image.width * k;
        const h = image.height * k;
        page.drawImage(image, {
          x: left + l.x * s + (l.w * s - w) / 2,
          y: top - (l.y * s + (l.h * s + h) / 2),
          width: w,
          height: h,
        });
      }
    }
  }
  return doc.save();
}
