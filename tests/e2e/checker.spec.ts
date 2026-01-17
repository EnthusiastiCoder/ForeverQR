// WS3 cases #59-#65: the "will this QR die?" checker.
import { expect, test, type Page } from '@playwright/test';
import { makeQrPng } from '../helpers/zxing';
import {
  CHECKER_PATH,
  checkerUpload,
  fixtureBase64,
  foreign,
  redirectEntries,
  trackRequests,
  urlInput,
} from './support';

const verdicts = (page: Page) => page.getByTestId('verdict');

function vendorEntry() {
  const list = redirectEntries();
  const e = list.find((x) => x.domain === 'qrco.de') ?? list.find((x) => x.kind === 'dynamic-qr');
  if (!e) throw new Error('no dynamic-qr entry in src/data/redirect-domains.json');
  return e;
}

const UPLOADS: { file: string; level?: string; count?: number; none?: boolean }[] = [
  { file: 'vendor-qrco.png', level: 'dynamic' },
  { file: 'shortener-bitly.png', level: 'shortener' },
  { file: 'direct.png', level: 'direct' },
  { file: 'wifi.png', level: 'static' },
  { file: 'two-codes.png', count: 2 },
  { file: 'no-qr.png', none: true },
];

test.describe('checker uploads', () => {
  test('#59 #60 each fixture gives the right verdict, and no request leaves the site', async ({ page, baseURL }) => {
    const urls = trackRequests(page);
    await page.goto(CHECKER_PATH);

    for (const u of UPLOADS) {
      await checkerUpload(page, u.file);
      if (u.none) {
        await expect(page.getByText('No QR code found')).toBeVisible();
        await expect(verdicts(page)).toHaveCount(0);
        continue;
      }
      if (u.count) {
        await expect(verdicts(page)).toHaveCount(u.count);
        continue;
      }
      await expect(verdicts(page)).toHaveCount(1);
      const card = verdicts(page).first();
      await expect(card, u.file).toHaveAttribute('data-level', u.level!);
      if (u.level === 'dynamic') {
        const v = vendorEntry();
        await expect(card).toContainText(v.vendor);
        await expect(card.locator(`a[href="${v.source}"]`)).toBeVisible();
      }
      if (u.level === 'shortener') {
        const bitly = redirectEntries().find((x) => x.domain === 'bit.ly')!;
        await expect(card).toContainText(bitly.vendor);
        await expect(card.locator(`a[href="${bitly.source}"]`)).toBeVisible();
      }
    }

    // #60: every request went to the site itself; none to the decoded hosts.
    expect(foreign(urls, baseURL!)).toEqual([]);
    for (const host of [vendorEntry().domain, 'bit.ly', 'example.com']) {
      expect(urls.filter((u) => !/^(data|blob):/.test(u) && new URL(u).hostname.endsWith(host))).toEqual([]);
    }
  });

  test('#61 pasting an image decodes it', async ({ page }) => {
    await page.goto(CHECKER_PATH);
    await page.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'pasted.png', { type: 'image/png' }));
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, fixtureBase64('direct.png'));
    await expect(verdicts(page)).toHaveCount(1, { timeout: 15_000 });
    await expect(verdicts(page).first()).toHaveAttribute('data-level', 'direct');
  });

  test('#65 decoded markup is shown as literal text', async ({ page }) => {
    const payload = '<img src=x onerror=alert(1)>';
    let dialogs = 0;
    page.on('dialog', async (d) => {
      dialogs++;
      await d.dismiss();
    });
    await page.goto(CHECKER_PATH);
    const before = await page.locator('img[src="x"]').count();
    await checkerUpload(page, { name: 'xss.png', mimeType: 'image/png', buffer: await makeQrPng(payload) });
    const card = verdicts(page).first();
    await expect(card.getByTestId('raw-text')).toHaveText(payload);
    await page.waitForTimeout(500);
    expect(dialogs).toBe(0);
    expect(await page.locator('img[src="x"]').count()).toBe(before);
  });
});

