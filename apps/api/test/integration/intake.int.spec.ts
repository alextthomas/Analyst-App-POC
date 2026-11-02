import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EventEnvelopeV1 } from '@ea/contracts';
import { processEvent } from '../../src/ingestion/intake';
import { dbReachable, prisma, uid } from './helpers';

const TENANT = `it-intake-${uid()}`;
const CRED = '33333333-3333-3333-3333-333333333333';

function envelope(overrides: Partial<EventEnvelopeV1> = {}): EventEnvelopeV1 {
  const now = new Date();
  return {
    contractVersion: '1.0',
    eventId: `evt-${uid()}`,
    eventType: 'page_view',
    eventTime: now.toISOString(),
    sentAt: now.toISOString(),
    tenantId: TENANT,
    payload: { path: '/' },
    producer: { kit: 'typescript', kitVersion: '0.1.0' },
    ...overrides,
  };
}

let dbUp = false;

beforeAll(async () => {
  dbUp = await dbReachable();
  if (!dbUp) return;
  await prisma.tenant.upsert({
    where: { id: TENANT },
    update: {},
    create: { id: TENANT, departmentOwner: 'IT (test)', privacyNoticeUrl: 'https://example.com/privacy/test' },
  });
  await prisma.allowedPropertyKey.upsert({
    where: { tenantId_key: { tenantId: TENANT, key: 'plan' } },
    update: {},
    create: { tenantId: TENANT, key: 'plan' },
  });
});

afterAll(async () => {
  if (dbUp) {
    // Clean up everything this suite created, children first.
    await prisma.event.deleteMany({ where: { tenantId: TENANT } });
    await prisma.dedupKey.deleteMany({ where: { tenantId: TENANT } });
    await prisma.aggDaily.deleteMany({ where: { tenantId: TENANT } });
    await prisma.allowedPropertyKey.deleteMany({ where: { tenantId: TENANT } });
    await prisma.tenant.deleteMany({ where: { id: TENANT } });
  }
  await prisma.$disconnect();
});

describe.runIf(process.env.SKIP_DB !== '1')('processEvent (integration, real Postgres)', () => {
  it('stores a valid event, pseudonymises the user and drops non-allow-listed keys', async () => {
    if (!dbUp) return expect.unreachable('Postgres not reachable; start docker (npm run infra:up)');
    const env = envelope({
      userId: 'alice',
      properties: { plan: 'pro', secret_note: 'should-be-dropped' },
      context: { ip: '23.1.1.1', userAgent: 'Mozilla/5.0 (Windows) Chrome/120.0' },
    });

    const outcome = await processEvent(prisma, env, { subjectTenantId: TENANT, credentialId: CRED });
    expect(outcome.kind).toBe('stored');
    if (outcome.kind === 'stored') expect(outcome.droppedKeys).toBe(1); // secret_note dropped

    const stored = await prisma.event.findUnique({
      where: { tenantId_eventId: { tenantId: TENANT, eventId: env.eventId } },
    });
    expect(stored).not.toBeNull();
    // Raw PII is never stored: no raw userId, ip or userAgent.
    expect(stored!.subjectId).toMatch(/^[0-9a-f]{64}$/);
    expect(stored!.country).toBe('US');
    expect(stored!.browserFamily).toBe('Chrome');
    expect(stored!.osFamily).toBe('Windows');
    const props = stored!.properties as Record<string, unknown>;
    expect(props).toHaveProperty('plan', 'pro');
    expect(props).not.toHaveProperty('secret_note');

    // Aggregate cell exists for this event.
    const agg = await prisma.aggDaily.findFirst({ where: { tenantId: TENANT, eventType: 'page_view' } });
    expect(agg).not.toBeNull();
  });

  it('detects a duplicate (tenant, eventId)', async () => {
    if (!dbUp) return expect.unreachable('Postgres not reachable');
    const env = envelope({ eventId: `dup-${uid()}` });
    const first = await processEvent(prisma, env, { subjectTenantId: TENANT, credentialId: CRED });
    expect(first.kind).toBe('stored');
    const second = await processEvent(prisma, env, { subjectTenantId: TENANT, credentialId: CRED });
    expect(second.kind).toBe('duplicate');
  });

  it('dead-letters an envelope whose tenant does not match the credential subject', async () => {
    if (!dbUp) return expect.unreachable('Postgres not reachable');
    const env = envelope({ tenantId: TENANT });
    const outcome = await processEvent(prisma, env, { subjectTenantId: 'some-other-tenant', credentialId: CRED });
    expect(outcome).toMatchObject({ kind: 'dead-letter', reason: 'wrong_tenant' });
  });

  it('dead-letters an out-of-bounds timestamp (older than 7 days)', async () => {
    if (!dbUp) return expect.unreachable('Postgres not reachable');
    const old = new Date(Date.now() - 9 * 86_400_000).toISOString();
    const env = envelope({ eventTime: old });
    const outcome = await processEvent(prisma, env, { subjectTenantId: TENANT, credentialId: CRED });
    expect(outcome).toMatchObject({ kind: 'dead-letter', reason: 'timestamp_out_of_bounds' });
  });

  it('stores an anonymous event (no userId) with a null subject id', async () => {
    if (!dbUp) return expect.unreachable('Postgres not reachable');
    const env = envelope({ eventId: `anon-${uid()}` });
    const outcome = await processEvent(prisma, env, { subjectTenantId: TENANT, credentialId: CRED });
    expect(outcome.kind).toBe('stored');
    const stored = await prisma.event.findUnique({
      where: { tenantId_eventId: { tenantId: TENANT, eventId: env.eventId } },
    });
    expect(stored!.subjectId).toBeNull();
  });
});
