// WS1 cases #16-#18: the QR encoder (byte mode, UTF-8).
import { describe, expect, it } from 'vitest';

const encoder = () => import('../../src/lib/qr/encode');

const ECCS = ['L', 'M', 'Q', 'H'] as const;

describe('encode', () => {
  it('#16 HELLO at M is version 1, 21 modules', async () => {
    const { encode } = await encoder();
    const m = encode('HELLO', 'M');
    expect(m.version).toBe(1);
    expect(m.size).toBe(21);
    expect(m.ecc).toBe('M');
    expect(m.isDark(0, 0)).toBe(true); // top-left finder corner
    expect(m.isDark(1, 1)).toBe(false); // finder's light ring
  });

  it('#17 capacity limits at version 40 (H 1273 bytes, L 2953 bytes)', async () => {
    const { encode, CapacityError } = await encoder();
    expect(encode('a'.repeat(1273), 'H').version).toBe(40);
    let thrown: unknown;
    try {
      encode('a'.repeat(1274), 'H');
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(CapacityError);
    expect((thrown as { maxBytes: number }).maxBytes).toBe(1273);
    expect(encode('a'.repeat(2953), 'L').version).toBe(40);
  });

  it('#18 a higher ECC never gives a lower version', async () => {
    const { encode } = await encoder();
    const texts = [
      'HELLO',
      'https://example.com/',
      'x'.repeat(100),
      'Café ✓ 日本 '.repeat(20),
      'a'.repeat(1000),
    ];
    for (const t of texts) {
      const versions = ECCS.map((e) => encode(t, e).version);
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i], `${t.slice(0, 20)}: ${versions.join(',')}`).toBeGreaterThanOrEqual(
          versions[i - 1],
        );
      }
    }
  });
});
