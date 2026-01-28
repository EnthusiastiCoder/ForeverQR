// Six starting looks for the studio. Every preset passes the static checks with no error.
import type { Ecc } from './encode';
import { DEFAULT_STYLE, type QrStyle } from './options';

export interface Preset {
  name: string;
  style: QrStyle;
  ecc?: Ecc;
}

const base = (): QrStyle => structuredClone(DEFAULT_STYLE);

const make = (patch: Partial<QrStyle>): QrStyle => ({ ...base(), ...patch });

export const PRESETS: Preset[] = [
  { name: 'Classic', style: base() },
  {
    name: 'Rounded Ink',
    style: make({
      foreground: { kind: 'solid', color: '#1f2937' },
      dotStyle: 'rounded',
      eyeOuter: { style: 'rounded', color: '#1f2937' },
      eyeInner: { style: 'rounded', color: '#1f2937' },
    }),
  },
  {
    name: 'Dot Pop',
    style: make({
      foreground: {
        kind: 'linear',
        angle: 45,
        stops: [
          { offset: 0, color: '#0f172a' },
          { offset: 1, color: '#4c1d95' },
        ],
      },
      dotStyle: 'dots',
      eyeOuter: { style: 'circle', color: '#0f172a' },
      eyeInner: { style: 'circle', color: '#4c1d95' },
    }),
  },
  {
    name: 'Leaf',
    style: make({
      foreground: { kind: 'solid', color: '#14532d' },
      dotStyle: 'classy-rounded',
      eyeOuter: { style: 'leaf', color: '#14532d' },
      eyeInner: { style: 'leaf', color: '#166534' },
    }),
  },
  {
    name: 'Framed Blue',
    style: make({
      foreground: { kind: 'solid', color: '#1e3a8a' },
      dotStyle: 'square',
      eyeOuter: { style: 'square', color: '#1e3a8a' },
      eyeInner: { style: 'square', color: '#1e3a8a' },
      frame: { style: 'banner-bottom', text: 'Scan me', textColor: '#ffffff', color: '#1d4ed8' },
    }),
  },
  {
    name: 'Minimal Card',
    style: make({
      foreground: { kind: 'solid', color: '#111827' },
      dotStyle: 'extra-rounded',
      eyeOuter: { style: 'rounded', color: '#111827' },
      eyeInner: { style: 'circle', color: '#111827' },
      frame: { style: 'card', text: 'Scan me', textColor: '#ffffff', color: '#111827' },
    }),
  },
];
