// WS2 case #54: the studio on a phone (runs in the mobile-chromium project, Pixel 7).
import { expect, test } from '@playwright/test';
import { decodeDownloadedPng, download, urlInput } from './support';

test('#54 preview sheet visible, type tabs scroll sideways, PNG download works @mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('preview-sheet')).toBeVisible();

  const tablist = page.getByRole('tablist').first();
  const scroll = await tablist.evaluate((el) => ({
    overflowX: getComputedStyle(el).overflowX,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(['auto', 'scroll']).toContain(scroll.overflowX);
  expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
  // The page itself never scrolls sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await urlInput(page).fill('https://example.com/');
  const buf = await download(page, page.getByRole('button', { name: 'Download PNG' }));
  expect(await decodeDownloadedPng(buf)).toEqual(['https://example.com/']);
});
