// Small SVG path builders shared by the renderers. Numbers have a fixed format
// (at most 3 decimals, no trailing zeros) so the output is deterministic.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Corner radii, clockwise from the top-left. */
export type Radii = [tl: number, tr: number, br: number, bl: number];

export function num(n: number): string {
  const v = Number(n.toFixed(3));
  return Object.is(v, -0) ? '0' : String(v);
}

/**
 * A rectangle with per-corner radii. Clockwise by default; `ccw` draws it the other way,
 * which makes it a hole inside a clockwise shape under the nonzero fill rule.
 */
export function rectPath(x: number, y: number, w: number, h: number, radii: Radii = [0, 0, 0, 0], ccw = false): string {
  const lim = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = radii.map((r) => Math.max(0, Math.min(lim, r)));
  const n = num;
  const arc = (r: number, sweep: 0 | 1, ex: number, ey: number) =>
    r > 0 ? `A${n(r)} ${n(r)} 0 0 ${sweep} ${n(ex)} ${n(ey)}` : `L${n(ex)} ${n(ey)}`;
  if (!ccw) {
    return [
      `M${n(x + tl)} ${n(y)}`,
      `H${n(x + w - tr)}`,
      tr > 0 ? arc(tr, 1, x + w, y + tr) : '',
      `V${n(y + h - br)}`,
      br > 0 ? arc(br, 1, x + w - br, y + h) : '',
      `H${n(x + bl)}`,
      bl > 0 ? arc(bl, 1, x, y + h - bl) : '',
      `V${n(y + tl)}`,
      tl > 0 ? arc(tl, 1, x + tl, y) : '',
      'Z',
    ].join('');
  }
  return [
    `M${n(x + tl)} ${n(y)}`,
    tl > 0 ? arc(tl, 0, x, y + tl) : '',
    `V${n(y + h - bl)}`,
    bl > 0 ? arc(bl, 0, x + bl, y + h) : '',
    `H${n(x + w - br)}`,
    br > 0 ? arc(br, 0, x + w, y + h - br) : '',
    `V${n(y + tr)}`,
    tr > 0 ? arc(tr, 0, x + w - tr, y) : '',
    `H${n(x + tl)}`,
    'Z',
  ].join('');
}

/** A full circle as two arcs. Clockwise by default. */
export function circlePath(cx: number, cy: number, r: number, ccw = false): string {
  const s = ccw ? 0 : 1;
  const n = num;
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 ${s} ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 ${s} ${n(cx - r)} ${n(cy)}Z`;
}

/** Strict overlap of two boxes (touching edges do not count). */
export function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