test.describe('camera', () => {
  async function mockCamera(page: Page, mode: 'stream' | 'deny') {
    await page.addInitScript(
      ({ b64, mode }) => {
        const w = window as unknown as { __fqrStreams: MediaStream[] };
        w.__fqrStreams = [];
        const md = navigator.mediaDevices ?? ({} as MediaDevices);
        Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true });
        md.getUserMedia = async () => {
          if (mode === 'deny') throw new DOMException('Permission denied', 'NotAllowedError');
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 640;
          const ctx = canvas.getContext('2d')!;
          const draw = () => {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, 640, 640);
            ctx.drawImage(img, 70, 70, 500, 500);
          };
          draw();
          setInterval(draw, 50);
          const stream = canvas.captureStream(15);
          w.__fqrStreams.push(stream);
          return stream;
        };
      },
      { b64: fixtureBase64('direct.png'), mode },
    );
  }

  test('#62 camera mode shows the direct verdict and stops every track', async ({ page }) => {
    await mockCamera(page, 'stream');
    await page.goto(CHECKER_PATH);
    await page.getByRole('button', { name: 'Camera' }).click();
    await expect(verdicts(page).first()).toHaveAttribute('data-level', 'direct', { timeout: 15_000 });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const streams = (window as unknown as { __fqrStreams: MediaStream[] }).__fqrStreams;
          const tracks = streams.flatMap((s) => s.getTracks());
          return tracks.length > 0 && tracks.every((t) => t.readyState === 'ended');
        }),
      )
      .toBe(true);
  });

  test('#62 denied camera permission shows the permission message', async ({ page }) => {
    await mockCamera(page, 'deny');
    await page.goto(CHECKER_PATH);
    await page.getByRole('button', { name: 'Camera' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /permission/i })).toBeVisible();
  });
});

test.describe('opt-in and forever version', () => {
  test('#63 the opt-in dialog explains, Cancel opens nothing, Open link opens the decoded URL', async ({ page, context }) => {
    const v = vendorEntry();
    const pageHits: string[] = [];
    const popupHits: string[] = [];
    // No real external request: anything to the decoded host is answered locally.
    await context.route(
      (url) => url.hostname === v.domain || url.hostname.endsWith(`.${v.domain}`),
      async (route) => {
        const from = route.request().frame()?.page();
        (from === page ? pageHits : popupHits).push(route.request().url());
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' });
      },
    );

    await page.goto(CHECKER_PATH);
    await checkerUpload(page, 'vendor-qrco.png');
    const card = verdicts(page).first();
    await expect(card).toHaveAttribute('data-level', 'dynamic');
    const decoded = (await card.getByTestId('raw-text').textContent())!.trim();
    const host = new URL(decoded).host;

    await card.getByRole('button', { name: 'Find out where it goes' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(host);
    await expect(dialog).toContainText('IP address');
    await expect(dialog).toContainText(/scan/i);
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    let popups = 0;
    context.on('page', () => popups++);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await page.waitForTimeout(1000);
    expect(popups).toBe(0);

    await card.getByRole('button', { name: 'Find out where it goes' }).click();
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('dialog').getByRole('button', { name: 'Open link' }).click(),
    ]);
    await popup.waitForLoadState();
    expect(popup.url()).toBe(decoded);
    expect(pageHits).toEqual([]);
  });

  test('#64 a final address re-classifies, and "Make a forever version" prefills the studio', async ({ page }) => {
    await page.goto(CHECKER_PATH);
    await checkerUpload(page, 'vendor-qrco.png');
    const card = verdicts(page).first();
    await expect(card).toHaveAttribute('data-level', 'dynamic');
    await card.getByLabel('Final address').fill('https://example.com/real');
    await expect(page.getByTestId('verdict').filter({ hasText: 'example.com' }).last()).toHaveAttribute(
      'data-level',
      'direct',
    );
    await card.getByRole('link', { name: 'Make a forever version' }).or(card.getByRole('button', { name: 'Make a forever version' })).click();
    await expect(page).toHaveURL(/\/\?type=url&value=https%3A%2F%2Fexample\.com%2Freal$/);
    await expect(urlInput(page)).toHaveValue('https://example.com/real');
  });
});
