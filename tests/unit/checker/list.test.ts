// WS3 case #58: the bundled redirect-domain list is well formed and sourced.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LIST = resolve(__dirname, '../../../src/data/redirect-domains.json');

type Entry = { domain: string; vendor: string; kind: string; source: string; evidence: string };

function load(): { updated: string; entries: Entry[] } {
  return JSON.parse(readFileSync(LIST, 'utf8'));
}

describe('redirect-domains.json', () => {
  it('#58 every entry is valid, sourced and unique; enough coverage', () => {
    const list = load();
    expect(list.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(list.updated))).toBe(false);
    expect(Array.isArray(list.entries)).toBe(true);

    for (const e of list.entries) {
      expect(e.domain, JSON.stringify(e)).toBe(e.domain.toLowerCase());
      expect(e.domain).toMatch(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/); // no scheme, path, port or trailing dot
      expect(e.domain.startsWith('www.')).toBe(false);
      expect(['dynamic-qr', 'shortener', 'dead-shortener']).toContain(e.kind);
      expect(typeof e.vendor).toBe('string');
      expect(e.vendor.trim().length).toBeGreaterThan(0);
      expect(e.source).toMatch(/^https:\/\/\S+$/);
      expect(() => new URL(e.source)).not.toThrow();
      expect(typeof e.evidence).toBe('string');
      expect(e.evidence.trim().length).toBeGreaterThan(0);
    }

    const domains = list.entries.map((e) => e.domain);
    expect(new Set(domains).size).toBe(domains.length);
    expect(list.entries.filter((e) => e.kind === 'dynamic-qr').length).toBeGreaterThanOrEqual(15);
    expect(list.entries.filter((e) => e.kind === 'shortener').length).toBeGreaterThanOrEqual(8);
  });
});
