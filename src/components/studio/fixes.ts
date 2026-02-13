// One-click fixes for scan-test issues. Each mutates the shared studio state.
import { LOGO_BUDGET } from '../../lib/qr/scan/checks';
import { contrastRatio, hexToRgb } from '../../lib/qr/scan/contrast';
import { LOGO_MIN } from '../../lib/qr/options';
import { studio } from './studio.svelte';

const TARGET = 7;

const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Darken a colour step by step (keeping its hue) until it reaches the target contrast. */
export function darken(color: string, background: string, target = TARGET): string {
  if (contrastRatio(color, background) >= target) return color;
  const rgb = hexToRgb(color);
  for (let k = 0.95; k > 0; k -= 0.05) {
    const next = toHex(rgb.map((v) => v * k));
    if (contrastRatio(next, background) >= target) return next;
  }
  return '#000000';
}

export interface Fix {
  label: string;
  apply: () => void;
}

function fixContrast() {
  const s = studio.style;
  // A dark background can't be fixed by darkening: make it white first.
  if (contrastRatio('#000000', s.background) < TARGET) s.background = '#ffffff';
  const bg = s.background;
  const f = s.foreground;
  if (f.kind === 'solid') f.color = darken(f.color, bg);
  else for (const stop of f.stops) stop.color = darken(stop.color, bg);
  s.eyeOuter.color = darken(s.eyeOuter.color, bg);
  s.eyeInner.color = darken(s.eyeInner.color, bg);
}

function shrinkLogo(modules: number) {
  const logo = studio.style.logo;
  if (!logo || modules <= 0) return;
  // The cleared share is ((size * n + 2 * padding) / n)^2; aim 10% under the ECC budget.
  const fit = Math.sqrt(LOGO_BUDGET[studio.ecc] * 0.9) - (2 * logo.padding) / modules;
  logo.size = Math.max(LOGO_MIN, Math.min(logo.size, Math.floor(fit * 100) / 100));
}

/** The fix for an issue id, if there is one. `modules` is the current symbol width. */
export function fixFor(id: string, modules = 0): Fix | null {
  switch (id) {
    case 'low-contrast':
    case 'weak-contrast':
      return { label: 'Use a darker colour', apply: fixContrast };
    case 'inverted':
      return {
        label: 'Swap to dark on light',
        apply: () => {
          studio.style.background = '#ffffff';
          fixContrast();
        },
      };
    case 'logo-low-ecc':
      return { label: 'Raise error correction', apply: () => (studio.ecc = 'H') };
    case 'logo-too-big':
      return { label: 'Shrink the logo', apply: () => shrinkLogo(modules) };
    case 'quiet-zone':
      return { label: 'Use a 4-module margin', apply: () => (studio.style.margin = 4) };
    default:
      return null;
  }
}
