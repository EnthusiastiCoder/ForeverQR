import { escapeText, str } from './escape';
import { icsUtc, isValidTimeZone, localTimeZone, zonedToUtcMs } from './tz';
import type { EventFields, PayloadResult } from './types';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function dateOnly(s: string): number | null {
  const m = DATE_RE.exec(s.trim());
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return Number.isNaN(t) ? null : t;
}

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
const withTime = (s: string) => (s.length === 10 ? `${s}T00:00` : s);

export function eventPayload(f: EventFields): PayloadResult {
  const summary = str(f.summary).trim();
  const start = str(f.start).trim();
  const end = str(f.end).trim();
  if (!start) return { error: 'Enter a start date.' };
  const lines = ['BEGIN:VEVENT'];
  if (summary) lines.push(`SUMMARY:${escapeText(summary)}`);
  if (f.allDay === true) {
    const s = dateOnly(start);
    if (s == null) return { error: 'Enter a valid start date.' };
    let e = end ? dateOnly(end) : s;
    if (e == null) return { error: 'Enter a valid end date.' };
    if (e < s) return { error: 'The event ends before it starts.' };
    e += 86_400_000; // DTEND is exclusive: the day after the last day.
    lines.push(`DTSTART;VALUE=DATE:${ymd(s)}`, `DTEND;VALUE=DATE:${ymd(e)}`);
  } else {
    const zone = str(f.timeZone).trim() || localTimeZone();
    if (!isValidTimeZone(zone)) return { error: `Unknown time zone: ${zone}` };
    let s: number;
    let e: number | null = null;
    try {
      s = zonedToUtcMs(withTime(start), zone);
      if (end) e = zonedToUtcMs(withTime(end), zone);
    } catch {
      return { error: 'Enter the date and time as YYYY-MM-DD HH:MM.' };
    }
    if (e != null && e < s) return { error: 'The event ends before it starts.' };
    lines.push(`DTSTART:${icsUtc(s)}`);
    if (e != null) lines.push(`DTEND:${icsUtc(e)}`);
  }
  const location = str(f.location).trim();
  const description = str(f.description);
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  if (description.trim()) lines.push(`DESCRIPTION:${escapeText(description)}`);
  lines.push('END:VEVENT');
  return { text: lines.join('\r\n') };
}
