/**
 * Demo traffic generator. Emits a spread of realistic events across the seeded
 * tenants and credentials so the dashboard has something to show.
 *
 * Usage: npm run demo:emit          (uses defaults below / env)
 *        COUNT=500 npm run demo:emit
 *
 * The tenant+credential ids must match the seed (apps/api/prisma/seed.ts).
 */
import { ProducerClient } from './index.js';
import type { EventType, PropertyValue } from '@ea/contracts';

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';
const COUNT = Number(process.env.COUNT ?? 400);

// (tenantId, credentialId) pairs. These are fixed in the seed for reproducibility.
const PRODUCERS: { tenantId: string; credentialId: string }[] = [
  { tenantId: 'web-portal', credentialId: '11111111-1111-1111-1111-111111111111' },
  { tenantId: 'mobile-app', credentialId: '22222222-2222-2222-2222-222222222222' },
];

const EVENT_TYPES: EventType[] = [
  'page_view',
  'screen_view',
  'ui_interaction',
  'session_start',
  'session_end',
  'feature_used',
  'error_shown',
  'custom.checkout_completed',
];

const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'IN', 'BR', 'JP'];
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge'];
const OSES = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
const PATHS = ['/', '/pricing', '/docs', '/dashboard', '/settings', '/signup'];

function pick<T>(arr: readonly T[]): T {
  const v = arr[Math.floor(Math.random() * arr.length)];
  if (v === undefined) throw new Error('empty array');
  return v;
}

function randomPastIso(maxDaysAgo: number): string {
  const now = Date.now();
  const offset = Math.floor(Math.random() * maxDaysAgo * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

/** A fake user-agent string; intake derives browser/OS family then drops it. */
function userAgentFor(browser: string, os: string): string {
  return `Mozilla/5.0 (${os}) ${browser}/120.0 (synthetic)`;
}

function payloadFor(eventType: EventType): Record<string, unknown> {
  switch (eventType) {
    case 'page_view':
      return { path: pick(PATHS) };
    case 'screen_view':
      return { screenName: pick(['home', 'profile', 'cart', 'search']) };
    case 'ui_interaction':
      return { elementId: pick(['buy', 'menu', 'filter']), action: pick(['click', 'submit', 'open']) };
    case 'session_end':
      return { durationMs: Math.floor(Math.random() * 600000) };
    case 'feature_used':
      return { featureKey: pick(['export', 'share', 'invite']) };
    case 'error_shown':
      return { errorCode: pick(['E_TIMEOUT', 'E_VALIDATION', 'E_UNKNOWN']) };
    default:
      return {};
  }
}

async function main(): Promise<void> {
  console.log(`Emitting ${COUNT} demo events to ${NATS_URL} ...`);
  const clients = await Promise.all(
    PRODUCERS.map(async (p) => {
      const c = new ProducerClient({ natsUrl: NATS_URL, tenantId: p.tenantId, credentialId: p.credentialId });
      await c.connect();
      return c;
    }),
  );

  let sent = 0;
  for (let i = 0; i < COUNT; i++) {
    const idx = Math.floor(Math.random() * clients.length);
    const client = clients[idx];
    if (!client) continue;
    const eventType = pick(EVENT_TYPES);
    const browser = pick(BROWSERS);
    const os = pick(OSES);
    // ~15% of events are anonymous (no userId).
    const userId = Math.random() < 0.15 ? undefined : `user-${Math.floor(Math.random() * 60)}`;
    const properties: Record<string, PropertyValue> = {
      // 'plan' is on the seeded allow-list; 'secret_note' is NOT and should be dropped.
      plan: pick(['free', 'pro', 'enterprise']),
      secret_note: 'should-be-dropped-not-allow-listed',
    };
    await client.track({
      eventType,
      // Within the 7-day intake bound; spread over the last 6 days so the
      // dashboard shows a populated daily series with complete days.
      eventTime: randomPastIso(6),
      userId,
      properties,
      payload: payloadFor(eventType),
      context: { userAgent: userAgentFor(browser, os), ip: fakeIpFor(pick(COUNTRIES)) },
    });
    sent++;
    if (sent % 100 === 0) console.log(`  ${sent}/${COUNT}`);
  }

  await Promise.all(clients.map((c) => c.close()));
  console.log(`Done. Emitted ${sent} events. Give the ingestion worker a moment to roll them up.`);
}

/** Maps a country to a representative public IP range so intake derives that country. */
function fakeIpFor(country: string): string {
  const prefixes: Record<string, string> = {
    US: '23.1', GB: '81.2', DE: '53.1', FR: '90.2', IN: '49.2', BR: '177.1', JP: '126.1',
  };
  const p = prefixes[country] ?? '23.1';
  return `${p}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
