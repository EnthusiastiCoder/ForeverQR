// QR matrix encoder: qrcode-generator in Byte mode with UTF-8 text. We render ourselves.
import qrcode from 'qrcode-generator';

export type Ecc = 'L' | 'M' | 'Q' | 'H';

export interface Matrix {
  size: number;
  version: number;
  ecc: Ecc;
  isDark(row: number, col: number): boolean;
}

/** Byte-mode capacity at version 40, per ECC level. */
export const MAX_BYTES: Record<Ecc, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export class CapacityError extends Error {
  readonly maxBytes: number;
  readonly bytes: number;
  constructor(bytes: number, maxBytes: number) {
    super(`Too much content for a QR code: ${bytes} bytes, the limit is ${maxBytes} at this error correction level.`);
    this.name = 'CapacityError';
    this.bytes = bytes;
    this.maxBytes = maxBytes;
  }
}

const utf8 = new TextEncoder();

// Byte mode reads the text through stringToBytes: make it UTF-8 instead of Latin-1.
(qrcode as unknown as { stringToBytes: (s: string) => number[] }).stringToBytes = (s: string) =>
  Array.from(utf8.encode(s));

export function byteLength(text: string): number {
  return utf8.encode(text).length;
}

export function encode(text: string, ecc: Ecc): Matrix {
  const bytes = byteLength(text);
  const max = MAX_BYTES[ecc];
  if (max === undefined) throw new RangeError(`Unknown error correction level: ${ecc}`);
  if (bytes > max) throw new CapacityError(bytes, max);
  const qr = qrcode(0, ecc);
  qr.addData(text, 'Byte');
  try {
    qr.make();
  } catch {
    throw new CapacityError(bytes, max);
  }
  const size = qr.getModuleCount();
  // Copy into a flat array so lookups are cheap and the matrix is immutable.
  const cells = new Uint8Array(size * size);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells[r * size + c] = qr.isDark(r, c) ? 1 : 0;
  return {
    size,
    version: (size - 17) / 4,
    ecc,
    isDark: (row, col) => row >= 0 && col >= 0 && row < size && col < size && cells[row * size + col] === 1,
  };
}
