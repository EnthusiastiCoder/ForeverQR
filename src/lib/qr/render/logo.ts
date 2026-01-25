// Logo placement: a square box centred on the symbol, and the padded box whose modules
// are cleared (excavated). Shared by the dot layer and the scannability checks.
import type { Matrix } from '../encode';
import type { QrStyle } from '../options';
import { intersects, type Box } from './path';

export interface LogoGeometry {
  box: Box; // where the image is drawn
  clear: Box; // box plus padding: every module meeting it is cleared
}

export interface Point {
  x: number;
  y: number;
}

/** Only data URLs of these image types are ever placed in the output. */
const SAFE_LOGO = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

export function isSafeLogoHref(href: unknown): href is string {
  return typeof href === 'string' && SAFE_LOGO.test(href);
}

/**
 * Logo boxes in scene coordinates. `origin` is the top-left of the symbol (module 0,0);
 * it defaults to the quiet-zone offset of a scene with no top band.
 */
export function logoGeometry(matrix: Pick<Matrix, 'size'>, style: QrStyle, origin?: Point): LogoGeometry {
  const ms = style.moduleSize;
  const o = origin ?? { x: style.margin * ms, y: style.margin * ms };
  const symbol = matrix.size * ms;
  const size = style.logo?.size ?? 0;
  const w = size * symbol;
  const box = { x: o.x + (symbol - w) / 2, y: o.y + (symbol - w) / 2, w, h: w };
  const pad = (style.logo?.padding ?? 0) * ms;
  const clear = { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad };
  return { box, clear };
}

/** A predicate telling whether module (row, col) is cleared by the logo. */
export function clearedBy(matrix: Pick<Matrix, 'size'>, style: QrStyle): (r: number, c: number) => boolean {
  if (!style.logo || !(style.logo.size > 0)) return () => false;
  const ms = style.moduleSize;
  // Work relative to the symbol origin so the result does not depend on frames.
  const { clear } = logoGeometry(matrix, style, { x: 0, y: 0 });
  return (r, c) => intersects({ x: c * ms, y: r * ms, w: ms, h: ms }, clear);
}
