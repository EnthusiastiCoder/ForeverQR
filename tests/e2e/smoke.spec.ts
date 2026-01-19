// WS4 case #74: cross-browser smoke (firefox and webkit run only @smoke; chromium runs it too).
import { expect, test } from '@playwright/test';
import { CHECKER_PATH, checkerUpload, decodeSvgInPage, download, preview, urlInput } from './support';

test.describe('@smoke', () => {
  test('#74 studio: type, preview, SVG download decodes', async ({ page }) => {
    await page.goto('/');
    await urlInput(page).fill('https://example.com');
    await expect(preview(page)).toBeVisible();
    const svg = (await download(page, page.getByRole('button', { name: 'Download SVG' }))).toString('utf8');
    expect(svg).toContain('<svg');
    expect((await decodeSvgInPage(page, svg, 1024)).map((d) => d.text)).toEqual(['https://example.com/']);
  });

  test('#74 checker: uploading direct.png gives the direct verdict', async ({ page }) => {
    await page.goto(CHECKER_PATH);
    await checkerUpload(page, 'direct.png');
    await expect(page.getByTestId('verdict')).toHaveCount(1);
    await expect(page.getByTestId('verdict').first()).toHaveAttribute('data-level', 'direct');
  });
});
