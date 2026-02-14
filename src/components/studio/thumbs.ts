// Tiny SVG thumbnails for the visual style pickers, drawn with the real renderers.
import type { Matrix } from '../../lib/qr/encode';
import { DEFAULT_STYLE, type DotStyle, type EyeStyle, type QrStyle } from '../../lib/qr/options';
import { dotsPath } from '../../lib/qr/render/dots';
import { eyeInnerPath, eyeOuterPath } from '../../lib/qr/render/eyes';

const N = 9;
const MS = 10;
// A fixed, QR-looking 9x9 module pattern (1 = dark).
const PATTERN = [
  '110100111',
  '101101001',
  '011011010',
  '110110111',
  '001011100',
  '111010011',
  '010110101',
  '101101110',
  '110011011',
];

const fake: Matrix = {
  size: N,
  version: 1,
  ecc: 'M',
  // Large enough that dotsPath's finder test (the 7x7 corners of a size-N symbol) skips nothing:
  // we hand it a symbol of size N + 14 and only use the centre.
  isDark: (r, c) => PATTERN[r - 7]?.[c - 7] === '1',
};

export function dotThumb(dotStyle: DotStyle): string {
  const style: QrStyle = { ...structuredClone(DEFAULT_STYLE), dotStyle, margin: 0, moduleSize: MS };
  const m: Matrix = { ...fake, size: N + 14 };
  const d = dotsPath(m, style, { x: -7 * MS, y: -7 * MS });
  return `<svg viewBox="0 0 ${N * MS} ${N * MS}" aria-hidden="true" focusable="false"><path d="${d}" fill="currentColor"/></svg>`;
}

export function eyeThumb(part: 'outer' | 'inner', eye: EyeStyle): string {
  const outer = eyeOuterPath(7, MS, part === 'outer' ? eye : 'square', { x: 0, y: 0 });
  const inner = eyeInnerPath(7, MS, part === 'inner' ? eye : 'square', { x: 0, y: 0 });
  const dim = (p: boolean) => (p ? '1' : '0.35');
  return `<svg viewBox="-5 -5 80 80" aria-hidden="true" focusable="false"><path d="${outer}" fill="currentColor" fill-rule="evenodd" opacity="${dim(part === 'outer')}"/><path d="${inner}" fill="currentColor" opacity="${dim(part === 'inner')}"/></svg>`;
}
