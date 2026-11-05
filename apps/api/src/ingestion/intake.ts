/**
 * Event intake: validate the envelope, strip raw PII, derive coarse values,
 * deduplicate on (tenant, eventId), store the event and update the daily
 * rollup. Failures are dead-lettered with a reason code. This is the heart of
 * the ingestion path (REQ-6, REQ-7, REQ-16, ADR-002/005).
 */
import type { PrismaClient } from '@prisma/client';
import {
  CONTRACT_VERSION_PATTERN,
  EVENT_TYPE_PATTERN,
  TENANT_ID_PATTERN,
  type DeadLetterReason,
  type EventEnvelopeV1,
} from '@ea/contracts';
import {
  deriveBrowserFamily,
  deriveCountry,
  deriveOsFamily,
  pseudonymise,
  utcDay,
} from './derive';

export type IntakeOutcome =
  | { kind: 'stored'; droppedKeys: number }
  | { kind: 'duplicate' }
  | { kind: 'dead-letter'; reason: DeadLetterReason; fieldPath?: string };

const MAX_BYTES = 65536;
const SEVEN_DAYS_MS = 7 * 86_400_000;
const ONE_DAY_MS = 86_400_000;

/** Parse + validate the raw NATS message bytes into a typed envelope, or a reason. */
export function parseEnvelope(
  raw: Uint8Array,
): { ok: true; env: EventEnvelopeV1 } | { ok: false; reason: DeadLetterReason; fieldPath?: string } {
  if (raw.byteLength > MAX_BYTES) return { ok: false, reason: 'oversize' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw).toString('utf8'));
  } catch {
    return { ok: false, reason: 'unparseable' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'schema_violation' };
  }
  const env = parsed as Partial<EventEnvelopeV1>;

  const required: (keyof EventEnvelopeV1)[] = [
    'contractVersion', 'eventId', 'eventType', 'eventTime', 'sentAt', 'tenantId', 'payload', 'producer',
  ];
  for (const key of required) {
    if (env[key] === undefined || env[key] === null) {
      return { ok: false, reason: 'schema_violation', fieldPath: `/${key}` };
    }
  }
  if (typeof env.contractVersion !== 'string' || !CONTRACT_VERSION_PATTERN.test(env.contractVersion)) {
    return { ok: false, reason: 'unsupported_version', fieldPath: '/contractVersion' };
  }
  if (typeof env.tenantId !== 'string' || !TENANT_ID_PATTERN.test(env.tenantId)) {
    return { ok: false, reason: 'schema_violation', fieldPath: '/tenantId' };
  }
  if (typeof env.eventType !== 'string' || !EVENT_TYPE_PATTERN.test(env.eventType)) {
    return { ok: false, reason: 'unknown_event_type', fieldPath: '/eventType' };
  }
  if (typeof env.eventId !== 'string' || env.eventId.length < 1 || env.eventId.length > 64) {
    return { ok: false, reason: 'schema_violation', fieldPath: '/eventId' };
  }
  return { ok: true, env: env as EventEnvelopeV1 };
}

export interface IntakeContext {
  /** Tenant the publishing credential is bound to (from the NATS subject). */
  subjectTenantId: string;
  credentialId: string;
}

export async function processEvent(
  prisma: PrismaClient,
  env: EventEnvelopeV1,
  ctx: IntakeContext,
): Promise<IntakeOutcome> {
  // Tenant in the envelope must match the credential's tenant (AC-9.1).
  if (env.tenantId !== ctx.subjectTenantId) {
    return { kind: 'dead-letter', reason: 'wrong_tenant', fieldPath: '/tenantId' };
  }

  // Timestamp bounds: not more than 7 days before ingest, not more than 24h after sentAt.
  const now = Date.now();
  const eventTime = Date.parse(env.eventTime);
  const sentAt = Date.parse(env.sentAt);
  if (Number.isNaN(eventTime) || Number.isNaN(sentAt)) {
    return { kind: 'dead-letter', reason: 'schema_violation', fieldPath: '/eventTime' };
  }
  if (eventTime < now - SEVEN_DAYS_MS || eventTime > sentAt + ONE_DAY_MS) {
    return { kind: 'dead-letter', reason: 'timestamp_out_of_bounds', fieldPath: '/eventTime' };
  }

  // Deduplicate on (tenant, eventId) (REQ-7).
  const dup = await prisma.dedupKey.findUnique({
    where: { tenantId_eventId: { tenantId: env.tenantId, eventId: env.eventId } },
  });
  if (dup) return { kind: 'duplicate' };

  // --- PII handling: pseudonymise userId, derive coarse values, drop raw context ---
  const subjectId = env.userId ? pseudonymise(env.tenantId, env.userId) : null;
  const country = deriveCountry(env.context?.ip);
  const browserFamily = deriveBrowserFamily(env.context?.userAgent);
  const osFamily = deriveOsFamily(env.context?.userAgent);

  // Only allow-listed property keys are stored; others are dropped and counted.
  const allowed = await prisma.allowedPropertyKey.findMany({
    where: { tenantId: env.tenantId },
    select: { key: true },
  });
  const allowedSet = new Set(allowed.map((a) => a.key));
  const storedProps: Record<string, unknown> = {};
  let droppedKeys = 0;
  for (const [key, value] of Object.entries(env.properties ?? {})) {
    if (allowedSet.has(key)) storedProps[key] = value;
    else droppedKeys++;
  }

  const ingestTs = new Date();
  const eventDate = utcDay(new Date(eventTime));

  // Store event + dedup key + rollup atomically.
  await prisma.$transaction(async (tx) => {
    await tx.dedupKey.create({ data: { tenantId: env.tenantId, eventId: env.eventId } });
    await tx.event.create({
      data: {
        tenantId: env.tenantId,
        eventId: env.eventId,
        ingestDate: utcDay(ingestTs),
        ingestTs,
        eventTs: new Date(eventTime),
        eventDate,
        eventType: env.eventType,
        subjectId,
        country,
        browserFamily,
        osFamily,
        properties: storedProps as object,
        contractVersion: env.contractVersion,
        credentialId: ctx.credentialId,
      },
    });
    // Upsert the daily aggregate cell (subjectKey '' for anonymous).
    const subjectKey = subjectId ?? '';
    await tx.aggDaily.upsert({
      where: {
        tenantId_eventDate_eventType_country_browserFamily_osFamily_subjectKey: {
          tenantId: env.tenantId,
          eventDate,
          eventType: env.eventType,
          country,
          browserFamily,
          osFamily,
          subjectKey,
        },
      },
      update: { eventCount: { increment: 1 } },
      create: {
        tenantId: env.tenantId,
        eventDate,
        eventType: env.eventType,
        country,
        browserFamily,
        osFamily,
        subjectKey,
        eventCount: 1,
      },
    });
  });

  return { kind: 'stored', droppedKeys };
}
