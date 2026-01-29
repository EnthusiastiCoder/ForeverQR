// Decode worker: zxing-wasm (reader build) with the .wasm self-hosted next to the app.
// It never fetches from a CDN: locateFile points at the bundled asset URL.
/// <reference lib="webworker" />
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
});

export interface DecodeRequest {
  id: number;
  image: ImageData | Blob;
}

export interface DecodeResponse {
  id: number;
  results?: { text: string; format: string }[];
  error?: string;
}

self.onmessage = async (ev: MessageEvent<DecodeRequest>) => {
  const { id, image } = ev.data;
  try {
    const found = await readBarcodes(image, { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 8 });
    const results = found.filter((r) => r.isValid).map((r) => ({ text: r.text, format: r.format }));
    (self as unknown as Worker).postMessage({ id, results } satisfies DecodeResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String((err as Error)?.message ?? err) } satisfies DecodeResponse);
  }
};
