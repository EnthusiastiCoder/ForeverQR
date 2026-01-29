#!/usr/bin/env node
// Post-build: hash every inline <script> in distDir/**/*.html (sha256, base64) and put
// the hashes into distDir/_headers in place of the 'CSP_SCRIPT_HASHES' placeholder.
// JSON-LD blocks and scripts with a src are skipped (they are not inline code).
//   node scripts/csp-hashes.mjs [distDir]   (default: dist)
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const PLACEHOLDER = "'CSP_SCRIPT_HASHES'";

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const hashes = new Set();
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(SCRIPT)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/\btype\s*=\s*["']?application\/ld\+json/i.test(attrs)) continue;
    hashes.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
}

const headersPath = join(dist, '_headers');
const headers = readFileSync(headersPath, 'utf8');
if (!headers.includes(PLACEHOLDER)) {
  console.error(`csp-hashes: no ${PLACEHOLDER} placeholder in ${headersPath}`);
  process.exit(1);
}
const list = [...hashes].sort();
// With no inline scripts, drop the placeholder and the space before it.
const out = list.length ? headers.replaceAll(PLACEHOLDER, list.join(' ')) : headers.replaceAll(` ${PLACEHOLDER}`, '');
writeFileSync(headersPath, out);
console.log(`csp-hashes: ${list.length} inline script hash(es) written to ${headersPath}`);
