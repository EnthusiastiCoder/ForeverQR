// A plain module-to-pixel rasteriser for the encoder's Matrix: black squares on white,
// with a quiet zone. Independent of the app's renderer, so encode() can be tested alone.
import type { Rgba } from './zxing';

export interface MatrixLike {
  size: number;
  isDark(row: number, col: number): boolean;
}

export function rasterize(matrix: MatrixLike, scale = 8, margin = 4): Rgba {
  const n = (matrix.size + 2 * margin) * scale;
  const data = new Uint8ClampedArray(n * n * 4).fill(255);
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (!matrix.isDark(r, c)) continue;
      for (let y = 0; y < scale; y++) {
        const py = (r + margin) * scale + y;
        for (let x = 0; x < scale; x++) {
          const i = (py * n + (c + margin) * scale + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  return { data, width: n, height: n };
}
