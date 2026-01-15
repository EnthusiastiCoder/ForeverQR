// WS1 case #38: the minimal page renders, exports SVG, and the code scans.
import { expect, test } from '@playwright/test';
import { decodeSvgInPage, download, preview, urlInput } from './support';

test('#38 type a URL, preview, download SVG, and the 1024 px render decodes @smoke', async ({ page }) => {
  await page.goto('/');
  await urlInput(page).fill('https://example.com');
  await expect(preview(page)).toBeVisible();

  const svg = (await download(page, page.getByRole('button', { name: 'Download SVG' }))).toString('utf8');
  expect(svg).toContain('<svg');

  const decoded = await decodeSvgInPage(page, svg, 1024);
  expect(decoded.map((d) => d.text)).toEqual(['https://example.com/']);
});
