import { str } from './escape';
import type { PayloadResult, TextFields } from './types';

export function textPayload(f: TextFields): PayloadResult {
  const t = str(f.text);
  if (!t) return { error: 'Enter some text.' };
  return { text: t };
}
