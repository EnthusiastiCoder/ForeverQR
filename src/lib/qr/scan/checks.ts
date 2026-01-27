// Static scannability checks plus the decode-test verdict.
import type { Ecc, Matrix } from '../encode';
import { foregroundColors, type QrStyle } from '../options';
import { logoGeometry } from '../render/logo';
import { luminance, worstContrast } from './contrast';

export type Severity = 'error' | 'warning' | 'info';
export interface Issue {
  id: string;
  severity: Severity;
  message: string;
}

export interface DecodeResults {
  expected: string;
  large: { text: string }[]; // 1024 px render
  small: { text: string }[]; // 160 px render
  transparent?: boolean;
}

/** Share of the symbol area (margin excluded) the excavated logo box may take, per ECC. */
export const LOGO_BUDGET: Record<Ecc, number> = { L: 0.03, M: 0.08, Q: 0.12, H: 0.18 };

const fmt = (n: number) => n.toFixed(2);

export function assessScannability(style: QrStyle, matrix: Matrix, decode?: DecodeResults | null): Issue[] {
  const issues: Issue[] = [];
  const colors = foregroundColors(style);
  const ratio = worstContrast(colors, style.background);
  if (ratio < 3) {
    issues.push({
      id: 'low-contrast',
      severity: 'error',
      message: `Contrast is too low (${fmt(ratio)}:1). Use a darker colour or a lighter background.`,
    });
  } else if (ratio < 4.5) {
    issues.push({
      id: 'weak-contrast',
      severity: 'warning',
      message: `Contrast is weak (${fmt(ratio)}:1). Some phones may struggle; aim for 4.5:1 or more.`,
    });
  }
  const bgLum = luminance(style.background);
  if (colors.some((c) => luminance(c) > bgLum)) {
    issues.push({
      id: 'inverted',
      severity: 'warning',
      message: "The code is lighter than its background. Some scanners can't read light-on-dark codes.",
    });
  }

  if (style.logo) {
    if (matrix.ecc === 'L' || matrix.ecc === 'M') {
      issues.push({
        id: 'logo-low-ecc',
        severity: 'warning',
        message: 'A logo hides part of the code. Raise error correction to Q or H.',
      });
    }
    const g = logoGeometry(matrix, style);
    const symbol = matrix.size * style.moduleSize;
    const share = (g.clear.w * g.clear.h) / (symbol * symbol);
    const budget = LOGO_BUDGET[matrix.ecc];
    if (share > budget) {
      issues.push({
        id: 'logo-too-big',
        severity: share > 1.5 * budget ? 'error' : 'warning',
        message: `The logo covers ${Math.round(share * 100)}% of the code; at level ${matrix.ecc} keep it under ${Math.round(budget * 100)}%.`,
      });
    }
  }

  if (style.margin < 2) {
    issues.push({ id: 'quiet-zone', severity: 'error', message: 'The margin is too small to scan. Use at least 4 modules.' });
  } else if (style.margin < 4) {
    issues.push({ id: 'quiet-zone', severity: 'warning', message: 'The margin is below the recommended 4 modules.' });
  }

  if (matrix.version >= 15) {
    issues.push({
      id: 'dense',
      severity: 'warning',
      message: 'This code is very dense. Shorten the content or print it larger.',
    });
  }

  if (decode) {
    if (decode.transparent) {
      issues.push({ id: 'transparent-bg', severity: 'info', message: 'Transparent background: put it on a light surface.' });
    }
    const ok = (list: { text: string }[]) => list.length > 0 && list.every((r) => r.text === decode.expected);
    if (!ok(decode.large)) {
      issues.push({
        id: 'decode-fail',
        severity: 'error',
        message:
          decode.large.length === 0
            ? 'Our scan test could not read this code.'
            : 'Our scan test read different content than you entered.',
      });
    } else if (!ok(decode.small)) {
      issues.push({
        id: 'decode-small-fail',
        severity: 'warning',
        message: 'Reads at full size but fails when small. Print it larger or simplify the style.',
      });
    } else {
      issues.push({ id: 'decode-pass', severity: 'info', message: 'Scan test passed: the code reads back exactly.' });
    }
  }
  return issues;
}
