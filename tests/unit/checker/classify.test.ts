// WS3 case #56: verdicts for decoded QR text.
//
// Contract: classify(decodedText) -> { level, title, explanation, vendor?, host?, source? }
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Entry = { domain: string; vendor: string; kind: string; source: string };
type Verdict = {
  level: 'static' | 'direct' | 'dynamic' | 'shortener' | 'dead' | 'unknown-short';
  title: string;
  explanation: string;
  vendor?: string;
  host?: string;
  source?: string;
};

const classifyMod = () => import('../../../src/lib/checker/classify');

function entries(): Entry[] {
  return JSON.parse(readFileSync(resolve(__dirname, '../../../src/data/redirect-domains.json'), 'utf8')).entries;
}

async function classify(text: string): Promise<Verdict> {
  const { classify } = await classifyMod();
  return classify(text) as Verdict;
}

describe('classify', () => {
  it('#56 non-URL payloads are static', async () => {
    const wifi = await classify('WIFI:T:WPA;S:Cafe;P:secret;;');
    expect(wifi.level).toBe('static');
    expect(wifi.title.length).toBeGreaterThan(0);
    const vcard = await classify('BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;John;;;\r\nFN:John Doe\r\nEND:VCARD');
    expect(vcard.level).toBe('static');
  });

  it('#56 an unlisted ordinary URL is direct, naming the host', async () => {
    const v = await classify('https://example.com/menu/today');
    expect(v.level).toBe('direct');
    expect(v.host).toBe('example.com');
    expect(v.explanation).toContain('example.com');
  });

  it('#56 a listed shortener is shortener, with vendor and source', async () => {
    const e = entries().find((x) => x.kind === 'shortener' && x.domain === 'bit.ly') ??
      entries().find((x) => x.kind === 'shortener');
    expect(e).toBeDefined();
    const v = await classify(`https://${e!.domain}/3xYz12`);
    expect(v.level).toBe('shortener');
    expect(v.vendor).toBe(e!.vendor);
    expect(v.source).toBe(e!.source);
  });

  it('#56 a listed dynamic-QR vendor is dynamic, with vendor and source', async () => {
    const e = entries().find((x) => x.domain === 'qrco.de') ?? entries().find((x) => x.kind === 'dynamic-qr');
    expect(e).toBeDefined();
    const v = await classify(`https://${e!.domain}/bfAbc1`);
    expect(v.level).toBe('dynamic');
    expect(v.vendor).toBe(e!.vendor);
    expect(v.source).toBe(e!.source);
    expect(v.host).toBe(e!.domain);
    expect(v.explanation).toContain(e!.vendor);
  });

  it('#56 an unlisted short-looking link is unknown-short, never "safe"', async () => {
    const v = await classify('https://zz.io/aB3dE9');
    expect(v.level).toBe('unknown-short');
    expect(`${v.title} ${v.explanation}`).toMatch(/can't tell offline/i);
    expect(`${v.title} ${v.explanation}`).not.toMatch(/\bsafe\b/i);
  });

  it('#56 a listed dead shortener (goo.gl) is dead', async () => {
    const e = entries().find((x) => x.domain === 'goo.gl');
    if (!e) {
      // goo.gl only ships with a source for the shutdown; without it, it must not be called dead.
      expect((await classify('https://goo.gl/abc123')).level).not.toBe('dead');
      return;
    }
    expect(e.kind).toBe('dead-shortener');
    const v = await classify('https://goo.gl/abc123');
    expect(v.level).toBe('dead');
    expect(v.source).toBe(e.source);
  });

  it('#57 a javascript: URL is static text, never a link', async () => {
    const v = await classify('javascript:alert(1)');
    expect(v.level).toBe('static');
    expect(v.host).toBeUndefined();
  });
});
