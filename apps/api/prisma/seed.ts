/**
 * Seed script. Creates demo accounts, tenants, entitlements, producer
 * credentials (with the fixed ids the demo emitter uses) and allow-listed keys.
 *
 * Accounts: admin (role admin, both tenants) and analyst (role user, web-portal only).
 *
 * Secrets: with EA_DATA_CLASSIFICATION unset (local dev) the legacy demo values
 * from seed-guard.ts apply. With EA_DATA_CLASSIFICATION=synthetic the passwords
 * must come from SEED_ADMIN_PASSWORD / SEED_ANALYST_PASSWORD. Any other value
 * refuses to run. No secret is ever printed.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { resolveSeedSecrets, SeedGuardError } from './seed-guard';

const prisma = new PrismaClient();

const TENANTS = [
  {
    id: 'web-portal',
    departmentOwner: 'Growth (example)',
    privacyNoticeUrl: 'https://example.com/privacy/web-portal',
    credentialId: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: 'mobile-app',
    departmentOwner: 'Mobile (example)',
    privacyNoticeUrl: 'https://example.com/privacy/mobile-app',
    credentialId: '22222222-2222-2222-2222-222222222222',
  },
];

const ALLOWED_KEYS = ['plan', 'referrer', 'ab_variant'];

async function main(): Promise<void> {
  const secrets = resolveSeedSecrets(process.env); // throws SeedGuardError before any DB access
  console.log(secrets.guarded ? 'Seeding (synthetic mode)...' : 'Seeding (local mode)...');

  const adminHash = await argon2.hash(secrets.adminPassword);
  const analystHash = await argon2.hash(secrets.analystPassword);

  const admin = await prisma.account.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminHash, role: 'admin', status: 'active' },
    create: { username: 'admin', role: 'admin', status: 'active', passwordHash: adminHash },
  });
  const analyst = await prisma.account.upsert({
    where: { username: 'analyst' },
    update: { passwordHash: analystHash, role: 'user', status: 'active' },
    create: { username: 'analyst', role: 'user', status: 'active', passwordHash: analystHash },
  });

  for (const t of TENANTS) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: { departmentOwner: t.departmentOwner, privacyNoticeUrl: t.privacyNoticeUrl },
      create: {
        id: t.id,
        departmentOwner: t.departmentOwner,
        privacyNoticeUrl: t.privacyNoticeUrl,
        retentionDays: 396,
      },
    });

    await prisma.producerCredential.upsert({
      where: { id: t.credentialId },
      update: { status: 'active', revokedAt: null },
      create: {
        id: t.credentialId,
        tenantId: t.id,
        secretHash: await argon2.hash(secrets.producerSecret(t.id)),
        status: 'active',
      },
    });

    for (const key of ALLOWED_KEYS) {
      await prisma.allowedPropertyKey.upsert({
        where: { tenantId_key: { tenantId: t.id, key } },
        update: {},
        create: { tenantId: t.id, key },
      });
    }
  }

  // admin -> both tenants; analyst -> web-portal only (demonstrates entitlement scoping).
  const grants: { accountId: string; tenantId: string }[] = [
    { accountId: admin.id, tenantId: 'web-portal' },
    { accountId: admin.id, tenantId: 'mobile-app' },
    { accountId: analyst.id, tenantId: 'web-portal' },
  ];
  for (const g of grants) {
    await prisma.entitlement.upsert({
      where: { accountId_tenantId: g },
      update: {},
      create: g,
    });
  }

  console.log('Seed complete. Accounts: admin (web-portal + mobile-app), analyst (web-portal only).');
}

main()
  .catch((err: unknown) => {
    // Print only a short message: errors can embed query arguments.
    const message = err instanceof SeedGuardError ? err.message : `Seed failed: ${err instanceof Error ? err.name : 'unknown error'}`;
    console.error(message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
