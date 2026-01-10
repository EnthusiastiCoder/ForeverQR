// Test-only QR decoder/encoder backed by zxing-wasm, loaded from the local node_modules
// .wasm files (never from a CDN). Used by unit and e2e tests to check that what the app
// produces really scans.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import { prepareZXingModule as prepareReader, readBarcodes } from 'zxing-wasm/reader';
import { prepareZXingModule as prepareWriter, writeBarcode } from 'zxing-wasm/writer';

const require = createRequire(import.meta.url);

let readerReady = false;
let writerReady = false;

function wasmBinary(spec: string): ArrayBuffer {
  const buf = readFileSync(require.resolve(spec));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function ensureReader() {
  if (readerReady) return;
  prepareReader({ overrides: { wasmBinary: wasmBinary('zxing-wasm/reader/zxing_reader.wasm') } });
  readerReady = true;
}

function ensureWriter() {
  if (writerReady) return;
  prepareWriter({ overrides: { wasmBinary: wasmBinary('zxing-wasm/writer/zxing_writer.wasm') } });
  writerReady = true;
}

export interface Rgba {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Decoded {
  text: string;
  bytes: Uint8Array;
  format: string;
}

/** Decode every QR code in an RGBA image. */
export async function decodeRgba(img: Rgba): Promise<Decoded[]> {
  ensureReader();
  const results = await readBarcodes(img as ImageData, {
    formats: ['QRCode'],
    tryHarder: true,
    maxNumberOfSymbols: 8,
  });
  return results
    .filter((r) => r.isValid)
    .map((r) => ({ text: r.text, bytes: new Uint8Array(r.bytes), format: r.format }));
}

/** Read a PNG file buffer into RGBA. */
export function pngToRgba(png: Buffer | Uint8Array): Rgba {
  const parsed = PNG.sync.read(Buffer.from(png));
  return { data: new Uint8ClampedArray(parsed.data), width: parsed.width, height: parsed.height };
}

/** Decode every QR code in a PNG file buffer. Transparent pixels are composited on white. */
export async function decodePng(png: Buffer | Uint8Array): Promise<Decoded[]> {
  const img = pngToRgba(png);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    d[i] = Math.round(d[i] * a + 255 * (1 - a));
    d[i + 1] = Math.round(d[i + 1] * a + 255 * (1 - a));
    d[i + 2] = Math.round(d[i + 2] * a + 255 * (1 - a));
    d[i + 3] = 255;
  }
  return decodeRgba(img);
}

/** Make a plain QR PNG for arbitrary text with zxing's own writer (independent of our encoder). */
export async function makeQrPng(text: string): Promise<Buffer> {
  ensureWriter();
  const result = await writeBarcode(text, { format: 'QRCode', scale: 8 });
  if (result.error || !result.image) throw new Error(`zxing writer failed: ${result.error}`);
  return Buffer.from(await result.image.arrayBuffer());
}
