// sceneToSvg: a standalone, deterministic SVG document. Gradients go in <defs> with
// stable ids; a logo is only ever an <image href="data:...">, never inlined markup.
import type { Fill } from '../options';
import { num, type Box } from './path';
import type { Scene } from './scene';

export interface SvgOptions {
  /** Leave out the background rectangle (for transparent PNGs). */
  transparent?: boolean;
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Endpoints of a linear gradient across `box` at `angle` degrees (0 = left to right, clockwise). */
export function linearEnds(box: Box, angle: number) {
  const a = (angle * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const half = (Math.abs(box.w * cos) + Math.abs(box.h * sin)) / 2;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return { x1: cx - cos * half, y1: cy - sin * half, x2: cx + cos * half, y2: cy + sin * half };
}

/** Centre and radius of a radial gradient over `box`: it reaches the corners. */
export function radialGeometry(box: Box) {
  return { cx: box.x + box.w / 2, cy: box.y + box.h / 2, r: Math.hypot(box.w, box.h) / 2 };
}

function gradientDef(id: string, fill: Exclude<Fill, { kind: 'solid' }>, box: Box): string {
  const stops = fill.stops.map((s) => `<stop offset="${num(s.offset)}" stop-color="${attr(s.color)}"/>`).join('');
  if (fill.kind === 'radial') {
    const g = radialGeometry(box);
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(g.cx)}" cy="${num(g.cy)}" r="${num(g.r)}">${stops}</radialGradient>`;
  }
  const e = linearEnds(box, fill.angle);
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(e.x1)}" y1="${num(e.y1)}" x2="${num(e.x2)}" y2="${num(e.y2)}">${stops}</linearGradient>`;
}

export function sceneToSvg(scene: Scene, opts: SvgOptions = {}): string {
  const w = num(scene.width);
  const h = num(scene.height);
  const defs: string[] = [];
  const body: string[] = [];
  if (!opts.transparent) body.push(`<rect width="${w}" height="${h}" fill="${attr(scene.background)}"/>`);
  scene.layers.forEach((layer, i) => {
    if (!layer.d) return;
    let fill: string;
    if (layer.fill.kind === 'solid') {
      fill = attr(layer.fill.color);
    } else {
      const id = `fq-g${i}`;
      defs.push(gradientDef(id, layer.fill, layer.box));
      fill = `url(#${id})`;
    }
    body.push(`<path d="${attr(layer.d)}" fill="${fill}"/>`);
  });
  if (scene.logo) {
    const l = scene.logo;
    body.push(
      `<image href="${attr(l.href)}" x="${num(l.x)}" y="${num(l.y)}" width="${num(l.w)}" height="${num(l.h)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    body.join('') +
    `</svg>`
  );
}
