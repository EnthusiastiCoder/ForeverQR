// decodeImage: main-thread wrapper around the decode worker. The worker (and with it
// zxing-wasm) is created lazily on the first call.
import type { DecodeRequest, DecodeResponse } from './decode.worker';

export interface DecodedCode {
  text: string;
  format: string;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: DecodedCode[]) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./decode.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (ev: MessageEvent<DecodeResponse>) => {
    const job = pending.get(ev.data.id);
    if (!job) return;
    pending.delete(ev.data.id);
    if (ev.data.error !== undefined) job.reject(new Error(ev.data.error));
    else job.resolve(ev.data.results ?? []);
  };
  worker.onerror = (ev) => {
    const err = new Error(ev.message || 'The decoder failed to start');
    for (const job of pending.values()) job.reject(err);
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Every QR code found in the image, decoded in a worker. */
export function decodeImage(image: ImageData | Blob): Promise<DecodedCode[]> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, image } satisfies DecodeRequest);
  });
}
