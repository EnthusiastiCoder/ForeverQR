// The render and scan-test pipeline. Every state change re-renders the preview at once
// (in-flight renders are superseded) and schedules a debounced scan test of that state.
import { CapacityError, encode, type Matrix } from '../../lib/qr/encode';
import type { QrStyle } from '../../lib/qr/options';
import { buildPayload } from '../../lib/qr/payloads';
import { buildScene, type Scene } from '../../lib/qr/render/scene';
import { sceneToSvg } from '../../lib/qr/render/svg';
import { assessScannability, type Issue } from '../../lib/qr/scan/checks';
import type { StudioState } from './studio.svelte';

export type ScanStatus = 'checking' | 'pass' | 'warning' | 'fail';

export interface Rendered {
  scene: Scene;
  matrix: Matrix;
  text: string;
  style: QrStyle;
}

export const out = $state({
  svg: '',
  /** Inline error for the content form (empty when the content is valid). */
  error: '',
  /** True when there is no content yet (shows the placeholder, no error). */
  empty: true,
  ready: false,
  status: 'checking' as ScanStatus,
  revision: 0,
  issues: [] as Issue[],
  version: 0,
  modules: 0,
});

let seq = 0;
let latest: Promise<Rendered | null> = Promise.resolve(null);
let scanTimer: ReturnType<typeof setTimeout> | undefined;

const SCAN_DELAY = 300;

function isEmpty(state: StudioState): boolean {
  const f = state.fields[state.type] as unknown as Record<string, unknown>;
  return !Object.entries(f).some(
    ([k, v]) => typeof v === 'string' && v.trim() !== '' && k !== 'timeZone' && k !== 'encryption',
  );
}

/** Render this state now; schedule its scan test. `state` must be a plain snapshot. */
export function update(state: StudioState) {
  const mine = ++seq;
  out.status = 'checking';
  clearTimeout(scanTimer);

  if (isEmpty(state)) {
    out.empty = true;
    out.error = '';
    out.ready = false;
    out.issues = [];
    latest = Promise.resolve(null);
    return;
  }
  out.empty = false;

  const payload = buildPayload(state.type, state.fields[state.type] as never);
  if ('error' in payload) {
    out.error = payload.error;
    out.ready = false;
    out.issues = [];
    latest = Promise.resolve(null);
    return;
  }
  let matrix: Matrix;
  try {
    matrix = encode(payload.text, state.ecc);
  } catch (err) {
    out.error = err instanceof CapacityError ? err.message : 'This content cannot be encoded.';
    out.ready = false;
    out.issues = [];
    latest = Promise.resolve(null);
    return;
  }
  const style = state.style;
  const job = buildScene(matrix, style).then(
    (scene): Rendered | null => {
      if (mine !== seq) return null;
      out.svg = sceneToSvg(scene, { transparent: false });
      out.error = '';
      out.ready = true;
      out.version = matrix.version;
      out.modules = matrix.size;
      return { scene, matrix, text: payload.text, style };
    },
    (err): null => {
      if (mine === seq) {
        out.error = (err as Error)?.message || 'Rendering failed.';
        out.ready = false;
      }
      return null;
    },
  );
  latest = job;
  scanTimer = setTimeout(() => void scan(job, mine, state.exp.transparent), SCAN_DELAY);
}

/** The render of the current state, once it has finished (null when there is nothing to export). */
export async function current(): Promise<Rendered | null> {
  // A newer update may replace `latest` while we wait; follow it until it settles.
  for (;;) {
    const p = latest;
    const r = await p;
    if (p === latest) return r;
  }
}

async function scan(job: Promise<Rendered | null>, mine: number, transparent: boolean) {
  const r = await job;
  if (!r || mine !== seq) return;
  let issues: Issue[];
  try {
    const [{ sceneToImageData }, { decodeImage }] = await Promise.all([
      import('../../lib/qr/render/png'),
      import('../../lib/qr/scan/decode'),
    ]);
    const [bigImg, smallImg] = await Promise.all([sceneToImageData(r.scene, 1024), sceneToImageData(r.scene, 200)]);
    if (mine !== seq) return;
    const [large, small] = await Promise.all([decodeImage(bigImg), decodeImage(smallImg)]);
    issues = assessScannability(r.style, r.matrix, { expected: r.text, large, small, transparent });
  } catch {
    issues = assessScannability(r.style, r.matrix, { expected: r.text, large: [], small: [], transparent });
  }
  if (mine !== seq) return;
  out.issues = issues;
  out.status = issues.some((i) => i.severity === 'error')
    ? 'fail'
    : issues.some((i) => i.severity === 'warning')
      ? 'warning'
      : 'pass';
  out.revision++;
}
