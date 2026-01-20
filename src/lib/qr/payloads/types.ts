export type PayloadType = 'url' | 'wifi' | 'vcard' | 'email' | 'sms' | 'geo' | 'event' | 'text';
export type PayloadResult = { text: string } | { error: string };

export interface UrlFields { url: string }
export interface WifiFields { ssid: string; password?: string; encryption?: 'WPA' | 'WEP' | 'nopass'; hidden?: boolean }
export interface EmailFields { to: string; subject?: string; body?: string }
export interface SmsFields { number: string; message?: string }
export interface GeoFields { lat: string; lng: string }
export interface VcardFields {
  first?: string; last?: string; org?: string; title?: string; phoneCell?: string; phoneWork?: string;
  email?: string; url?: string; street?: string; city?: string; region?: string; zip?: string;
  country?: string; note?: string;
}
export interface EventFields {
  summary?: string; start: string; end?: string; timeZone?: string; allDay?: boolean;
  location?: string; description?: string;
}
export interface TextFields { text: string }

export interface FieldsByType {
  url: UrlFields; wifi: WifiFields; vcard: VcardFields; email: EmailFields; sms: SmsFields;
  geo: GeoFields; event: EventFields; text: TextFields;
}
