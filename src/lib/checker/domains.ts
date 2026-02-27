// Matching a URL's host against the bundled redirect-domain list.
import list from '../../data/redirect-domains.json';

export interface DomainEntry {
  domain: string;
  vendor: string;
  kind: 'dynamic-qr' | 'shortener' | 'dead-shortener';
  source: string;
  evidence: string;
}

export function normalizeHost(url: string): string | null {
  try {
    let h = new URL(url).hostname.toLowerCase();
    if (h.endsWith('.')) h = h.slice(0, -1);
    if (h.startsWith('www.')) h = h.slice(4);
    return h || null;
  } catch {
    return null;
  }
}

export function matchRedirectDomain(url: string): DomainEntry | null {
  const host = normalizeHost(url);
  if (!host) return null;
  const entries = list.entries as DomainEntry[];
  return entries.find((e) => host === e.domain || host.endsWith(`.${e.domain}`)) ?? null;
}
