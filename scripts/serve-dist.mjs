#!/usr/bin/env node
// Static preview of dist/ with the production rules applied: the `/*` headers from
// dist/_headers and the lines of dist/_redirects (`from to [code]`). This mirrors what
// Cloudflare Pages does, so the e2e tests run against the real CSP.
//   node scripts/serve-dist.mjs [port] [distDir]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number(process.argv[2] ?? 4321);
const dist = resolve(process.argv[3] ?? 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/** Parse _headers into [{ pattern, headers }] (Cloudflare Pages syntax). */
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const at = raw.indexOf(':');
      if (at > 0) current.headers.push([raw.slice(0, at).trim(), raw.slice(at + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, path) {
  const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  return re.test(path);
}

function parseRedirects(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [from, to, code] = l.split(/\s+/);
      return { from, to, code: Number(code ?? 302) };
    });
}

const read = (name) => (existsSync(join(dist, name)) ? readFileSync(join(dist, name), 'utf8') : '');
const headerRules = parseHeaders(read('_headers'));
const redirects = parseRedirects(read('_redirects'));

function resolveFile(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const full = resolve(dist, safe);
  if (full !== dist && !full.startsWith(dist + sep)) return null;
  if (existsSync(full) && statSync(full).isFile()) return full;
  const index = join(full, 'index.html');
  if (existsSync(index)) return index;
  if (existsSync(`${full}.html`)) return `${full}.html`;
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const path = url.pathname;

  for (const rule of headerRules) {
    if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) res.setHeader(k, v);
  }

  const redirect = redirects.find((r) => matches(r.from, path));
  if (redirect && redirect.code >= 300 && redirect.code < 400) {
    res.writeHead(redirect.code, { Location: redirect.to + url.search });
    res.end();
    return;
  }

  // Directory URLs without a trailing slash redirect, like Pages does.
  if (!path.endsWith('/') && !extname(path) && existsSync(join(dist, path, 'index.html'))) {
    res.writeHead(308, { Location: `${path}/${url.search}` });
    res.end();
    return;
  }

  let file = resolveFile(path);
  let status = 200;
  if (!file) {
    status = 404;
    file = existsSync(join(dist, '404.html')) ? join(dist, '404.html') : null;
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(status, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
  res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
});

server.listen(port, () => console.log(`Serving ${dist} at http://localhost:${port}`));
