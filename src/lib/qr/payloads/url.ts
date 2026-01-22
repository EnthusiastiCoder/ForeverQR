import { str } from './escape';
import type { PayloadResult, UrlFields } from './types';

export function urlPayload(f: UrlFields): PayloadResult {
  const raw = str(f.url).trim();
  if (!raw) return { error: 'Enter a web address.' };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^:/]+:\d+(\/|$)/.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { error: 'That does not look like a web address.' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Only http:// and https:// addresses work here.' };
  if (!u.hostname) return { error: 'That does not look like a web address.' };
  return { text: u.href };
}
