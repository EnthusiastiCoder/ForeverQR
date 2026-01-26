// Frames: a coloured band holding the CTA text, below (or above) the code. The band adds
// height only; the scene width stays (size + 2*margin) * moduleSize.
import type { FrameStyle } from '../options';
import { num, rectPath, type Box } from './path';

export interface FrameLayout {
  style: Exclude<FrameStyle, 'none'>;
  box: Box; // the band
  textArea: Box; // where the CTA text is laid out
  d: string; // the frame shape, filled with the frame colour
}

/** Band height for a symbol of `size` modules: about a fifth of the base, whole modules. */
export function bandHeight(size: number, margin: number, ms: number): number {
  return Math.max(4, Math.ceil((size + 2 * margin) * 0.2)) * ms;
}

/**
 * Lay the frame out in a scene that is `width` wide with a square base of `base` height.
 * For banner-top the band sits at y = 0 and the code moves down by the band height.
 */
export function layoutFrame(style: FrameStyle, width: number, base: number, band: number, ms: number): FrameLayout | null {
  if (style === 'none') return null;
  if (style === 'banner-top') {
    const box = { x: 0, y: 0, w: width, h: band };
    return { style, box, textArea: box, d: rectPath(0, 0, width, band) };
  }
  const box = { x: 0, y: base, w: width, h: band };
  if (style === 'banner-bottom') {
    return { style, box, textArea: box, d: rectPath(0, base, width, band) };
  }
  if (style === 'card') {
    // A rounded border around the whole scene that thickens into the band at the bottom.
    const t = ms * 0.6;
    const r = ms * 1.5;
    const outer = rectPath(0, 0, width, base + band, [r, r, r, r]);
    const inner = rectPath(t, t, width - 2 * t, base - t, [r - t, r - t, 0, 0], true);
    return { style, box, textArea: box, d: outer + inner };
  }
  // bubble: a rounded speech bubble in the band, its pointer aiming up at the code.
  const gap = ms * 0.8;
  const r = ms;
  const bx = ms * 0.5;
  const by = base + gap;
  const bw = width - 2 * bx;
  const bh = band - gap - ms * 0.3;
  const cx = width / 2;
  const pw = ms * 0.9;
  const py = by + ms * 0.3; // overlap the bubble so there is no seam
  const pointer = `M${num(cx - pw)} ${num(py)}L${num(cx)} ${num(base)}L${num(cx + pw)} ${num(py)}Z`;
  const textArea = { x: bx, y: by, w: bw, h: bh };
  return { style, box, textArea, d: rectPath(bx, by, bw, bh, [r, r, r, r]) + pointer };
}

