// Shared e2e helpers and the UI contract the specs rely on.
//
// UI contract (WS1 minimal page, WS2 studio, WS3 checker must provide these hooks):
//   Studio
//     [data-testid="qr-preview"] contains the live <svg>
//     [data-testid="scan-badge"]  data-status = checking | pass | warning | fail
//                                 data-revision = integer, +1 each time a scan check completes
//                                 [data-issue-id="<issue id>"] per listed issue
//     type tabs: role=tab named URL, WiFi, vCard, Email, SMS, Location, Event, Text (active panel: role=tabpanel)
//     form fields by label: see FIELD_LABELS
//     style controls by label: 'Foreground colour', 'Background colour', 'Dot style', 'Eye frame style',
//       'Eye centre style', 'Upload logo' (file input), 'Logo size' (range, %), 'Frame', 'Frame text',
//       'Error correction' (select, option values L/M/Q/H), 'PNG size', 'Transparent background', 'PDF page'
//       (selects use the style ids as option values, e.g. 'banner-bottom', 'extra-rounded', 'A4')
//     presets: buttons named after the preset ('Classic', 'Rounded Ink', ...)
//     buttons: 'Download SVG', 'Download PNG', 'Download PDF', 'Reset'
//     ECC auto-raise notice: role=status containing "error correction"
//     mobile: [data-testid="preview-sheet"]
//     footer privacy meter: [data-testid="privacy-meter"]
//   Checker
//     input[type=file] for uploads; button 'Camera' and 'Stop'
//     [data-testid="verdict"] per code found, data-level = static|direct|dynamic|shortener|dead|unknown-short
//       inside: [data-testid="raw-text"] (decoded text, as text), a link to the list entry's source
//     "No QR code found" text when nothing decodes
//     button 'Find out where it goes' -> role=dialog with buttons 'Cancel' and 'Open link'
//     field labelled 'Final address'; link/button 'Make a forever version'
import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, type Decoded } from '../helpers/zxing';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
// Fixture PNGs are generated and committed by WS1 (scripts/make-fixtures.ts).
export function fixture(name: string): string {
  const path = resolve(ROOT, 'tests/fixtures', name);
  if (!existsSync(path)) throw new Error(`fixture ${name} is missing: generate it with scripts/make-fixtures.ts (WS1)`);
  return path;
}

export const TAB_NAMES = {
  url: 'URL',
  wifi: 'WiFi',
  vcard: 'vCard',
  email: 'Email',
  sms: 'SMS',
  geo: 'Location',
  event: 'Event',
  text: 'Text',
} as const;

export const FIELD_LABELS: Record<string, string> = {
  url: 'URL',
  ssid: 'Network name (SSID)',
  password: 'Password',
  encryption: 'Encryption',
  hidden: 'Hidden network',
  first: 'First name',
  last: 'Last name',
  org: 'Organisation',
  title: 'Job title',
  phoneCell: 'Mobile phone',
  phoneWork: 'Work phone',
  email: 'Email',
  to: 'To',
  subject: 'Subject',
  body: 'Body',
  number: 'Phone number',
  message: 'Message',
  lat: 'Latitude',
  lng: 'Longitude',
  summary: 'Title',
  start: 'Start',
  end: 'End',
  timeZone: 'Time zone',
  allDay: 'All day',
  location: 'Location',
  description: 'Description',
  text: 'Text',
};

export const preview = (page: Page) => page.getByTestId('qr-preview').locator('svg').first();
export const badge = (page: Page) => page.getByTestId('scan-badge');
export const panel = (page: Page) => page.getByRole('tabpanel');
// Not scoped to the tab panel: the WS1 minimal page has a URL field but no tabs.
export const urlInput = (page: Page) => page.getByLabel('URL', { exact: true }).first();

/** Collect every request URL the page and its workers make. */
export function trackRequests(page: Page): string[] {
  const urls: string[] = [];
  page.context().on('request', (r) => urls.push(r.url()));
  return urls;
}

/** Requests that left the site's origin (data: and blob: never leave the machine). */
export function foreign(urls: string[], baseURL: string): string[] {
  const origin = new URL(baseURL).origin;
  return urls.filter((u) => !/^(data|blob):/.test(u) && new URL(u).origin !== origin);
}

export async function download(page: Page, trigger: Locator): Promise<Buffer> {
  const [dl] = await Promise.all([page.waitForEvent('download'), trigger.click()]);
  return downloadBuffer(dl);
}

export async function downloadBuffer(dl: Download): Promise<Buffer> {
  const path = await dl.path();
  if (!path) throw new Error(`download failed: ${await dl.failure()}`);
  return readFile(path);
}

