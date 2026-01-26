// buildScene: turns a matrix plus a style into a renderer-neutral scene (paths with fills,
// an optional logo image and an optional frame). SVG, PNG and PDF all draw from it.
import type { Matrix } from '../encode';
import { normalizeStyle, type Fill, type QrStyle } from '../options';
import { dotsPath } from './dots';
import { eyeInnerPath, eyeOuterPath } from './eyes';
import { bandHeight, layoutFrame } from './frames';
import { isSafeLogoHref, logoGeometry } from './logo';
import type { Box } from './path';
import { layoutText, loadCtaFont } from './textpath';

export interface Layer {
  d: string;
  fill: Fill;
  /** Gradient reference box in scene units (the symbol, or the frame band). */
  box: Box;
}

export interface Scene {
  width: number;
  height: number;
  background: string;
  layers: Layer[];
  logo?: Box & { href: string };
  frame?: { style: string; box: Box; textBox: Box };
}

const solid = (color: string): Fill => ({ kind: 'solid', color });

export async function buildScene(matrix: Matrix, input: QrStyle): Promise<Scene> {
  const style = normalizeStyle(input);
  const ms = style.moduleSize;
  const base = (matrix.size + 2 * style.margin) * ms;
  const width = base;
  const frameStyle = style.frame.style;
  const band = frameStyle === 'none' ? 0 : bandHeight(matrix.size, style.margin, ms);
  const top = frameStyle === 'banner-top' ? band : 0;
  const origin = { x: style.margin * ms, y: style.margin * ms + top };
  const symbol: Box = { x: origin.x, y: origin.y, w: matrix.size * ms, h: matrix.size * ms };

  const layers: Layer[] = [];
  const dots = dotsPath(matrix, style, origin);
  if (dots) layers.push({ d: dots, fill: style.foreground, box: symbol });
  layers.push({ d: eyeOuterPath(matrix.size, ms, style.eyeOuter.style, origin), fill: solid(style.eyeOuter.color), box: symbol });
  layers.push({ d: eyeInnerPath(matrix.size, ms, style.eyeInner.style, origin), fill: solid(style.eyeInner.color), box: symbol });

  const scene: Scene = { width, height: base + band, background: style.background, layers };

  if (style.logo && isSafeLogoHref(style.logo.href)) {
    const { box } = logoGeometry(matrix, style, origin);
    scene.logo = { href: style.logo.href, ...box };
  }

  const frame = layoutFrame(frameStyle, width, frameStyle === 'banner-top' ? 0 : base, band, ms);
  if (frame) {
    // For banner-top the frame band is at y = 0 and the code sits below it.
    layers.push({ d: frame.d, fill: solid(style.frame.color), box: frame.box });
    let textBox: Box = { x: frame.textArea.x + frame.textArea.w / 2, y: frame.textArea.y + frame.textArea.h / 2, w: 0, h: 0 };
    if (style.frame.text.trim()) {
      const text = layoutText(await loadCtaFont(), style.frame.text, frame.textArea);
      if (text) {
        layers.push({ d: text.d, fill: solid(style.frame.textColor), box: frame.box });
        textBox = text.box;
      }
    }
    scene.frame = { style: frame.style, box: frame.box, textBox };
  }
  return scene;
}
