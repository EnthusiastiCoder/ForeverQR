// WS1 cases #27-#34: contrast, static scannability checks, and the decode round trip.
import { describe, expect, it } from 'vitest';
import { decodeRgba } from '../helpers/zxing';
import { rasterize } from '../helpers/raster';
import { VECTORS } from '../helpers/vectors';
import { linear, makeStyle, pngDataUrl, solid } from '../helpers/style';

const encoder = () => import('../../src/lib/qr/encode');
const contrastMod = () => import('../../src/lib/qr/scan/contrast');
const checksMod = () => import('../../src/lib/qr/scan/checks');
const payloads = () => import('../../src/lib/qr/payloads/index');

type Issue = { id: string; severity: 'error' | 'warning' | 'info'; message: string };
type Ecc = 'L' | 'M' | 'Q' | 'H';

const TEXT = 'https://example.com/';

async function assess(styleOverrides: Record<string, unknown>, ecc: Ecc = 'M', text = TEXT, decode?: unknown) {
  const { encode } = await encoder();
  const { assessScannability } = await checksMod();
  const style = await makeStyle(styleOverrides);
  return assessScannability(style, encode(text, ecc), decode as never) as Issue[];
}

const find = (issues: Issue[], id: string) => issues.filter((i) => i.id === id);

describe('contrast', () => {
  it('#27 WCAG ratios and the contrast thresholds', async () => {
    const { contrastRatio } = await contrastMod();
    expect(Math.abs(contrastRatio('#000000', '#ffffff') - 21)).toBeLessThanOrEqual(0.01);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);

    const weak = await assess({ foreground: solid('#777777'), background: '#ffffff' });
    expect(find(weak, 'weak-contrast').map((i) => i.severity)).toEqual(['warning']);
    expect(find(weak, 'low-contrast')).toHaveLength(0);

    const low = await assess({ foreground: solid('#cccccc'), background: '#ffffff' });
    expect(find(low, 'low-contrast').map((i) => i.severity)).toEqual(['error']);

    const good = await assess({ foreground: solid('#000000'), background: '#ffffff' });
    expect(find(good, 'low-contrast')).toHaveLength(0);
    expect(find(good, 'weak-contrast')).toHaveLength(0);
  });

  it('#28 light foreground on a dark background is "inverted"', async () => {
    const issues = await assess({ foreground: solid('#ffffff'), background: '#000000' });
    expect(find(issues, 'inverted').map((i) => i.severity)).toEqual(['warning']);
    expect(find(await assess({ foreground: solid('#000000'), background: '#ffffff' }), 'inverted')).toHaveLength(0);
  });

  it('#29 the worst gradient stop and eye colours count', async () => {
    const grad = await assess({ foreground: linear('#000000', '#dddddd'), background: '#ffffff' });
    expect(find(grad, 'low-contrast').map((i) => i.severity)).toEqual(['error']);

    const eye = await assess({
      foreground: solid('#000000'),
      background: '#ffffff',
      eyeOuter: { color: '#eeeeee' },
    });
    expect(find(eye, 'low-contrast').map((i) => i.severity)).toEqual(['error']);
  });
});

describe('logo, quiet zone and density', () => {
  // Logo area = the excavated box (logo plus padding) as a share of the symbol area, margin excluded.
  it('#30 a 25% logo at M is low-ECC and too big; an 18% logo at H is fine', async () => {
    const logo = (size: number) => ({ logo: { href: pngDataUrl(), size, padding: 1 } });
    const atM = await assess(logo(0.25), 'M');
    expect(find(atM, 'logo-low-ecc')).toHaveLength(1);
    expect(find(atM, 'logo-low-ecc')[0].severity).toBe('warning');
    expect(find(atM, 'logo-too-big')).toHaveLength(1);

    const atH = await assess(logo(0.18), 'H');
    expect(atH.filter((i) => i.id.startsWith('logo-'))).toEqual([]);
  });

  it('#31 margin 3 warns, margin 1 errors, margin 4 is clean', async () => {
    expect(find(await assess({ margin: 3 }), 'quiet-zone').map((i) => i.severity)).toEqual(['warning']);
    expect(find(await assess({ margin: 1 }), 'quiet-zone').map((i) => i.severity)).toEqual(['error']);
    expect(find(await assess({ margin: 4 }), 'quiet-zone')).toHaveLength(0);
  });

  it('#32 version >= 15 is "dense"', async () => {
    const { encode } = await encoder();
    const long = 'a'.repeat(600);
    expect(encode(long, 'H').version).toBeGreaterThanOrEqual(15);
    expect(find(await assess({}, 'H', long), 'dense').map((i) => i.severity)).toEqual(['warning']);
    expect(find(await assess({}, 'M', TEXT), 'dense')).toHaveLength(0);
  });
});

describe('decode', () => {
  it('#33 every payload type at every ECC decodes to exactly the payload text', async () => {
    const { encode } = await encoder();
    const { buildPayload } = await payloads();
    for (const v of VECTORS) {
      const built = buildPayload(v.type as never, v.fields as never) as { text?: string };
      expect(built.text, v.type).toBe(v.expected);
      for (const ecc of ['L', 'M', 'Q', 'H'] as const) {
        const results = await decodeRgba(rasterize(encode(v.expected, ecc)));
        expect(results.map((r) => r.text), `${v.type} @ ${ecc}`).toEqual([v.expected]);
      }
    }
  });

  // decodeResults contract: { expected: string; large: { text }[] (1024 px); small: { text }[] (160 px) }
  it('#34 decode results map to decode-fail, decode-small-fail and decode-pass', async () => {
    const mismatch = await assess({}, 'M', TEXT, {
      expected: TEXT,
      large: [{ text: 'https://other.example/' }],
      small: [{ text: 'https://other.example/' }],
    });
    expect(find(mismatch, 'decode-fail').map((i) => i.severity)).toEqual(['error']);

    const none = await assess({}, 'M', TEXT, { expected: TEXT, large: [], small: [] });
    expect(find(none, 'decode-fail').map((i) => i.severity)).toEqual(['error']);

    const smallFail = await assess({}, 'M', TEXT, { expected: TEXT, large: [{ text: TEXT }], small: [] });
    expect(find(smallFail, 'decode-small-fail').map((i) => i.severity)).toEqual(['warning']);
    expect(find(smallFail, 'decode-fail')).toHaveLength(0);

    const pass = await assess({}, 'M', TEXT, { expected: TEXT, large: [{ text: TEXT }], small: [{ text: TEXT }] });
    expect(find(pass, 'decode-pass').map((i) => i.severity)).toEqual(['info']);
    expect(pass.filter((i) => i.id.startsWith('decode-') && i.id !== 'decode-pass')).toEqual([]);
  });
});
