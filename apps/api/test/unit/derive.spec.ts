import { describe, expect, it } from 'vitest';
import {
  deriveBrowserFamily,
  deriveCountry,
  deriveOsFamily,
  pseudonymise,
  utcDay,
} from '../../src/ingestion/derive';

describe('pseudonymise', () => {
  it('is deterministic for the same tenant and user id', () => {
    expect(pseudonymise('t1', 'user-1')).toBe(pseudonymise('t1', 'user-1'));
  });

  it('isolates subjects per tenant (same user id, different tenant => different id)', () => {
    expect(pseudonymise('t1', 'user-1')).not.toBe(pseudonymise('t2', 'user-1'));
  });

  it('differs for different users within a tenant', () => {
    expect(pseudonymise('t1', 'user-1')).not.toBe(pseudonymise('t1', 'user-2'));
  });

  it('produces a 64-char hex digest and never echoes the raw user id', () => {
    const id = pseudonymise('t1', 'alice@example.com');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toContain('alice');
  });
});

describe('deriveCountry', () => {
  it('maps known IP prefixes to countries', () => {
    expect(deriveCountry('23.1.9.9')).toBe('US');
    expect(deriveCountry('81.2.4.4')).toBe('GB');
    expect(deriveCountry('126.1.0.1')).toBe('JP');
  });

  it('returns unknown for unmapped or missing IPs', () => {
    expect(deriveCountry('8.8.8.8')).toBe('unknown');
    expect(deriveCountry(undefined)).toBe('unknown');
  });
});

describe('deriveBrowserFamily', () => {
  it('detects common browsers from the user agent', () => {
    expect(deriveBrowserFamily('Mozilla/5.0 (Windows) Firefox/120.0')).toBe('Firefox');
    expect(deriveBrowserFamily('Mozilla/5.0 (Windows) Chrome/120.0')).toBe('Chrome');
    expect(deriveBrowserFamily('Mozilla/5.0 (Macintosh) Safari/537')).toBe('Safari');
  });

  it('prefers Edge over Chrome when both tokens appear', () => {
    // Real Edge UAs contain both Chrome and Edg tokens.
    expect(deriveBrowserFamily('Mozilla/5.0 Chrome/120 Edg/120.0')).toBe('Edge');
  });

  it('returns unknown when missing or unrecognised', () => {
    expect(deriveBrowserFamily(undefined)).toBe('unknown');
    expect(deriveBrowserFamily('curl/8.0')).toBe('unknown');
  });
});

describe('deriveOsFamily', () => {
  it('detects common OS families', () => {
    expect(deriveOsFamily('... Windows NT 10.0 ...')).toBe('Windows');
    expect(deriveOsFamily('... (iPhone; iOS 17) ...')).toBe('iOS');
    expect(deriveOsFamily('... Android 14 ...')).toBe('Android');
    expect(deriveOsFamily('... Mac OS X 10_15 ...')).toBe('macOS');
    expect(deriveOsFamily('... X11; Linux x86_64 ...')).toBe('Linux');
  });

  it('returns unknown when missing or unrecognised', () => {
    expect(deriveOsFamily(undefined)).toBe('unknown');
    expect(deriveOsFamily('something else')).toBe('unknown');
  });
});

describe('utcDay', () => {
  it('truncates an instant to UTC midnight', () => {
    const d = utcDay(new Date('2026-03-04T23:59:59.999Z'));
    expect(d.toISOString()).toBe('2026-03-04T00:00:00.000Z');
  });

  it('uses the UTC day even when local time would roll over', () => {
    const d = utcDay(new Date('2026-03-04T00:30:00.000Z'));
    expect(d.toISOString()).toBe('2026-03-04T00:00:00.000Z');
  });
});
