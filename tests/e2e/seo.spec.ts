// WS4 cases #69-#71: landing-page SEO, sitemap, robots.txt, licences on /about/.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECKER_PATH, LANDING_PAGES, ROOT, TAB_NAMES, sitemapPaths } from './support';

test.describe('@seo', () => {
  test('#69 each landing page has unique, complete SEO metadata and the matching studio tab', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const titles = new Set<string>();
    const h1s = new Set<string>();
    for (const { slug, tab } of LANDING_PAGES) {
      const path = `/${slug}/`;
      await page.goto(path);

      const title = await page.title();
      expect(title.length, `${slug} title`).toBeGreaterThan(0);
      expect(title.length, `${slug} title`).toBeLessThanOrEqual(60);
      expect(titles.has(title), `${slug} duplicate title`).toBe(false);
      titles.add(title);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0, `${slug} description`).toBeGreaterThan(0);
      expect(description!.length, `${slug} description`).toBeLessThanOrEqual(155);

      await expect(page.locator('h1')).toHaveCount(1);
      const h1 = (await page.locator('h1').textContent())!.trim();
      expect(h1s.has(h1), `${slug} duplicate h1`).toBe(false);
      h1s.add(h1);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(new URL(canonical!).pathname, `${slug} canonical`).toBe(path);

      expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBeTruthy();
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(ogImage, `${slug} og:image`).toBeTruthy();
      const img = await page.request.get(new URL(ogImage!, baseURL).pathname);
      expect(img.status(), `${slug} og:image`).toBe(200);
      expect(img.headers()['content-type']).toMatch(/^image\//);

      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      const types = ld.flatMap((t) => {
        const j = JSON.parse(t);
        return (Array.isArray(j) ? j : j['@graph'] ?? [j]).map((x: { '@type': string }) => x['@type']);
      });
      expect(types, `${slug} JSON-LD`).toContain('FAQPage');

      if (tab) {
        await expect(page.getByRole('tab', { name: TAB_NAMES[tab], exact: true }), slug).toHaveAttribute(
          'aria-selected',
          'true',
        );
      } else {
        await expect(page.getByTestId('qr-preview'), slug).toBeVisible();
      }
    }
  });

  test('#70 the sitemap lists every page and robots.txt points to it', async ({ page }) => {
    const paths = new Set(await sitemapPaths(page));
    const expected = ['/', CHECKER_PATH, '/privacy/', '/about/', ...LANDING_PAGES.map((p) => `/${p.slug}/`)];
    for (const p of expected) expect(paths.has(p), p).toBe(true);

    const robots = await page.request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/^Sitemap:\s*https?:\/\/\S+\/sitemap-index\.xml\s*$/im);
  });

  test('#71 /about/ lists every production dependency with its licence', async ({ page }) => {
    const md = readFileSync(resolve(ROOT, 'THIRD_PARTY_LICENSES.md'), 'utf8');
    const rows = md.split('\n').filter((l) => l.trim().startsWith('|'));
    const header = rows[0].split('|').map((c) => c.trim().toLowerCase());
    const pkgCol = header.findIndex((c) => c.startsWith('package'));
    const licCol = header.findIndex((c) => c.startsWith('licen'));
    expect(pkgCol).toBeGreaterThan(0);
    expect(licCol).toBeGreaterThan(0);
    const deps = rows
      .slice(2)
      .map((r) => r.split('|').map((c) => c.trim().replace(/`/g, '')))
      .map((c) => ({ name: c[pkgCol], licence: c[licCol] }))
      .filter((d) => d.name);
    expect(deps.length).toBeGreaterThanOrEqual(5);

    await page.goto('/about/');
    const body = page.locator('main');
    for (const d of deps) {
      await expect(body, d.name).toContainText(d.name);
      await expect(body, `${d.name} licence`).toContainText(d.licence);
    }
  });
});
