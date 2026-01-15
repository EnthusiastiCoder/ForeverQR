// WS3 case #57: payload type detection for decoded QR text.
//
// Contract: detectType(text) -> 'url'|'wifi'|'vcard'|'event'|'email'|'sms'|'geo'|'text'   (src/lib/checker/parse.ts)
import { describe, expect, it } from 'vitest';

const parseMod = () => import('../../../src/lib/checker/parse');

async function detect(text: string): Promise<string> {
  const { detectType } = await parseMod();
  return detectType(text) as string;
}

describe('detectType', () => {
  it('#57 email: MATMSG: and mailto:', async () => {
    expect(await detect('MATMSG:TO:a@b.co;SUB:Hi;BODY:Yo;;')).toBe('email');
    expect(await detect('mailto:a@b.co?subject=Hi')).toBe('email');
    expect(await detect('MAILTO:a@b.co')).toBe('email');
  });

  it('#57 sms, geo, event', async () => {
    expect(await detect('SMSTO:+15551234567:Hello')).toBe('sms');
    expect(await detect('geo:12.345679,-98.7')).toBe('geo');
    expect(await detect('BEGIN:VEVENT\r\nSUMMARY:Launch\r\nEND:VEVENT')).toBe('event');
  });

  it('#57 url, wifi, vcard, text', async () => {
    expect(await detect('https://example.com/menu')).toBe('url');
    expect(await detect('http://example.com')).toBe('url');
    expect(await detect('WIFI:T:WPA;S:Cafe;P:x;;')).toBe('wifi');
    expect(await detect('BEGIN:VCARD\r\nVERSION:3.0\r\nEND:VCARD')).toBe('vcard');
    expect(await detect('just some words')).toBe('text');
  });

  it('#57 a javascript: URL is text, never a link', async () => {
    expect(await detect('javascript:alert(1)')).toBe('text');
    expect(await detect('JavaScript:void(0)')).toBe('text');
    expect(await detect('data:text/html,<script>alert(1)</script>')).toBe('text');
  });
});
