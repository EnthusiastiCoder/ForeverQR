// Exports: SVG, PNG, PDF (pdf-lib loaded on first use) and PNG to the clipboard.
import { sceneToSvg } from '../../lib/qr/render/svg';
import { sceneToPng } from '../../lib/qr/render/png';
import type { ExportOptions } from './studio.svelte';
import type { Rendered } from './engine.svelte';

const BASENAME = 'qr-code';

function save(blob: Blob, ext: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${BASENAME}.${ext}`;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadSvg(r: Rendered, exp: ExportOptions) {
  const svg = sceneToSvg(r.scene, { transparent: exp.transparent });
  save(new Blob([svg], { type: 'image/svg+xml' }), 'svg');
}

const pngPx = (exp: ExportOptions) => Math.min(4096, Math.max(256, Math.round(exp.pngSize) || 1024));

export async function downloadPng(r: Rendered, exp: ExportOptions) {
  save(await sceneToPng(r.scene, pngPx(exp), { transparent: exp.transparent }), 'png');
}

export async function downloadPdf(r: Rendered, exp: ExportOptions) {
  const { sceneToPdf } = await import('../../lib/qr/render/pdf');
  const bytes = await sceneToPdf(r.scene, { page: exp.pdfPage, sizeMm: exp.pdfMm });
  save(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'pdf');
}

/** Copy a PNG to the clipboard. Resolves false when the browser does not allow it. */
export async function copyPng(r: Rendered, exp: ExportOptions): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false;
  try {
    // Pass the promise straight in so Safari keeps the user gesture.
    const blob = sceneToPng(r.scene, Math.min(pngPx(exp), 2048), { transparent: exp.transparent });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
