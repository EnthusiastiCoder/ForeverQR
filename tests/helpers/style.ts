// Builds a QrStyle for tests: DEFAULT_STYLE from src/lib/qr/options.ts with overrides.
//
// QrStyle contract the tests rely on (options.ts owns the full type):
//   margin: number                       quiet zone in modules (default 4)
//   moduleSize: number                   scene units per module
//   background: string                   '#rrggbb'
//   foreground: Fill                     { kind: 'solid', color } | { kind: 'linear'|'radial', stops: { offset, color }[], angle }
//   dotStyle: 'square'|'rounded'|'dots'|'classy'|'classy-rounded'|'extra-rounded'
//   eyeOuter: { style: 'square'|'rounded'|'circle'|'leaf', color: string }
//   eyeInner: { style: 'square'|'rounded'|'circle'|'leaf', color: string }
//   logo: null | { href: string (data URL), size: number (fraction of symbol width, 0.1-0.3), padding: number (modules) }
//   frame: { style: 'none'|'banner-bottom'|'banner-top'|'card'|'bubble', text: string, textColor: string, color: string }
import { PNG } from 'pngjs';

export async function makeStyle(overrides: Record<string, unknown> = {}) {
  const { DEFAULT_STYLE } = await import('../../src/lib/qr/options');
  const base = structuredClone(DEFAULT_STYLE) as Record<string, unknown>;
  for (const [k, v] of Object.entries(overrides)) {
    const cur = base[k];
    base[k] =
      v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object'
        ? { ...(cur as object), ...(v as object) }
        : v;
  }
  return base as never;
}

export const solid = (color: string) => ({ kind: 'solid', color });

export const linear = (...colors: string[]) => ({
  kind: 'linear',
  angle: 45,
  stops: colors.map((color, i) => ({ offset: colors.length === 1 ? 0 : i / (colors.length - 1), color })),
});

/** A small opaque PNG as a data URL, for logo tests. */
export function pngDataUrl(w = 32, h = 32, rgba: [number, number, number, number] = [220, 30, 30, 255]): string {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) png.data.set(rgba, i * 4);
  return 'data:image/png;base64,' + PNG.sync.write(png).toString('base64');
}

/** A PNG file buffer, for upload tests. */
export function pngBuffer(w = 64, h = 64, rgba: [number, number, number, number] = [220, 30, 30, 255]): Buffer {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) png.data.set(rgba, i * 4);
  return PNG.sync.write(png);
}
