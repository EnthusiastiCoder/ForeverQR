// WS1 cases #19-#26: scene building, dots, eyes, logo excavation, frames, SVG and PDF output.
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { Window } from 'happy-dom';
import { linear, makeStyle, pngDataUrl, solid } from '../helpers/style';

const encoder = () => import('../../src/lib/qr/encode');
const sceneMod = () => import('../../src/lib/qr/render/scene');
const dotsMod = () => import('../../src/lib/qr/render/dots');
const svgMod = () => import('../../src/lib/qr/render/svg');
const pdfMod = () => import('../../src/lib/qr/render/pdf');
const presetsMod = () => import('../../src/lib/qr/presets');

const TEXT = 'https://example.com/';

type Box = { x: number; y: number; w: number; h: number };
type Scene = {
  width: number;
  height: number;
  background: string;
  layers: { d: string; fill: unknown }[];
  logo?: Box & { href: string };
  frame?: { box: Box; textBox: Box };
};

async function matrixFor(text = TEXT, ecc: 'L' | 'M' | 'Q' | 'H' = 'M') {
  const { encode } = await encoder();
  return encode(text, ecc);
}

async function scene(style: unknown, text = TEXT, ecc: 'L' | 'M' | 'Q' | 'H' = 'M'): Promise<Scene> {
  const { buildScene } = await sceneMod();
  return (await buildScene(await matrixFor(text, ecc), style as never)) as Scene;
}

async function preset(name: string) {
  const { PRESETS } = await presetsMod();
  const p = (PRESETS as { name: string; style: unknown; ecc?: string }[]).find((x) => x.name === name);
  expect(p, `preset ${name}`).toBeDefined();
  return p!;
}

