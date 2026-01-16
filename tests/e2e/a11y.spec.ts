// WS2 case #53 and WS4 case #72: accessibility.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CHECKER_PATH, downloadBuffer, preview, urlInput } from './support';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

async function tabUntil(page: Page, isTarget: () => Promise<boolean>, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await isTarget()) return;
  }
  throw new Error('target not reached by keyboard');
}

test.describe('@a11y', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`#53 axe on / (${scheme}) has no serious or critical violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await expect(urlInput(page)).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test('#53 the whole flow works by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('body').focus();
    const input = urlInput(page);
    await tabUntil(page, () => input.evaluate((el) => el === document.activeElement));
    await page.keyboard.type('https://example.com');
    await expect(preview(page)).toBeVisible();
    const svgButton = page.getByRole('button', { name: 'Download SVG' });
    await tabUntil(page, () => svgButton.evaluate((el) => el === document.activeElement));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect((await downloadBuffer(dl)).toString('utf8')).toContain('<svg');
  });

  for (const path of ['/wifi-qr-code-generator/', CHECKER_PATH, '/privacy/', '/404']) {
    test(`#72 axe on ${path} has no serious or critical violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});
