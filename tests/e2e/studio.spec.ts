// WS2 cases #39-#50: the studio.
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { PNG } from 'pngjs';
import { VECTORS } from '../helpers/vectors';
import { pngBuffer } from '../helpers/style';
import {
  TAB_NAMES,
  badge,
  decodeDownloadedPng,
  download,
  fillFields,
  foreign,
  preview,
  scanAfter,
  selectTab,
  trackRequests,
  urlInput,
} from './support';

const URL_TEXT = 'https://example.com/';
const PRESET_NAMES = ['Classic', 'Rounded Ink', 'Dot Pop', 'Leaf', 'Framed Blue', 'Minimal Card'];
const DOT_STYLES = ['square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'];
const EYE_OUTER = ['square', 'rounded', 'circle', 'leaf'];

const pngButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Download PNG' });

test.describe('@studio', () => {
  for (const v of VECTORS) {
    test(`#39 ${v.type} form exports a PNG that decodes to the exact payload`, async ({ page }) => {
      await page.goto('/');
      await selectTab(page, v.type as keyof typeof TAB_NAMES);
      await fillFields(page, v.fields);
      await expect(preview(page)).toBeVisible();
      expect(await decodeDownloadedPng(await download(page, pngButton(page)))).toEqual([v.expected]);
    });
  }

  test('#40 each preset passes the scan test and its PNG decodes', async ({ page }) => {
    await page.goto('/');
    await urlInput(page).fill(URL_TEXT);
    for (const name of PRESET_NAMES) {
      const status = await scanAfter(page, () => page.getByRole('button', { name, exact: true }).click());
      expect(status, name).toBe('pass');
      expect(await decodeDownloadedPng(await download(page, pngButton(page))), name).toEqual([URL_TEXT]);
    }
  });

  test('#41 every dot style x eye frame style passes', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await urlInput(page).fill(URL_TEXT);
    for (const dot of DOT_STYLES) {
      await page.getByLabel('Dot style').selectOption(dot);
      for (const eye of EYE_OUTER) {
        const status = await scanAfter(page, async () => {
          // Re-select both so every combination triggers its own check.
          await page.getByLabel('Eye frame style').selectOption(eye === 'square' ? 'rounded' : 'square');
          await page.getByLabel('Eye frame style').selectOption(eye);
        });
        expect(status, `${dot} x ${eye}`).toBe('pass');
      }
    }
  });

  test('#42 low contrast fails, and the fix button restores a pass', async ({ page }) => {
    await page.goto('/');
    await urlInput(page).fill(URL_TEXT);
    await page.getByLabel('Background colour').fill('#ffffff');
    const failed = await scanAfter(page, () => page.getByLabel('Foreground colour').fill('#cccccc'));
    expect(failed).toBe('fail');
    await badge(page).click();
    await expect(badge(page).locator('[data-issue-id="low-contrast"]')).toBeVisible();
    const fixed = await scanAfter(page, () => page.getByRole('button', { name: /darker colou?r/i }).click());
    expect(fixed).toBe('pass');
  });

  test('#43 a logo at ECC M raises ECC to H with a notice; 30% at M is too big', async ({ page }) => {
    await page.goto('/');
    await urlInput(page).fill(URL_TEXT);
    const ecc = page.getByLabel('Error correction');
    await ecc.selectOption('M');
    await page.getByLabel('Upload logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: pngBuffer() });
    await expect(ecc).toHaveValue('H');
    await expect(page.getByRole('status').filter({ hasText: /error correction/i })).toBeVisible();

    // The user may lower it again; at M a 30% logo exceeds the budget.
    await ecc.selectOption('M');
    await scanAfter(page, () => page.getByLabel('Logo size').fill('30'));
    await badge(page).click();
    await expect(badge(page).locator('[data-issue-id="logo-too-big"]')).toBeVisible();
    await expect(badge(page).locator('[data-issue-id="logo-low-ecc"]')).toBeVisible();
  });

  test('#44 banner-bottom frame with "Menu" exports a tall PNG that decodes', async ({ page }) => {
    await page.goto('/');
    await urlInput(page).fill(URL_TEXT);
    await page.getByLabel('Frame', { exact: true }).selectOption('banner-bottom');
    await page.getByLabel('Frame text').fill('Menu');
    const buf = await download(page, pngButton(page));
    const png = PNG.sync.read(buf);
    expect(png.height).toBeGreaterThan(png.width);
    expect(await decodeDownloadedPng(buf)).toEqual([URL_TEXT]);
  });

  test('#45 PDF A4 export is a one-page A4 PDF', async ({ page }) => {
    await page.goto('/');
    await urlInput(page).fill(URL_TEXT);
    await page.getByLabel('PDF page').selectOption('A4');
    const buf = await download(page, page.getByRole('button', { name: 'Download PDF' }));
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.abs(width - 595.28)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(height - 841.89)).toBeLessThanOrEqual(0.5);
  });

  test('#46 PNG 4096 with a transparent background', async ({ page }) => {
    await page.goto('/');
    await urlInput(page).fill(URL_TEXT);
    await page.getByLabel('PNG size').fill('4096');
    await page.getByLabel('Transparent background').check();
    const png = PNG.sync.read(await download(page, pngButton(page)));
    expect(png.width).toBe(4096);
    expect(png.data[3]).toBe(0); // alpha of pixel (0, 0)
  });

  test('#47 ?type= preselects the tab and ?value= prefills the URL', async ({ page }) => {
    await page.goto('/?type=wifi');
    await expect(page.getByRole('tab', { name: 'WiFi', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.goto('/?type=url&value=https%3A%2F%2Fa.b');
    await expect(page.getByRole('tab', { name: 'URL', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(urlInput(page)).toHaveValue('https://a.b');
  });

  test('#48 options persist across a reload; Reset restores the defaults', async ({ page }) => {
    await page.goto('/');
    const defaultDot = await page.getByLabel('Dot style').inputValue();
    await urlInput(page).fill('https://persist.example/');
    await page.getByLabel('Dot style').selectOption(defaultDot === 'dots' ? 'rounded' : 'dots');
    const chosenDot = await page.getByLabel('Dot style').inputValue();
    await page.reload();
    await expect(urlInput(page)).toHaveValue('https://persist.example/');
    await expect(page.getByLabel('Dot style')).toHaveValue(chosenDot);
    expect(await page.evaluate(() => localStorage.getItem('fqr:v1'))).not.toBeNull();

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(urlInput(page)).not.toHaveValue('https://persist.example/');
    await expect(page.getByLabel('Dot style')).toHaveValue(defaultDot);
    await page.reload();
    await expect(urlInput(page)).not.toHaveValue('https://persist.example/');
  });

  test('#49 the preview updates within 100 ms of a keystroke (median of 10)', async ({ page }) => {
    await page.goto('/');
    const input = urlInput(page);
    await input.fill('https://example.com/');
    await expect(preview(page)).toBeVisible();
    await input.focus();
    await page.evaluate(() => {
      const w = window as unknown as { __lat: number[]; __t0: number };
      w.__lat = [];
      const target = document.querySelector('[data-testid="qr-preview"]')!;
      document.addEventListener('keydown', () => (w.__t0 = performance.now()), true);
      new MutationObserver(() => {
        if (w.__t0) {
          w.__lat.push(performance.now() - w.__t0);
          w.__t0 = 0;
        }
      }).observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
    });
    for (const ch of 'abcdefghij') {
      await page.keyboard.type(ch);
      await page.waitForTimeout(250);
    }
    const lat = await page.evaluate(() => (window as unknown as { __lat: number[] }).__lat);
    expect(lat.length).toBe(10);
    const sorted = [...lat].sort((a, b) => a - b);
    const median = (sorted[4] + sorted[5]) / 2;
    expect(median).toBeLessThan(100);
  });
});

test('#50 the privacy meter reads 0 third-party requests after a full studio flow @privacy', async ({ page, baseURL }) => {
  const urls = trackRequests(page);
  await page.goto('/');
  await urlInput(page).fill(URL_TEXT);
  await page.getByRole('button', { name: 'Dot Pop', exact: true }).click();
  await download(page, page.getByRole('button', { name: 'Download SVG' }));
  await download(page, pngButton(page));
  await download(page, page.getByRole('button', { name: 'Download PDF' }));
  await expect(page.getByTestId('privacy-meter')).toContainText('0 third-party requests');
  expect(foreign(urls, baseURL!)).toEqual([]);
});
