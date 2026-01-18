// WS4 cases #66-#68: zero third-party requests, no CSP violations, production headers.
import { expect, test } from '@playwright/test';
import { pngBuffer } from '../helpers/style';
import { CHECKER_PATH, checkerUpload, download, foreign, sitemapPaths, trackRequests, urlInput } from './support';

test.describe('@privacy', () => {
  test('#66 every sitemap page and every flow stays on the site origin', async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    const urls = trackRequests(page);
    const paths = await sitemapPaths(page);
    expect(paths.length).toBeGreaterThanOrEqual(15);
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    // Studio flow, logo upload, every export.
    await page.goto('/');
    await urlInput(page).fill('https://example.com/');
    await page.getByLabel('Upload logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: pngBuffer() });
    await download(page, page.getByRole('button', { name: 'Download SVG' }));
    await download(page, page.getByRole('button', { name: 'Download PNG' }));
    await download(page, page.getByRole('button', { name: 'Download PDF' }));

    // Checker upload.
    await page.goto(CHECKER_PATH);
    await checkerUpload(page, 'direct.png');
    await page.waitForLoadState('networkidle');

    expect(foreign(urls, baseURL!)).toEqual([]);
  });

  test('#67 no CSP violations and no console errors on any sitemap page', async ({ page }) => {
    test.setTimeout(240_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __cspViolations: string[] };
      w.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        w.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`),
      );
    });
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

    for (const path of await sitemapPaths(page)) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const v = await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
      problems.push(...v.map((x) => `${path} csp: ${x}`));
    }
    expect(problems).toEqual([]);
  });

  test('#68 security headers on / and the /check redirect', async ({ page }) => {
    const res = await page.request.get('/');
    const h = res.headers();
    const csp = h['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('CSP_SCRIPT_HASHES');
    expect(h['permissions-policy']).toContain('camera=(self)');
    expect(h['referrer-policy']).toBe('no-referrer');
    expect(h['x-content-type-options']).toBe('nosniff');

    const redirect = await page.request.get('/check', { maxRedirects: 0 });
    expect(redirect.status()).toBe(301);
    expect(new URL(redirect.headers()['location'], res.url()).pathname).toBe(CHECKER_PATH);
  });
});
