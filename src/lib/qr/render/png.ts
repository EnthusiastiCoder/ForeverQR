// sceneToPng (browser only): SVG blob, then <img>, then a canvas, then a PNG blob.
import type { Scene } from './scene';
import { sceneToSvg } from './svg';

export interface PngOptions {
  transparent?: boolean;
}

/** Draw the scene `px` pixels wide; the height keeps the scene's aspect ratio. */
export async function sceneToCanvas(scene: Scene, px: number, opts: PngOptions = {}): Promise<HTMLCanvasElement> {
  const svg = sceneToSvg(scene, { transparent: opts.transparent });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not render the QR code image'));
      img.src = url;
    });
    const w = Math.max(1, Math.round(px));
    const h = Math.max(1, Math.round((w * scene.height) / scene.width));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function sceneToPng(scene: Scene, px: number, opts: PngOptions = {}): Promise<Blob> {
  const canvas = await sceneToCanvas(scene, px, opts);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the PNG');
  return blob;
}

/** Pixels of the scene at `px` wide, composited on white (for the decode test). */
export async function sceneToImageData(scene: Scene, px: number): Promise<ImageData> {
  const canvas = await sceneToCanvas(scene, px);
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
}
