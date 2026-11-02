/**
 * Standalone NATS ingestion worker. Subscribes to ingest.*.* , runs intake for
 * each message, dead-letters failures and keeps per-minute counters for the
 * ingestion-health view. Runs as its own process: `npm run ingest`.
 */
import '../env';
import { PrismaClient } from '@prisma/client';
import { connect, type NatsConnection, type Subscription } from 'nats';
import type { DeadLetterReason } from '@ea/contracts';
import { config } from '../config';
import { parseEnvelope, processEvent } from './intake';
import { utcDay } from './derive';

const prisma = new PrismaClient();

function minuteBucket(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()));
}

async function bumpStats(
  tenantId: string,
  field: 'accepted' | 'duplicates' | 'deadLettered' | 'droppedKeys',
  by = 1,
): Promise<void> {
  const minute = minuteBucket(new Date());
  await prisma.ingestStatsMinute.upsert({
    where: { tenantId_minute: { tenantId, minute } },
    update: { [field]: { increment: by } },
    create: { tenantId, minute, [field]: by },
  });
}

async function deadLetter(
  tenantId: string,
  credentialId: string,
  reason: DeadLetterReason,
  fieldPath?: string,
): Promise<void> {
  await prisma.deadLetter.create({
    data: {
      tenantId,
      credentialId,
      reasonCode: reason,
      fieldPath: fieldPath ?? null,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    },
  });
  await bumpStats(tenantId, 'deadLettered');
}

/** Extract tenantId + credentialId from a subject ingest.<tenant>.<cred>. */
function parseSubject(subject: string): { tenantId: string; credentialId: string } | null {
  const parts = subject.split('.');
  if (parts.length !== 3 || parts[0] !== 'ingest') return null;
  const [, tenantId, credentialId] = parts;
  if (!tenantId || !credentialId) return null;
  return { tenantId, credentialId };
}

async function handleMessage(subject: string, data: Uint8Array): Promise<void> {
  const parsedSubject = parseSubject(subject);
  if (!parsedSubject) return;
  const { tenantId: subjectTenantId, credentialId } = parsedSubject;

  // Only accept from an active credential bound to this tenant (REQ-26).
  const credential = await prisma.producerCredential.findUnique({ where: { id: credentialId } });
  if (!credential || credential.status !== 'active' || credential.tenantId !== subjectTenantId) {
    // Refused at the boundary; nothing stored, nothing dead-lettered.
    return;
  }

  const parsed = parseEnvelope(data);
  if (!parsed.ok) {
    await deadLetter(subjectTenantId, credentialId, parsed.reason, parsed.fieldPath);
    return;
  }

  try {
    const outcome = await processEvent(prisma, parsed.env, { subjectTenantId, credentialId });
    switch (outcome.kind) {
      case 'stored':
        await bumpStats(subjectTenantId, 'accepted');
        if (outcome.droppedKeys > 0) await bumpStats(subjectTenantId, 'droppedKeys', outcome.droppedKeys);
        break;
      case 'duplicate':
        await bumpStats(subjectTenantId, 'duplicates');
        break;
      case 'dead-letter':
        await deadLetter(subjectTenantId, credentialId, outcome.reason, outcome.fieldPath);
        break;
    }
  } catch (err) {
    // Unexpected failure: dead-letter as schema_violation so nothing is lost silently.
    // eslint-disable-next-line no-console
    console.error('intake error', err);
    await deadLetter(subjectTenantId, credentialId, 'schema_violation');
  }
}

async function main(): Promise<void> {
  await prisma.$connect();
  const nc: NatsConnection = await connect({ servers: config.natsUrl, name: 'ea-ingest' });
  // eslint-disable-next-line no-console
  console.log(`Ingestion worker connected to ${config.natsUrl}; subscribing to ingest.*.*`);
  const sub: Subscription = nc.subscribe('ingest.*.*');

  // Avoid 'unused import' and document the daily partition concept in the full design.
  void utcDay;

  for await (const msg of sub) {
    await handleMessage(msg.subject, msg.data).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('handler error', err);
    });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Ingestion worker failed', err);
  process.exit(1);
});

// Graceful shutdown.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}
