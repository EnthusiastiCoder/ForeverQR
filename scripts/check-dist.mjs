#!/usr/bin/env node
// Fails when the built site would load anything from another origin: external scripts,
// stylesheets, images, iframes, media sources, preconnect/dns-prefetch hints, or CSS
// url(http...). Outbound <a> links and canonical/sitemap/alternate links are fine.
//   node scripts/check-dist.mjs [distDir]   (default: dist)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const EXTERNAL = /^(https?:)?\/\//i;
const OK_LINK_RELS = new Set(['canonical', 'sitemap', 'alternate', 'author', 'license', 'me']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(html|css)$/.test(name)) yield p;
  }
}

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};

const problems = [];
const report = (file, what, url) => problems.push(`${relative(dist, file)}: ${what} ${url}`);

function checkCss(file, css) {
  for (const m of css.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) {
    if (EXTERNAL.test(m[1])) report(file, 'CSS url()', m[1]);
  }
  for (const m of css.matchAll(/@import\s+["']([^"']+)/gi)) {
    if (EXTERNAL.test(m[1])) report(file, 'CSS @import', m[1]);
  }
}

for (const file of files(dist)) {
  const text = readFileSync(file, 'utf8');
  if (file.endsWith('.css')) {
    checkCss(file, text);
    continue;
  }
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) checkCss(file, m[1]);
  for (const m of text.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) checkCss(file, m[1]);

  for (const m of text.matchAll(/<(script|link|img|iframe|source|video|audio|embed|object|track|input)\b[^>]*>/gi)) {
    const tag = m[0];
    const name = m[1].toLowerCase();
    if (name === 'link') {
      const rel = (attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
      const href = attr(tag, 'href') ?? '';
      if (rel.includes('preconnect') || rel.includes('dns-prefetch')) {
        report(file, `<link rel="${rel.join(' ')}">`, href);
        continue;
      }
      if (rel.every((r) => OK_LINK_RELS.has(r))) continue;
      if (EXTERNAL.test(href)) report(file, `<link rel="${rel.join(' ')}">`, href);
      continue;
    }
    for (const a of ['src', 'data', 'poster', 'srcset']) {
      const v = attr(tag, a);
      if (!v) continue;
      for (const part of a === 'srcset' ? v.split(',').map((s) => s.trim().split(/\s+/)[0]) : [v]) {
        if (EXTERNAL.test(part)) report(file, `<${name} ${a}>`, part);
      }
    }
  }
}

if (problems.length) {
  console.error(`check-dist FAILED: ${problems.length} third-party request(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('check-dist passed: no third-party assets in the build.');
