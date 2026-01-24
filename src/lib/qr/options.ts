// QR style options: the type every renderer and check reads, its defaults, and clamping.
import type { Ecc } from './encode';

export type DotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
export type EyeStyle = 'square' | 'rounded' | 'circle' | 'leaf';
export type FrameStyle = 'none' | 'banner-bottom' | 'banner-top' | 'card' | 'bubble';

export interface GradientStop {
  offset: number; // 0..1
  color: string; // '#rrggbb'
}

export type Fill =
  | { kind: 'solid'; color: string }
  | { kind: 'linear' | 'radial'; stops: GradientStop[]; angle: number };

export interface EyePart {
  style: EyeStyle;
  color: string;
}

export interface LogoOptions {
  href: string; // data URL (png, jpeg, webp, svg+xml)
  size: number; // fraction of the symbol width, 0.1..0.3
  padding: number; // cleared modules around the logo box
}

export interface FrameOptions {
  style: FrameStyle;
  text: string; // CTA, at most 24 characters
  textColor: string;
  color: string;
}

export interface QrStyle {
  margin: number; // quiet zone in modules, 0..8
  moduleSize: number; // scene units per module
  background: string;
  foreground: Fill;
  dotStyle: DotStyle;
  eyeOuter: EyePart;
  eyeInner: EyePart;
  logo: LogoOptions | null;
  frame: FrameOptions;
}

export const DOT_STYLES: DotStyle[] = ['square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'];
export const EYE_STYLES: EyeStyle[] = ['square', 'rounded', 'circle', 'leaf'];
export const FRAME_STYLES: FrameStyle[] = ['none', 'banner-bottom', 'banner-top', 'card', 'bubble'];
export const ECC_LEVELS: Ecc[] = ['L', 'M', 'Q', 'H'];

export const CTA_MAX = 24;
export const LOGO_MIN = 0.1;
export const LOGO_MAX = 0.3;
export const MARGIN_MAX = 8;

export const DEFAULT_STYLE: QrStyle = {
  margin: 4,
  moduleSize: 10,
  background: '#ffffff',
  foreground: { kind: 'solid', color: '#000000' },
  dotStyle: 'square',
  eyeOuter: { style: 'square', color: '#000000' },
  eyeInner: { style: 'square', color: '#000000' },
  logo: null,
  frame: { style: 'none', text: 'Scan me', textColor: '#ffffff', color: '#000000' },
};

const HEX = /^#[0-9a-f]{6}$/i;

export function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (HEX.test(v)) return v.toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  return fallback;
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.min(hi, Math.max(lo, v));
};

const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

function normalizeFill(f: unknown, fallback: Fill): Fill {
  const x = f as Partial<Fill> | null | undefined;
  if (!x || typeof x !== 'object') return structuredClone(fallback);
  if (x.kind === 'linear' || x.kind === 'radial') {
    const stops = Array.isArray(x.stops) ? x.stops : [];
    const clean = stops
      .map((s) => ({ offset: clamp(s?.offset, 0, 1, 0), color: normalizeHex(s?.color, '#000000') }))
      .sort((a, b) => a.offset - b.offset);
    if (clean.length === 0) return structuredClone(fallback);
    if (clean.length === 1) clean.push({ offset: 1, color: clean[0].color });
    return { kind: x.kind, stops: clean, angle: clamp(x.angle, -360, 360, 0) };
  }
  const color = normalizeHex((x as { color?: unknown }).color, fallback.kind === 'solid' ? fallback.color : '#000000');
  return { kind: 'solid', color };
}

/** Fill in defaults and clamp every field to its allowed range. Never throws. */
export function normalizeStyle(input: Partial<QrStyle> | null | undefined): QrStyle {
  const s = (input ?? {}) as Partial<QrStyle>;
  const d = DEFAULT_STYLE;
  const logo = s.logo && typeof s.logo.href === 'string' && s.logo.href.startsWith('data:image/')
    ? {
        href: s.logo.href,
        size: clamp(s.logo.size, LOGO_MIN, LOGO_MAX, 0.2),
        padding: clamp(s.logo.padding, 0, 4, 1),
      }
    : null;
  const frame = s.frame ?? d.frame;
  return {
    margin: Math.round(clamp(s.margin, 0, MARGIN_MAX, d.margin)),
    moduleSize: clamp(s.moduleSize, 1, 100, d.moduleSize),
    background: normalizeHex(s.background, d.background),
    foreground: normalizeFill(s.foreground, d.foreground),
    dotStyle: oneOf(s.dotStyle, DOT_STYLES, d.dotStyle),
    eyeOuter: {
      style: oneOf(s.eyeOuter?.style, EYE_STYLES, d.eyeOuter.style),
      color: normalizeHex(s.eyeOuter?.color, d.eyeOuter.color),
    },
    eyeInner: {
      style: oneOf(s.eyeInner?.style, EYE_STYLES, d.eyeInner.style),
      color: normalizeHex(s.eyeInner?.color, d.eyeInner.color),
    },
    logo,
    frame: {
      style: oneOf(frame.style, FRAME_STYLES, d.frame.style),
      text: (typeof frame.text === 'string' ? frame.text : d.frame.text).slice(0, CTA_MAX),
      textColor: normalizeHex(frame.textColor, d.frame.textColor),
      color: normalizeHex(frame.color, d.frame.color),
    },
  };
}

/** Every colour a scanner has to see as "dark": the foreground stops plus both eye colours. */
export function foregroundColors(style: QrStyle): string[] {
  const f = style.foreground;
  const fg = f.kind === 'solid' ? [f.color] : f.stops.map((s) => s.color);
  return [...fg, style.eyeOuter.color, style.eyeInner.color];
}
