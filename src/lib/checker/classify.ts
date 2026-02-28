// Verdicts for decoded QR text: can this code stop working?
import { detectType } from './parse';
import { matchRedirectDomain, normalizeHost } from './domains';

export interface Verdict {
  level: 'static' | 'direct' | 'dynamic' | 'shortener' | 'dead' | 'unknown-short';
  title: string;
  explanation: string;
  vendor?: string;
  host?: string;
  source?: string;
}

function looksShort(url: URL, host: string): boolean {
  if (url.search || url.hash) return false;
  const segs = url.pathname.split('/').filter(Boolean);
  if (segs.length !== 1 || url.pathname.replace(/\/$/, '') !== `/${segs[0]}`) return false;
  if (!/^[A-Za-z0-9]{4,12}$/.test(segs[0])) return false;
  // Plain lowercase or uppercase words (/menu, /about) are pages, not random short codes.
  if (!/[0-9]/.test(segs[0]) && !(/[a-z]/.test(segs[0]) && /[A-Z]/.test(segs[0]))) return false;
  const labels = host.split('.');
  return labels.slice(0, -1).join('.').length <= 10;
}

export function classify(text: string, opts: { final?: boolean } = {}): Verdict {
  if (detectType(text) !== 'url') {
    return { level: 'static', title: 'Static content', explanation: 'Static content. Nothing here can expire.' };
  }
  const t = text.trim();
  const host = normalizeHost(t);
  if (!host) return { level: 'static', title: 'Static content', explanation: 'Static content. Nothing here can expire.' };
  const hit = matchRedirectDomain(t);
  if (hit) {
    const base = { vendor: hit.vendor, host: hit.domain, source: hit.source };
    if (hit.kind === 'dynamic-qr')
      return {
        level: 'dynamic',
        title: 'Dynamic QR code',
        explanation: `Dynamic QR from ${hit.vendor}. It goes through their server and can stop working if that account or trial lapses.`,
        ...base,
      };
    if (hit.kind === 'shortener')
      return {
        level: 'shortener',
        title: 'Short link',
        explanation: `Goes through ${hit.vendor}. Works only while that service keeps the link.`,
        ...base,
      };
    return {
      level: 'dead',
      title: 'Dead short link service',
      explanation: `${hit.vendor} no longer runs this service, so this link is likely broken.`,
      ...base,
    };
  }
  if (!opts.final && looksShort(new URL(t), host)) {
    return {
      level: 'unknown-short',
      title: 'Possibly a short link',
      explanation: "Can't tell offline. This looks like a short link.",
      host,
    };
  }
  return {
    level: 'direct',
    title: 'Direct link',
    explanation: `Points straight at ${host}. No QR vendor in between; it works as long as ${host} keeps that page.`,
    host,
  };
}
