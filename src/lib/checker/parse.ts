// Payload type detection for decoded QR text.
export type PayloadType = 'url' | 'wifi' | 'vcard' | 'event' | 'email' | 'sms' | 'geo' | 'text';

export function detectType(text: string): PayloadType {
  const t = text.trim();
  if (/^https?:\/\/\S+$/i.test(t)) return 'url';
  if (/^WIFI:/i.test(t)) return 'wifi';
  if (/^BEGIN:VCARD/i.test(t)) return 'vcard';
  if (/^BEGIN:(VEVENT|VCALENDAR)/i.test(t)) return 'event';
  if (/^(MATMSG:|mailto:)/i.test(t)) return 'email';
  if (/^(SMSTO:|SMS:)/i.test(t)) return 'sms';
  if (/^geo:/i.test(t)) return 'geo';
  return 'text';
}