const inFinder = (r: number, c: number, size: number) =>
  (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

const within = (inner: Box, outer: Box, eps = 1e-6) =>
  inner.x >= outer.x - eps &&
  inner.y >= outer.y - eps &&
  inner.x + inner.w <= outer.x + outer.w + eps &&
  inner.y + inner.h <= outer.y + outer.h + eps;

describe('dots and eyes', () => {
  it('#19 the dot layer never contains a module inside the three finder areas', async () => {
    const { dotModules } = await dotsMod();
    for (const text of [TEXT, 'x'.repeat(300)]) {
      const m = await matrixFor(text);
      const style = await makeStyle();
      const mods = dotModules(m, style) as [number, number][];
      expect(mods.length).toBeGreaterThan(0);
      expect(mods.some(([r, c]) => r === 6 && c === 8)).toBe(true); // timing pattern is a dot
      for (const [r, c] of mods) {
        expect(inFinder(r, c, m.size), `module ${r},${c}`).toBe(false);
        expect(m.isDark(r, c)).toBe(true);
      }
    }
  });
});

describe('logo', () => {
  it('#20 every module whose cell meets the padded logo box is cleared; others are unchanged', async () => {
    const { dotModules } = await dotsMod();
    const m = await matrixFor(TEXT, 'H');
    const style = await makeStyle({ logo: { href: pngDataUrl(), size: 0.2, padding: 1 } });
    const s = await scene(style, TEXT, 'H');
    expect(s.logo).toBeDefined();
    const { margin, moduleSize } = style as unknown as { margin: number; moduleSize: number };
    const pad = 1 * moduleSize;
    const box = { x: s.logo!.x - pad, y: s.logo!.y - pad, w: s.logo!.w + 2 * pad, h: s.logo!.h + 2 * pad };
    // The logo box is 20% of the symbol width (margin excluded).
    expect(s.logo!.w).toBeCloseTo(0.2 * m.size * moduleSize, 5);

    const got = new Set((dotModules(m, style) as [number, number][]).map(([r, c]) => `${r},${c}`));
    let cleared = 0;
    for (let r = 0; r < m.size; r++) {
      for (let c = 0; c < m.size; c++) {
        if (!m.isDark(r, c) || inFinder(r, c, m.size)) continue;
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        const meets =
          x < box.x + box.w && x + moduleSize > box.x && y < box.y + box.h && y + moduleSize > box.y;
        if (meets) cleared++;
        expect(got.has(`${r},${c}`), `module ${r},${c} meets=${meets}`).toBe(!meets);
      }
    }
    expect(cleared).toBeGreaterThan(0);
  });

  it('#25 an uploaded SVG logo is only an <image href="data:image/svg+xml;base64,...">', async () => {
    const { sceneToSvg } = await svgMod();
    const evil = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="9" height="9"/></svg>';
    const href = 'data:image/svg+xml;base64,' + Buffer.from(evil).toString('base64');
    const svg = sceneToSvg(await scene(await makeStyle({ logo: { href, size: 0.2, padding: 1 } }), TEXT, 'H'));
    expect(svg).toMatch(/<image\b[^>]*href="data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+"/);
    expect(svg.match(/<svg\b/g)).toHaveLength(1); // only the root element
    expect(svg).not.toMatch(/<script/i);
    expect(svg).not.toContain('alert(1)');
  });
});

describe('scene geometry', () => {
  it('#21 width = (size + 2*margin) * moduleSize; a frame adds its band height', async () => {
    const m = await matrixFor();
    for (const margin of [0, 4, 8]) {
      const style = await makeStyle({ margin });
      const s = await scene(style);
      const expected = (m.size + 2 * margin) * (style as unknown as { moduleSize: number }).moduleSize;
      expect(s.width).toBeCloseTo(expected, 6);
      expect(s.height).toBeCloseTo(expected, 6);
    }
    const style = await makeStyle({ margin: 4, frame: { style: 'banner-bottom', text: 'Scan me' } });
    const s = await scene(style);
    const base = (m.size + 8) * (style as unknown as { moduleSize: number }).moduleSize;
    expect(s.width).toBeCloseTo(base, 6);
    expect(s.frame).toBeDefined();
    expect(s.frame!.box.h).toBeGreaterThan(0);
    expect(s.height).toBeCloseTo(base + s.frame!.box.h, 6);
  });
});

describe('svg', () => {
  it('#22 well-formed XML with a viewBox; gradients emit a gradient element', async () => {
    const { sceneToSvg } = await svgMod();
    const plain = sceneToSvg(await scene(await makeStyle({ foreground: solid('#111111') })));
    const doc = new (new Window().DOMParser)().parseFromString(plain, 'image/svg+xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.documentElement.tagName.toLowerCase()).toBe('svg');
    expect(plain).toContain('viewBox');

    const grad = sceneToSvg(await scene(await makeStyle({ foreground: linear('#000000', '#1d3b8f') })));
    const gdoc = new (new Window().DOMParser)().parseFromString(grad, 'image/svg+xml');
    expect(gdoc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(grad).toMatch(/<(linearGradient|radialGradient)\b/);
  });

  it('#23 deterministic output; Classic preset snapshot', async () => {
    const { sceneToSvg } = await svgMod();
    const classic = await preset('Classic');
    const a = sceneToSvg(await scene(classic.style));
    const b = sceneToSvg(await scene(structuredClone(classic.style)));
    expect(a).toBe(b);
    expect(a).toMatchSnapshot();
  });

  it('#24 the frame CTA is a <path>, never <text>, and a 24-char text fits inside the frame', async () => {
    const { sceneToSvg } = await svgMod();
    const cta = 'Scan me for the menu now';
    expect(cta).toHaveLength(24);
    const s = await scene(await makeStyle({ frame: { style: 'banner-bottom', text: cta } }));
    const svg = sceneToSvg(s);
    expect(svg).not.toMatch(/<text\b/);
    expect(svg).toMatch(/<path\b/);
    expect(s.frame).toBeDefined();
    expect(s.frame!.textBox.w).toBeGreaterThan(0);
    expect(within(s.frame!.textBox, s.frame!.box)).toBe(true);
    expect(within(s.frame!.box, { x: 0, y: 0, w: s.width, h: s.height })).toBe(true);
  });
});

describe('pdf', () => {
  async function imageXObjects(bytes: Uint8Array): Promise<{ doc: PDFDocument; images: number }> {
    const doc = await PDFDocument.load(bytes);
    let images = 0;
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      const dict = (obj as { dict?: { get(n: PDFName): unknown } }).dict;
      if (dict && dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) images++;
    }
    return { doc, images };
  }

  it('#26 A4 page; vector for solid fills, an embedded image for gradients', async () => {
    const { sceneToPdf } = await pdfMod();
    const classic = await preset('Classic');
    const solidPdf = await sceneToPdf(await scene(classic.style), { page: 'A4', sizeMm: 60 });
    const a = await imageXObjects(solidPdf);
    expect(a.doc.getPageCount()).toBe(1);
    const { width, height } = a.doc.getPage(0).getSize();
    expect(Math.abs(width - 595.28)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(height - 841.89)).toBeLessThanOrEqual(0.5);
    expect(a.images).toBe(0);

    const gradient = await preset('Dot Pop');
    const gradPdf = await sceneToPdf(await scene(gradient.style), { page: 'A4', sizeMm: 60 });
    expect((await imageXObjects(gradPdf)).images).toBeGreaterThan(0);
  });
});
