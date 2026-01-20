import { escapeWifi, str } from './escape';
import type { PayloadResult, WifiFields } from './types';

export function wifiPayload(f: WifiFields): PayloadResult {
  const ssid = str(f.ssid);
  if (!ssid) return { error: 'Enter the network name (SSID).' };
  const enc = f.encryption === 'WEP' || f.encryption === 'nopass' ? f.encryption : 'WPA';
  let out = `WIFI:T:${enc};S:${escapeWifi(ssid)};`;
  if (enc !== 'nopass') {
    const pass = str(f.password);
    if (!pass) return { error: 'Enter the password, or choose "No password".' };
    out += `P:${escapeWifi(pass)};`;
  }
  if (f.hidden === true) out += 'H:true;';
  return { text: out + ';' };
}
