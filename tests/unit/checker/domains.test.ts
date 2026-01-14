// WS3 case #55: host matching against the redirect-domain list.
//
// Contract: matchRedirectDomain(url: string) -> Entry | null   (src/lib/checker/domains.ts)
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Entry = { domain: string; vendor: string; kind: string; source: string };

const domainsMod = () => import('../../../src/lib/checker/domains');

function entries(): Entry[] {
  return JSON.parse(readFileSync(resolve(__dirname, '../../../src/data/redirect-domains.json'), 'utf8')).entries;
}

function vendorEntry(): Entry {
  const list = entries();
  const e = list.find((x) => x.domain === 'qrco.de') ?? list.find((x) => x.kind === 'dynamic-qr');
  expect(e, 'a dynamic-qr entry').toBeDefined();
  return e!;
}

describe('matchRedirectDomain', () => {
  it('#55 matches case-insensitively, by subdomain, www and trailing dot; not by bare suffix', async () => {
    const { matchRedirectDomain } = await domainsMod();
    const v = vendorEntry();

    expect(matchRedirectDomain(`https://${v.domain.toUpperCase()}/bdXyz`)?.domain).toBe(v.domain);
    expect(matchRedirectDomain(`https://sub.${v.domain}/x`)?.domain).toBe(v.domain);
    expect(matchRedirectDomain(`https://evil${v.domain}/x`)).toBeNull();

    expect(entries().some((e) => e.domain === 'bit.ly')).toBe(true);
    expect(matchRedirectDomain('https://www.bit.ly/x')?.domain).toBe('bit.ly');
    expect(matchRedirectDomain('https://bit.ly./x')?.domain).toBe('bit.ly');

    expect(matchRedirectDomain('https://example.com/menu')).toBeNull();
  });
});
