// Wall-clock time in an IANA zone -> UTC, using Intl only (no time-zone library).

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** The browser's own IANA time zone, or UTC when unknown. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Offset of `zone` from UTC at instant `ms`, in milliseconds (positive east of Greenwich). */
function offsetAt(ms: number, zone: string): number {
  let dtf = formatters.get(zone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(zone, dtf);
  }
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Parse a local wall time 'YYYY-MM-DDTHH:MM[:SS]' in `zone` and return the UTC epoch in ms. */
export function zonedToUtcMs(local: string, zone: string): number {
  const m = LOCAL_RE.exec(local.trim());
  if (!m) throw new RangeError(`Invalid local time: ${local}`);
  const [, y, mo, d, h, mi, s] = m;
  const guess = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  let t = guess - offsetAt(guess, zone);
  const second = offsetAt(t, zone);
  if (guess - second !== t) t = guess - second;
  return t;
}

/** Format a UTC epoch as 'YYYY-MM-DDTHH:MM:SSZ'. */
export function isoUtc(ms: number): string {
  const d = new Date(ms);
  return (
    `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`
  );
}

/** Wall time in `zone` to UTC as 'YYYY-MM-DDTHH:MM:SSZ'. */
export function zonedToUtc(local: string, zone: string): string {
  return isoUtc(zonedToUtcMs(local, zone));
}

/** iCalendar UTC form: YYYYMMDDTHHMMSSZ. */
export function icsUtc(ms: number): string {
  return isoUtc(ms).replace(/[-:]/g, '');
}
