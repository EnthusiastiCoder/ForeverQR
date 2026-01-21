import { str } from './escape';
import type { GeoFields, PayloadResult } from './types';

function fmt(n: number): string {
  // At most 6 decimals, trailing zeros trimmed; avoid "-0".
  const s = n.toFixed(6).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
}

export function geoPayload(f: GeoFields): PayloadResult {
  const latS = str(f.lat).trim();
  const lngS = str(f.lng).trim();
  if (!latS || !lngS) return { error: 'Enter both latitude and longitude.' };
  const lat = Number(latS);
  const lng = Number(lngS);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: 'Latitude must be between -90 and 90.' };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: 'Longitude must be between -180 and 180.' };
  return { text: `geo:${fmt(lat)},${fmt(lng)}` };
}
