// The three finder patterns ("eyes"): a 7x7 outer ring and a 3x3 inner square, each with
// its own shape. Ring holes run counter-clockwise so nonzero fill works everywhere.
import type { EyeStyle } from '../options';
import type { Point } from './logo';
import { circlePath, rectPath, type Radii } from './path';

/** Top-left module of each finder: top-left, top-right, bottom-left. */
export function finderOrigins(size: number): [number, number][] {
  return [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
}

// A slightly wider hole (ring 0.8 module) keeps the ring and the inner shape apart when the
// code is downscaled to 160 px; a full-module ring merges with the dot and stops decoding.
const CIRCLE_HOLE = 1.08;

function shape(style: EyeStyle, x: number, y: number, w: number, ccw: boolean): string {
  switch (style) {
    case 'circle':
      return circlePath(x + w / 2, y + w / 2, w / 2, ccw);
    case 'rounded': {
      const r = w * (2 / 7);
      return rectPath(x, y, w, w, [r, r, r, r], ccw);
    }
    case 'leaf': {
      const r = w * (3 / 7);
      return rectPath(x, y, w, w, [r, 0, r, 0] as Radii, ccw);
    }
    default:
      return rectPath(x, y, w, w, [0, 0, 0, 0], ccw);
  }
}

/** Outer rings of all three finders as one path. */
export function eyeOuterPath(size: number, ms: number, style: EyeStyle, origin: Point): string {
  return finderOrigins(size)
    .map(([r, c]) => {
      const x = origin.x + c * ms;
      const y = origin.y + r * ms;
      return shape(style, x, y, 7 * ms, false) + hole(style, x + ms, y + ms, 5 * ms, ms);
    })
    .join('');
}

function hole(style: EyeStyle, x: number, y: number, w: number, ms: number): string {
  // The hole follows the outer shape, one module in, so the ring keeps a constant width.
  switch (style) {
    case 'circle':
      return circlePath(x + w / 2, y + w / 2, (w / 2) * CIRCLE_HOLE, true);
    case 'rounded': {
      const r = Math.max(0, 7 * ms * (2 / 7) - ms);
      return rectPath(x, y, w, w, [r, r, r, r], true);
    }
    case 'leaf': {
      const r = Math.max(0, 7 * ms * (3 / 7) - ms);
      return rectPath(x, y, w, w, [r, 0, r, 0], true);
    }
    default:
      return rectPath(x, y, w, w, [0, 0, 0, 0], true);
  }
}

/** Inner 3x3 squares of all three finders as one path. */
export function eyeInnerPath(size: number, ms: number, style: EyeStyle, origin: Point): string {
  return finderOrigins(size)
    .map(([r, c]) => shape(style, origin.x + (c + 2) * ms, origin.y + (r + 2) * ms, 3 * ms, false))
    .join('');
}
