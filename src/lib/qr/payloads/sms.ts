import { str } from './escape';
import type { PayloadResult, SmsFields } from './types';

export function smsPayload(f: SmsFields): PayloadResult {
  const raw = str(f.number).trim();
  const number = raw.replace(/[\s\-().]/g, '');
  if (!number) return { error: 'Enter a phone number.' };
  if (!/^\+?[0-9*#]+$/.test(number)) return { error: 'A phone number has only digits and an optional leading +.' };
  return { text: `SMSTO:${number}:${str(f.message)}` };
}
