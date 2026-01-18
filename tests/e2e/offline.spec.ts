// WS4 case #73: the checker and landing pages work offline after the first visit.
import { expect, test } from '@playwright/test';
import { CHECKER_PATH, checkerUpload } from './support';

test('#73 checker and a landing page load offline and decode an upload offline @pwa', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.goto('/wifi-qr-code-generator/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'WiFi', exact: true })).toHaveAttribute('aria-selected', 'true');

  await page.goto(CHECKER_PATH);
  await checkerUpload(page, 'direct.png');
  await expect(page.getByTestId('verdict').first()).toHaveAttribute('data-level', 'direct');
  await context.setOffline(false);
});
