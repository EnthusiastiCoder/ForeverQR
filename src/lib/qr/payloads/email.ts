import { str } from './escape';
import type { EmailFields, PayloadResult } from './types';

export function emailPayload(f: EmailFields): PayloadResult {
  const to = str(f.to).trim();
  if (!to) return { error: 'Enter an email address.' };
  if (!/^[^\s@]+@[^\s@]+$/.test(to)) return { error: 'That does not look like an email address.' };
  const params: string[] = [];
  const subject = str(f.subject);
  const body = str(f.body);
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return { text: `mailto:${to}${params.length ? '?' + params.join('&') : ''}` };
}
