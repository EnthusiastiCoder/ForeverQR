// The studio's shared state: one $state object every component reads and writes, saved to
// localStorage (key fqr:v1). URL parameters (?type=, ?value=) override the saved state.
import type { Ecc } from '../../lib/qr/encode';
import { DEFAULT_STYLE, ECC_LEVELS, normalizeStyle, type QrStyle } from '../../lib/qr/options';
import { PAYLOAD_TYPES, localTimeZone, type FieldsByType, type PayloadType } from '../../lib/qr/payloads';

export const STORAGE_KEY = 'fqr:v1';
/** Logos above this size (as a data URL, about 1 MB of image) are not saved. */
const MAX_SAVED_LOGO = 1_400_000;

export type PdfPage = 'fit' | 'A4' | 'Letter';

export interface ExportOptions {
  pngSize: number;
  transparent: boolean;
  pdfPage: PdfPage;
  pdfMm: number;
}

export interface StudioState {
  type: PayloadType;
  fields: FieldsByType;
  style: QrStyle;
  ecc: Ecc;
  exp: ExportOptions;
}

function safeZone(): string {
  try {
    return localTimeZone();
  } catch {
    return 'UTC';
  }
}

export function defaultFields(): FieldsByType {
  return {
    url: { url: '' },
    wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
    vcard: {
      first: '', last: '', org: '', title: '', phoneCell: '', phoneWork: '', email: '', url: '',
      street: '', city: '', region: '', zip: '', country: '', note: '',
    },
    email: { to: '', subject: '', body: '' },
    sms: { number: '', message: '' },
    geo: { lat: '', lng: '' },
    event: { summary: '', start: '', end: '', timeZone: safeZone(), allDay: false, location: '', description: '' },
    text: { text: '' },
  };
}

export function defaultState(): StudioState {
  return {
    type: 'url',
    fields: defaultFields(),
    style: structuredClone(DEFAULT_STYLE),
    ecc: 'M',
    exp: { pngSize: 1024, transparent: false, pdfPage: 'A4', pdfMm: 60 },
  };
}

export const studio: StudioState = $state(defaultState());

/** UI-only flags that are never saved. */
export const ui = $state({
  /** Shown after a logo upload raised error correction. */
  eccRaised: false,
  /** True once the saved state and URL parameters were applied (client only). */
  loaded: false,
  /** On a landing page the preset type is not saved: this is the type to store instead. */
  savedType: null as PayloadType | null,
});

const clampInt = (v: unknown, lo: number, hi: number, d: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : d;
  return Math.min(hi, Math.max(lo, n));
};

/** Merge a saved (untrusted) object over the defaults, field by field. */
function revive(raw: unknown): StudioState {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const s = raw as Partial<StudioState>;
  const type = PAYLOAD_TYPES.includes(s.type as PayloadType) ? (s.type as PayloadType) : d.type;
  const fields = d.fields as unknown as Record<string, Record<string, unknown>>;
  const saved = (s.fields ?? {}) as Record<string, Record<string, unknown>>;
  for (const t of Object.keys(fields)) {
    for (const k of Object.keys(fields[t])) {
      const v = saved[t]?.[k];
      if (typeof v === typeof fields[t][k]) fields[t][k] = v;
    }
  }
  const e = (s.exp ?? {}) as Partial<ExportOptions>;
  return {
    type,
    fields: d.fields,
    style: normalizeStyle(s.style ?? d.style),
    ecc: ECC_LEVELS.includes(s.ecc as Ecc) ? (s.ecc as Ecc) : d.ecc,
    exp: {
      pngSize: clampInt(e.pngSize, 256, 4096, d.exp.pngSize),
      transparent: typeof e.transparent === 'boolean' ? e.transparent : d.exp.transparent,
      pdfPage: (['fit', 'A4', 'Letter'] as const).includes(e.pdfPage as PdfPage) ? (e.pdfPage as PdfPage) : d.exp.pdfPage,
      pdfMm: clampInt(e.pdfMm, 10, 500, d.exp.pdfMm),
    },
  };
}

function assign(next: StudioState) {
  studio.type = next.type;
  studio.fields = next.fields;
  studio.style = next.style;
  studio.ecc = next.ecc;
  studio.exp = next.exp;
}

/** Apply the saved state, then the URL parameters. Call once on the client. */
export function loadState(search: string = location.search) {
  let saved: unknown = null;
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) saved = JSON.parse(text);
  } catch {
    saved = null;
  }
  const next = revive(saved);
  const params = new URLSearchParams(search);
  const type = params.get('type');
  if (type && PAYLOAD_TYPES.includes(type as PayloadType)) next.type = type as PayloadType;
  const value = params.get('value');
  if (value !== null && next.type === 'url') next.fields.url.url = value;
  else if (value !== null && next.type === 'text') next.fields.text.text = value;
  assign(next);
  ui.loaded = true;
}

export function saveState() {
  const snap = $state.snapshot(studio) as StudioState;
  if (ui.savedType) snap.type = ui.savedType;
  if (snap.style.logo && snap.style.logo.href.length > MAX_SAVED_LOGO) snap.style.logo = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // Quota or privacy mode: keep working without saving.
  }
}

export function resetState() {
  assign(defaultState());
  ui.eccRaised = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Set the solid foreground colour; eye colours that matched the old one follow it. */
export function setForeground(color: string) {
  const f = studio.style.foreground;
  const old = f.kind === 'solid' ? f.color : f.stops[0].color;
  if (f.kind === 'solid') f.color = color;
  else f.stops[0].color = color;
  if (studio.style.eyeOuter.color === old) studio.style.eyeOuter.color = color;
  if (studio.style.eyeInner.color === old) studio.style.eyeInner.color = color;
}

export function setEcc(ecc: Ecc) {
  studio.ecc = ecc;
}
