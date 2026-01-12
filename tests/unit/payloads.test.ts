// WS1 cases #1-#15: payload builders, time zones, UTF-8 round trip.
import { describe, expect, it } from 'vitest';
import { decodeRgba } from '../helpers/zxing';
import { rasterize } from '../helpers/raster';

// Modules under test are loaded per test, so each case fails on its own while they are missing.
const payloads = () => import('../../src/lib/qr/payloads/index');
const tz = () => import('../../src/lib/qr/payloads/tz');
const encoder = () => import('../../src/lib/qr/encode');

async function build(type: string, fields: Record<string, unknown>) {
  const { buildPayload } = await payloads();
  return buildPayload(type as never, fields as never) as { text?: string; error?: string };
}

async function text(type: string, fields: Record<string, unknown>): Promise<string> {
  const r = await build(type, fields);
  expect(r.error, `unexpected error: ${r.error}`).toBeUndefined();
  expect(typeof r.text).toBe('string');
  return r.text as string;
}

async function expectError(type: string, fields: Record<string, unknown>) {
  const r = await build(type, fields);
  expect(r.text).toBeUndefined();
  expect(typeof r.error).toBe('string');
  expect((r.error as string).length).toBeGreaterThan(0);
}

describe('wifi', () => {
  it('#1 WPA escapes ; : and " in ssid and password', async () => {
    expect(
      await text('wifi', { ssid: 'My;Net', password: 'p:ss"1', encryption: 'WPA', hidden: false }),
    ).toBe('WIFI:T:WPA;S:My\\;Net;P:p\\:ss\\"1;;');
  });

  it('#2 hidden + nopass omits P: and adds H:true;', async () => {
    expect(
      await text('wifi', { ssid: 'Cafe', password: 'ignored', encryption: 'nopass', hidden: true }),
    ).toBe('WIFI:T:nopass;S:Cafe;H:true;;');
  });

  it('#3 escapes a backslash and a comma', async () => {
    const t = await text('wifi', { ssid: 'a\\b,c', password: 'x', encryption: 'WPA', hidden: false });
    expect(t).toContain('S:a\\\\b\\,c;');
  });

  it('#4 empty ssid is an error', async () => {
    await expectError('wifi', { ssid: '', password: 'x', encryption: 'WPA', hidden: false });
  });
});

describe('email', () => {
  it('#5 encodes subject and body with encodeURIComponent; bare mailto when only "to"', async () => {
    expect(await text('email', { to: 'a@b.co', subject: 'Hi there', body: 'Line1\nLine2' })).toBe(
      'mailto:a@b.co?subject=Hi%20there&body=Line1%0ALine2',
    );
    expect(await text('email', { to: 'a@b.co', subject: '', body: '' })).toBe('mailto:a@b.co');
  });
});

describe('sms', () => {
  it('#6 keeps the leading + and drops spaces, dashes and parentheses', async () => {
    expect(await text('sms', { number: '+1 (555) 123-4567', message: 'Hello' })).toBe(
      'SMSTO:+15551234567:Hello',
    );
  });
});

describe('geo', () => {
  it('#7 rounds to 6 decimals, trims zeros, rejects out-of-range values', async () => {
    expect(await text('geo', { lat: '12.3456789', lng: '-98.7' })).toBe('geo:12.345679,-98.7');
    await expectError('geo', { lat: '91', lng: '0' });
    await expectError('geo', { lat: '0', lng: '-181' });
  });
});

describe('url', () => {
  it('#8 adds https://, rejects non-http(s), trims and normalises', async () => {
    expect(await text('url', { url: 'example.com/x' })).toBe('https://example.com/x');
    await expectError('url', { url: 'ftp://x' });
    expect(await text('url', { url: '  https://a.b  ' })).toBe(new URL('https://a.b').href);
  });
});

describe('vcard', () => {
  it('#9 vCard 3.0 with escaping, CRLF only, no empty-field lines', async () => {
    const t = await text('vcard', {
      first: 'John',
      last: 'Doe, Jr.',
      org: 'A;B',
      title: '',
      phoneCell: '+15551234567',
      phoneWork: '',
      email: 'john@example.com',
      url: '',
      street: '',
      city: '',
      region: '',
      zip: '',
      country: '',
      note: '',
    });
    expect(
      t.startsWith(
        'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe\\, Jr.;John;;;\r\nFN:John Doe\\, Jr.\r\nORG:A\\;B\r\n',
      ),
    ).toBe(true);
    expect(t.endsWith('END:VCARD')).toBe(true);
    expect(t).toContain('\r\nTEL;TYPE=CELL:+15551234567\r\n');
    expect(t).toContain('\r\nEMAIL:john@example.com\r\n');
    // Only CRLF line breaks: no bare \r or \n once the CRLF pairs are removed.
    expect(t.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    // No lines for empty fields.
    const lines = t.split('\r\n');
    for (const prop of ['TITLE', 'TEL;TYPE=WORK', 'URL', 'ADR', 'NOTE']) {
      expect(lines.some((l) => l.startsWith(prop)), prop).toBe(false);
    }
    expect(lines.every((l) => !/:$/.test(l))).toBe(true);
  });

  it('#10 a note with a newline is escaped as \\n', async () => {
    const t = await text('vcard', { first: 'A', last: 'B', note: 'one\ntwo' });
    expect(t.split('\r\n')).toContain('NOTE:one\\ntwo');
  });
});

describe('event', () => {
  it('#11 timed event converts Europe/Paris wall time to UTC', async () => {
    const t = await text('event', {
      summary: 'Launch',
      start: '2026-12-01T09:00',
      end: '2026-12-01T10:30',
      timeZone: 'Europe/Paris',
      allDay: false,
    });
    const lines = t.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VEVENT');
    expect(lines).toContain('SUMMARY:Launch');
    expect(lines).toContain('DTSTART:20261201T080000Z');
    expect(lines).toContain('DTEND:20261201T093000Z');
    expect(lines[lines.length - 1]).toBe('END:VEVENT');
  });

  it('#12 all-day event uses VALUE=DATE and ends the next day', async () => {
    const t = await text('event', { summary: 'NYE', start: '2026-12-31', allDay: true });
    const lines = t.split('\r\n');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261231');
    expect(lines).toContain('DTEND;VALUE=DATE:20270101');
  });

  it('#13 end before start is an error', async () => {
    await expectError('event', {
      summary: 'Backwards',
      start: '2026-12-01T10:00',
      end: '2026-12-01T09:00',
      timeZone: 'Europe/Paris',
      allDay: false,
    });
  });
});

describe('tz', () => {
  it('#14 zonedToUtc handles offsets and the DST change', async () => {
    const { zonedToUtc } = await tz();
    expect(zonedToUtc('2026-07-04T18:30', 'America/New_York')).toBe('2026-07-04T22:30:00Z');
    expect(zonedToUtc('2026-03-29T03:30', 'Europe/London')).toBe('2026-03-29T02:30:00Z');
  });
});

describe('utf-8', () => {
  it('#15 unicode text round-trips through encode and decode byte-exactly', async () => {
    const { encode } = await encoder();
    const input = 'Café ✓ 日本';
    expect(await text('text', { text: input })).toBe(input);
    const results = await decodeRgba(rasterize(encode(input, 'M')));
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe(input);
    expect(Array.from(results[0].bytes)).toEqual(Array.from(new TextEncoder().encode(input)));
  });
});
