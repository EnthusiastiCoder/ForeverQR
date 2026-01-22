import { escapeText, str } from './escape';
import type { PayloadResult, VcardFields } from './types';

export function vcardPayload(f: VcardFields): PayloadResult {
  const v = (k: keyof VcardFields) => str(f[k]).trim();
  const first = v('first');
  const last = v('last');
  const org = v('org');
  if (!first && !last && !org) return { error: 'Enter a name or an organisation.' };
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeText(last)};${escapeText(first)};;;`];
  const full = [first, last].filter(Boolean).join(' ') || org;
  lines.push(`FN:${escapeText(full)}`);
  const add = (prop: string, value: string) => {
    if (value) lines.push(`${prop}:${escapeText(value)}`);
  };
  add('ORG', org);
  add('TITLE', v('title'));
  if (v('phoneCell')) lines.push(`TEL;TYPE=CELL:${v('phoneCell')}`);
  if (v('phoneWork')) lines.push(`TEL;TYPE=WORK:${v('phoneWork')}`);
  if (v('email')) lines.push(`EMAIL:${v('email')}`);
  if (v('url')) lines.push(`URL:${v('url')}`);
  const adr = [v('street'), v('city'), v('region'), v('zip'), v('country')];
  if (adr.some(Boolean)) lines.push(`ADR;TYPE=WORK:;;${adr.map(escapeText).join(';')}`);
  // Notes keep their inner newlines (escaped as \n), so they are not trimmed.
  const note = str(f.note);
  if (note.trim()) lines.push(`NOTE:${escapeText(note)}`);
  lines.push('END:VCARD');
  return { text: lines.join('\r\n') };
}
