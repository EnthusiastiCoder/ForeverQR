// WS2 cases #51-#52: offline PWA and the web app manifest.
import { expect, test } from '@playwright/test';
import { badge, decodeDownloadedPng, download, scanAfter, urlInput } from './support';

test.describe('@pwa', () => {
  test('#51 offline after the first visit: generate, download PNG, and the decode badge passes', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Make sure the page is controlled by the worker before going offline.
    await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    await context.setOffline(true);
    await page.reload();
    const status = await scanAfter(page, () => urlInput(page).fill('https://offline.example/'));
    expect(status).toBe('pass');
    await expect(badge(page)).toHaveAttribute('data-status', 'pass');
    const buf = await download(page, page.getByRole('button', { name: 'Download PNG' }));
    expect(await decodeDownloadedPng(buf)).toEqual(['https://offline.example/']);
    await context.setOffline(false);
  });

  test('#52 the manifest is valid with 192 and 512 icons and display standalone', async ({ page }) => {
    const res = await page.request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBe('ForeverQR');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
    const icons: { src: string; sizes: string; purpose?: string }[] = manifest.icons;
    for (const size of ['192x192', '512x512']) {
      const icon = icons.find((i) => i.sizes.split(/\s+/).includes(size));
      expect(icon, size).toBeDefined();
      const iconRes = await page.request.get(new URL(icon!.src, res.url()).pathname);
      expect(iconRes.status(), icon!.src).toBe(200);
    }
    expect(icons.some((i) => (i.purpose ?? '').includes('maskable'))).toBe(true);
  });
});
