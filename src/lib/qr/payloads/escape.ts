/** Escape a WiFi QR field: backslash, semicolon, comma, colon and double quote get a backslash. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/** Escape vCard 3.0 / iCalendar TEXT: \ , ; and newlines. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r\n|\r|\n/g, '\\n');
}

export const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
