// Payload vectors shared by the unit tests (payloads, decode round trip) and the studio e2e
// tests. Field names are the buildPayload(type, fields) contract.
export type PayloadType = 'url' | 'wifi' | 'vcard' | 'email' | 'sms' | 'geo' | 'event' | 'text';

export interface Vector {
  type: PayloadType;
  fields: Record<string, string | boolean>;
  expected: string;
}

export const VECTORS: Vector[] = [
  { type: 'url', fields: { url: 'example.com/x' }, expected: 'https://example.com/x' },
  {
    type: 'wifi',
    fields: { ssid: 'My;Net', password: 'p:ss"1', encryption: 'WPA', hidden: false },
    // ZXing "Barcode Contents" WIFI: format: in S and P the characters \ ; , : " are escaped
    // with a backslash (https://github.com/zxing/zxing/wiki/Barcode-Contents#wi-fi-network-config-android-ios-11).
    // Payload: WIFI:T:WPA;S:My\;Net;P:p\:ss\"1;;  (each payload backslash is \\ in the JS literal).
    expected: 'WIFI:T:WPA;S:My\\;Net;P:p\\:ss\\"1;;',
  },
  {
    type: 'vcard',
    fields: {
      first: 'John',
      last: 'Doe, Jr.',
      org: 'A;B',
      phoneCell: '+15551234567',
      email: 'john@example.com',
    },
    // vCard 3.0 text values escape \ , ; and newline with a backslash (RFC 2426 section 4,
    // "text" value type; vCard 4.0 keeps the same rule in RFC 6350 section 3.4). Payload lines:
    // N:Doe\, Jr.;John;;;  FN:John Doe\, Jr.  ORG:A\;B  (each payload backslash is \\ in the JS literal).
    expected: [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Doe\\, Jr.;John;;;',
      'FN:John Doe\\, Jr.',
      'ORG:A\\;B',
      'TEL;TYPE=CELL:+15551234567',
      'EMAIL:john@example.com',
      'END:VCARD',
    ].join('\r\n'),
  },
  {
    type: 'email',
    fields: { to: 'a@b.co', subject: 'Hi there', body: 'Line1\nLine2' },
    expected: 'mailto:a@b.co?subject=Hi%20there&body=Line1%0ALine2',
  },
  {
    type: 'sms',
    fields: { number: '+1 (555) 123-4567', message: 'Hello' },
    expected: 'SMSTO:+15551234567:Hello',
  },
  { type: 'geo', fields: { lat: '12.3456789', lng: '-98.7' }, expected: 'geo:12.345679,-98.7' },
  {
    type: 'event',
    fields: {
      summary: 'Launch',
      start: '2026-12-01T09:00',
      end: '2026-12-01T10:30',
      timeZone: 'Europe/Paris',
      allDay: false,
    },
    expected: [
      'BEGIN:VEVENT',
      'SUMMARY:Launch',
      'DTSTART:20261201T080000Z',
      'DTEND:20261201T093000Z',
      'END:VEVENT',
    ].join('\r\n'),
  },
  { type: 'text', fields: { text: 'Café ✓ 日本' }, expected: 'Café ✓ 日本' },
];
