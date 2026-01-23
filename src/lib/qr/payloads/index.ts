import { emailPayload } from './email';
import { eventPayload } from './event';
import { geoPayload } from './geo';
import { smsPayload } from './sms';
import { textPayload } from './text';
import type { FieldsByType, PayloadResult, PayloadType } from './types';
import { urlPayload } from './url';
import { vcardPayload } from './vcard';
import { wifiPayload } from './wifi';

export type { FieldsByType, PayloadResult, PayloadType } from './types';
export { zonedToUtc, localTimeZone } from './tz';

export const PAYLOAD_TYPES: PayloadType[] = ['url', 'wifi', 'vcard', 'email', 'sms', 'geo', 'event', 'text'];

const builders: { [K in PayloadType]: (f: FieldsByType[K]) => PayloadResult } = {
  url: urlPayload,
  wifi: wifiPayload,
  vcard: vcardPayload,
  email: emailPayload,
  sms: smsPayload,
  geo: geoPayload,
  event: eventPayload,
  text: textPayload,
};

/** Build the exact QR text for a payload type, or a human-readable error. */
export function buildPayload<K extends PayloadType>(type: K, fields: FieldsByType[K]): PayloadResult {
  const fn = builders[type] as ((f: FieldsByType[K]) => PayloadResult) | undefined;
  if (!fn) return { error: `Unknown type: ${String(type)}` };
  return fn((fields ?? {}) as FieldsByType[K]);
}
