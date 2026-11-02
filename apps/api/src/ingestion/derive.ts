/**
 * Intake derivation helpers. These turn raw PII (IP, user agent) into the
 * coarse, non-identifying values the platform is allowed to store, and
 * pseudonymise the user id. Raw inputs are never persisted.
 */
import { createHmac } from 'node:crypto';

// POC pseudonymisation key. In the real design this is a per-tenant HMAC key
// with versioning (ADR-005); here one static key keeps the slice simple.
const PSEUDONYM_KEY = process.env.PSEUDONYM_KEY ?? 'poc-pseudonym-key-not-secret';

/** Per-tenant pseudonymous subject id. Never reversible to the raw user id. */
export function pseudonymise(tenantId: string, userId: string): string {
  return createHmac('sha256', PSEUDONYM_KEY).update(`${tenantId}:${userId}`).digest('hex');
}

/** Map an IP to a coarse country using a small prefix table (POC stand-in for GeoIP). */
export function deriveCountry(ip: string | undefined): string {
  if (!ip) return 'unknown';
  const prefixes: { prefix: string; country: string }[] = [
    { prefix: '23.1.', country: 'US' },
    { prefix: '81.2.', country: 'GB' },
    { prefix: '53.1.', country: 'DE' },
    { prefix: '90.2.', country: 'FR' },
    { prefix: '49.2.', country: 'IN' },
    { prefix: '177.1.', country: 'BR' },
    { prefix: '126.1.', country: 'JP' },
  ];
  for (const { prefix, country } of prefixes) {
    if (ip.startsWith(prefix)) return country;
  }
  return 'unknown';
}

/** Derive a browser family from a user-agent string. */
export function deriveBrowserFamily(ua: string | undefined): string {
  if (!ua) return 'unknown';
  if (/Edg(e|A|iOS)?\//i.test(ua) || /\bEdge\b/i.test(ua)) return 'Edge';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'unknown';
}

/** Derive an OS family from a user-agent string. */
export function deriveOsFamily(ua: string | undefined): string {
  if (!ua) return 'unknown';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS';
  if (/Mac OS X|macOS/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'unknown';
}

/** UTC calendar day (midnight) for a given instant. */
export function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
