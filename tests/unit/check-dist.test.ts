// WS4 case #75: scripts/check-dist.mjs rejects third-party asset URLs in built HTML.
//
// CLI contract: node scripts/check-dist.mjs [distDir]   (default dist/)
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const SCRIPT = join(ROOT, 'scripts', 'check-dist.mjs');

function check(dir: string) {
  expect(existsSync(SCRIPT), 'scripts/check-dist.mjs exists').toBe(true);
  const r = spawnSync(process.execPath, [SCRIPT, dir], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

function site(html: string) {
  const dir = mkdtempSync(join(tmpdir(), 'fqr-dist-'));
  writeFileSync(join(dir, 'index.html'), html);
  return dir;
}

const CLEAN = `<!doctype html><html><head>
<link rel="canonical" href="https://foreverqr.pages.dev/">
<link rel="sitemap" href="https://foreverqr.pages.dev/sitemap-index.xml">
<link rel="stylesheet" href="/_astro/index.css">
<script type="module" src="/_astro/page.js"></script>
<style>.a{background:url(/img/bg.svg)}</style>
</head><body>
<img src="/icons/logo.svg" alt="">
<a href="https://support.qr-code-generator.com/">vendor docs</a>
</body></html>`;

describe('check-dist', () => {
  it('#75 a clean site passes', () => {
    const r = check(site(CLEAN));
    expect(r.code, r.out).toBe(0);
  });

  it('#75 an external <script src> fails', () => {
    const r = check(site(CLEAN.replace('</head>', '<script src="https://cdn.example/x.js"></script></head>')));
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('https://cdn.example/x.js');
  });

  it('#75 a preconnect link fails', () => {
    const r = check(site(CLEAN.replace('</head>', '<link rel="preconnect" href="https://fonts.gstatic.com"></head>')));
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('fonts.gstatic.com');
  });

  it('#75 a CSS url(http...) fails', () => {
    const r = check(site(CLEAN.replace('url(/img/bg.svg)', 'url(https://cdn.example/bg.png)')));
    expect(r.code).not.toBe(0);
  });

  // The real build is checked by `npm run check:dist` in the WS4 verify step; run here when dist/ exists.
  it.skipIf(!existsSync(join(ROOT, 'dist')))('#75 the real build passes', () => {
    const r = check(join(ROOT, 'dist'));
    expect(r.code, r.out).toBe(0);
  });
});
