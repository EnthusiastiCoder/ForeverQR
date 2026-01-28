#!/usr/bin/env node
// Licence gate for production dependencies. Reads the shipped tree (npm ls --omit=dev)
// or a JSON list given with --input, prints a table, and exits 1 on any licence outside
// the allowlist.
//   node scripts/check-licenses.mjs
//   node scripts/check-licenses.mjs --input <file>   (a JSON array [{ name, version, license }])
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = new Set(['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'CC0-1.0', 'OFL-1.1']);

// Reviewed exceptions, pinned to an exact name@version and declared licence string so any
// change re-triggers the gate. Each one names why it is acceptable.
const REVIEWED = new Map([
  [
    'pako@1.0.11|(MIT AND Zlib)',
    'LICENSE file is MIT; the Zlib part covers the ported zlib code and is permissive (no copyleft). Via pdf-lib.',
  ],
]);

/** True when an SPDX expression is satisfiable with allowed licences only. */
export function allowed(expr) {
  if (!expr || typeof expr !== 'string') return false;
  const e = expr.trim().replace(/^\((.*)\)$/, '$1');
  // OR: any alternative is enough. AND: every part must be allowed.
  if (/\sOR\s/i.test(e)) return e.split(/\s+OR\s+/i).some(allowed);
  if (/\sAND\s/i.test(e)) return e.split(/\s+AND\s+/i).every(allowed);
  return ALLOWED.has(e);
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) {
    const types = pkg.licenses.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
    if (types.length) return types.length === 1 ? types[0] : `(${types.join(' OR ')})`;
  }
  return 'UNKNOWN';
}

function fromTree() {
  const json = execSync('npm ls --omit=dev --all --json', {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const tree = JSON.parse(json);
  const seen = new Map();
  const walk = (deps, base) => {
    for (const [name, info] of Object.entries(deps ?? {})) {
      const key = `${name}@${info.version}`;
      // Extraneous packages are not part of the declared tree and never ship.
      if (seen.has(key) || !info.version || info.extraneous) continue;
      // Hoisted or nested: try the nested node_modules first, then the root.
      const candidates = [join(base, 'node_modules', name), join(process.cwd(), 'node_modules', name)];
      const dir = candidates.find((d) => existsSync(join(d, 'package.json')));
      const pkg = dir ? JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) : {};
      seen.set(key, { name, version: info.version, license: licenseOf(pkg) });
      walk(info.dependencies, dir ?? base);
    }
  };
  walk(tree.dependencies, process.cwd());
  return [...seen.values()];
}

const args = process.argv.slice(2);
const inputAt = args.indexOf('--input');
const list =
  inputAt >= 0 ? JSON.parse(readFileSync(args[inputAt + 1], 'utf8')).map((p) => ({ ...p, license: licenseOf(p) })) : fromTree();

list.sort((a, b) => a.name.localeCompare(b.name));
const w = Math.max(7, ...list.map((p) => `${p.name}@${p.version}`.length));
console.log(`${'package'.padEnd(w)}  licence`);
console.log(`${'-'.repeat(w)}  -------`);
const bad = [];
const reviewed = [];
for (const p of list) {
  const why = REVIEWED.get(`${p.name}@${p.version}|${p.license}`);
  const ok = allowed(p.license) || Boolean(why);
  if (!ok) bad.push(p);
  if (why) reviewed.push({ ...p, why });
  const mark = ok ? (why ? '   (reviewed exception)' : '') : '   <-- NOT ALLOWED';
  console.log(`${`${p.name}@${p.version}`.padEnd(w)}  ${p.license}${mark}`);
}
for (const r of reviewed) console.log(`
Reviewed: ${r.name}@${r.version} ${r.license}: ${r.why}`);
console.log(`\n${list.length} production packages checked.`);
if (bad.length) {
  console.error(`\nLicence check FAILED: ${bad.length} package(s) outside the allowlist:`);
  for (const p of bad) console.error(`  ${p.name}@${p.version}: ${p.license}`);
  process.exit(1);
}
console.log(`Licence check passed: every licence is on the allowlist${reviewed.length ? ` (plus ${reviewed.length} reviewed exception(s))` : ''}.`);