export async function decodeDownloadedPng(buf: Buffer): Promise<string[]> {
  return (await decodePng(buf)).map((r) => r.text);
}

/**
 * Render SVG markup to a px-by-px canvas in the page and decode the pixels in node.
 * The canvas comes back as one lossless PNG data URL (a single base64 string), not as
 * Array.from(getImageData) — 4M JSON numbers over CDP took 80 s on a loaded machine.
 */
export async function decodeSvgInPage(page: Page, svg: string, px = 1024): Promise<Decoded[]> {
  const dataUrl = await page.evaluate(
    async ({ svg, px }) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.width = px;
      img.height = px;
      await new Promise((ok, fail) => {
        img.onload = ok;
        img.onerror = fail;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      const w = px;
      const h = Math.round((px * (img.naturalHeight || px)) / (img.naturalWidth || px));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      return canvas.toDataURL('image/png');
    },
    { svg, px },
  );
  return decodePng(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
}

/** Wait for the next completed scan check after `before`, return its status. */
export async function nextScan(page: Page, before: number): Promise<string> {
  const b = badge(page);
  await expect
    .poll(async () => Number(await b.getAttribute('data-revision')), { timeout: 10_000 })
    .toBeGreaterThan(before);
  await expect(b).not.toHaveAttribute('data-status', 'checking', { timeout: 10_000 });
  return (await b.getAttribute('data-status')) ?? '';
}

export async function scanRevision(page: Page): Promise<number> {
  return Number((await badge(page).getAttribute('data-revision')) ?? '0');
}

/** Change something in the studio and return the status of the scan check it caused. */
export async function scanAfter(page: Page, change: () => Promise<void>): Promise<string> {
  const before = await scanRevision(page);
  await change();
  return nextScan(page, before);
}

export async function selectTab(page: Page, type: keyof typeof TAB_NAMES) {
  const tab = page.getByRole('tab', { name: TAB_NAMES[type], exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

/** Fill a type form from a buildPayload field map. */
export async function fillFields(page: Page, fields: Record<string, string | boolean>) {
  const p = panel(page);
  for (const [name, value] of Object.entries(fields)) {
    const label = FIELD_LABELS[name];
    if (!label) throw new Error(`no label for field ${name}`);
    const control = p.getByLabel(label, { exact: true });
    if (typeof value === 'boolean') {
      await control.setChecked(value);
      continue;
    }
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') await control.selectOption(value);
    else await control.fill(value);
  }
}

export function fixtureBase64(name: string): string {
  return readFileSync(fixture(name)).toString('base64');
}

/** Read the landing-page and redirect-domain data the specs need. */
export function redirectEntries(): { domain: string; vendor: string; kind: string; source: string }[] {
  return JSON.parse(readFileSync(resolve(ROOT, 'src/data/redirect-domains.json'), 'utf8')).entries;
}

export const LANDING_PAGES: { slug: string; tab?: keyof typeof TAB_NAMES }[] = [
  { slug: 'url-qr-code-generator', tab: 'url' },
  { slug: 'wifi-qr-code-generator', tab: 'wifi' },
  { slug: 'vcard-qr-code-generator', tab: 'vcard' },
  { slug: 'email-qr-code-generator', tab: 'email' },
  { slug: 'sms-qr-code-generator', tab: 'sms' },
  { slug: 'location-qr-code-generator', tab: 'geo' },
  { slug: 'event-qr-code-generator', tab: 'event' },
  { slug: 'text-qr-code-generator', tab: 'text' },
  { slug: 'qr-code-that-never-expires' },
  { slug: 'qr-code-with-logo' },
  { slug: 'dynamic-vs-static-qr-codes' },
];

export const CHECKER_PATH = '/check-if-qr-code-will-expire/';

/** All page paths listed in the sitemap, mapped onto the test server (the sitemap uses SITE_URL). */
export async function sitemapPaths(page: Page): Promise<string[]> {
  const index = await page.request.get('/sitemap-index.xml');
  expect(index.status()).toBe(200);
  const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const paths: string[] = [];
  for (const child of locs(await index.text())) {
    const res = await page.request.get(new URL(child).pathname);
    expect(res.status(), child).toBe(200);
    for (const loc of locs(await res.text())) paths.push(new URL(loc).pathname);
  }
  return paths;
}

/** Upload a fixture to the checker and wait until results or the empty state show. */
export async function checkerUpload(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles(typeof file === 'string' ? fixture(file) : file);
  await expect(
    page.getByTestId('verdict').first().or(page.getByText('No QR code found')),
  ).toBeVisible({ timeout: 15_000 });
}
