// WS1 cases #35-#37: licence check, CSP hash injection, presets pass the static checks.
//
// Script CLI contracts:
//   node scripts/check-licenses.mjs                 checks the real production tree (npm ls --omit=dev)
//   node scripts/check-licenses.mjs --input <file>  checks a JSON array [{ name, version, license }] instead
//   node scripts/csp-hashes.mjs [distDir]           default dist/; hashes inline <script>s in distDir/**/*.html
//                                                   and replaces 'CSP_SCRIPT_HASHES' in distDir/_headers
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

function runScript(script: string, args: string[] = []) {
  const path = join(ROOT, 'scripts', script);
  // Guard: a missing script also exits non-zero, which must not count as a pass.
  expect(existsSync(path), `${script} exists`).toBe(true);
  const r = spawnSync(process.execPath, [path, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

const tmp = (name: string) => mkdtempSync(join(tmpdir(), `fqr-${name}-`));

describe('check-licenses', () => {
  it('#35 passes on the real tree, fails on a GPL-3.0 package', () => {
    const real = runScript('check-licenses.mjs');
    expect(real.code, real.out).toBe(0);
    expect(real.out).toContain('pdf-lib');

    const dir = tmp('lic');
    const okFile = join(dir, 'ok.json');
    writeFileSync(okFile, JSON.stringify([
      { name: 'fine-a', version: '1.0.0', license: 'MIT' },
      { name: 'fine-b', version: '2.0.0', license: 'Apache-2.0' },
    ]));
    const ok = runScript('check-licenses.mjs', ['--input', okFile]);
    expect(ok.code, ok.out).toBe(0);

    const badFile = join(dir, 'bad.json');
    writeFileSync(badFile, JSON.stringify([
      { name: 'fine-a', version: '1.0.0', license: 'MIT' },
      { name: 'copyleft-pkg', version: '3.1.4', license: 'GPL-3.0' },
    ]));
    const bad = runScript('check-licenses.mjs', ['--input', badFile]);
    expect(bad.code).not.toBe(0);
    expect(bad.out).toContain('copyleft-pkg');
    expect(bad.out).toContain('GPL-3.0');
  });
});

describe('csp-hashes', () => {
  it('#36 writes exactly the two inline-script hashes and removes the placeholder', () => {
    const dist = tmp('csp');
    mkdirSync(join(dist, 'sub'));
    const s1 = 'console.log("one")';
    const s2 = '\n  window.__boot = { a: 1 };\n';
    const ld = '{"@context":"https://schema.org","@type":"FAQPage"}';
    writeFileSync(join(dist, 'index.html'),
      `<!doctype html><html><head><script>${s1}</script>` +
      `<script type="application/ld+json">${ld}</script></head><body></body></html>`);
    writeFileSync(join(dist, 'sub', 'index.html'),
      `<!doctype html><html><head><script type="module" src="/_astro/x.js"></script></head>` +
      `<body><script type="module">${s2}</script></body></html>`);
    writeFileSync(join(dist, '_headers'),
      "/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'CSP_SCRIPT_HASHES'; object-src 'none'\n  Referrer-Policy: no-referrer\n");

    const r = runScript('csp-hashes.mjs', [dist]);
    expect(r.code, r.out).toBe(0);

    const headers = readFileSync(join(dist, '_headers'), 'utf8');
    const hash = (s: string) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
    expect(headers).not.toContain('CSP_SCRIPT_HASHES');
    const found = headers.match(/'sha256-[A-Za-z0-9+/=]+'/g) ?? [];
    expect(found.sort()).toEqual([hash(s1), hash(s2)].sort());
    expect(found).not.toContain(hash(ld));
    expect(headers).toContain("script-src 'self' 'wasm-unsafe-eval' ");
    expect(headers).toContain('Referrer-Policy: no-referrer');
  });
});

describe('presets', () => {
  it('#37 every preset has no error from the static checks', async () => {
    const { PRESETS } = await import('../../src/lib/qr/presets');
    const { encode } = await import('../../src/lib/qr/encode');
    const { assessScannability } = await import('../../src/lib/qr/scan/checks');
    const list = PRESETS as { name: string; style: unknown; ecc?: 'L' | 'M' | 'Q' | 'H' }[];
    expect(list.map((p) => p.name).sort()).toEqual(
      ['Classic', 'Dot Pop', 'Framed Blue', 'Leaf', 'Minimal Card', 'Rounded Ink'].sort(),
    );
    for (const p of list) {
      const issues = assessScannability(p.style as never, encode('https://example.com/', p.ecc ?? 'M')) as {
        id: string;
        severity: string;
      }[];
      expect(issues.filter((i) => i.severity === 'error'), p.name).toEqual([]);
    }
  });
});
