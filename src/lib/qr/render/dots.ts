// The data-module layer: every dark module except the three finder patterns and the
// modules cleared by the logo, drawn in the chosen dot style.
import type { Matrix } from '../encode';
import type { DotStyle, QrStyle } from '../options';
import { clearedBy, type Point } from './logo';
import { circlePath, rectPath, type Radii } from './path';

/** True inside one of the three 7x7 finder patterns. */
export function inFinder(r: number, c: number, size: number): boolean {
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
}

/** Dark modules drawn by the dot layer, as [row, col], in row-major order. */
export function dotModules(matrix: Matrix, style: QrStyle): [number, number][] {
  const cleared = clearedBy(matrix, style);
  const out: [number, number][] = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.isDark(r, c) && !inFinder(r, c, matrix.size) && !cleared(r, c)) out.push([r, c]);
    }
  }
  return out;
}

/** Corner radii (as a fraction of a module) for a module, given which neighbours are on. */
function radiiFor(style: DotStyle, up: boolean, right: boolean, down: boolean, left: boolean): Radii {
  const tl = !up && !left;
  const tr = !up && !right;
  const br = !down && !right;
  const bl = !down && !left;
  switch (style) {
    case 'rounded':
      return [tl ? 0.25 : 0, tr ? 0.25 : 0, br ? 0.25 : 0, bl ? 0.25 : 0];
    case 'extra-rounded':
      return [tl ? 0.5 : 0, tr ? 0.5 : 0, br ? 0.5 : 0, bl ? 0.5 : 0];
    case 'classy':
      return [tl ? 0.5 : 0, 0, br ? 0.5 : 0, 0];
    case 'classy-rounded':
      return [tl ? 0.5 : 0, tr ? 0.2 : 0, br ? 0.5 : 0, bl ? 0.2 : 0];
    default:
      return [0, 0, 0, 0];
  }
}

/** The dot layer as one SVG path. `origin` is the scene position of module (0, 0). */
export function dotsPath(matrix: Matrix, style: QrStyle, origin: Point): string {
  const ms = style.moduleSize;
  const n = matrix.size;
  const on = new Uint8Array(n * n);
  for (const [r, c] of dotModules(matrix, style)) on[r * n + c] = 1;
  const at = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && on[r * n + c] === 1;
  const parts: string[] = [];

  if (style.dotStyle === 'square') {
    // Merge horizontal runs into one rectangle each: smaller output, no seams.
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!at(r, c)) {
          c++;
          continue;
        }
        const start = c;
        while (at(r, c)) c++;
        parts.push(rectPath(origin.x + start * ms, origin.y + r * ms, (c - start) * ms, ms));
      }
    }
    return parts.join('');
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!at(r, c)) continue;
      const x = origin.x + c * ms;
      const y = origin.y + r * ms;
      if (style.dotStyle === 'dots') {
        parts.push(circlePath(x + ms / 2, y + ms / 2, ms * 0.45));
        continue;
      }
      const radii = radiiFor(style.dotStyle, at(r - 1, c), at(r, c + 1), at(r + 1, c), at(r, c - 1));
      parts.push(rectPath(x, y, ms, ms, radii.map((k) => k * ms) as Radii));
    }
  }
  return parts.join('');
}
