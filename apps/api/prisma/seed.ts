/**
 * Seed script. Creates demo accounts, tenants, entitlements, producer
 * credentials (with the fixed ids the demo emitter uses) and allow-listed keys.
 *
 * Demo credentials (POC only - do not use anywhere real):
 *   admin / admin12345   (role admin, entitled to both tenants)
 *   analyst / analyst12345 (role user, entitled to web-portal only)
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const TENANTS = [
  {
    id: 'web-portal',
    departmentOwner: 'Growth (example)',
    privacyNoticeUrl: 'https://example.com/privacy/web-portal',
    credentialId: '11111111-1111-1111-1111-111111111111',
    secret: 'web-portal-demo-secret',
  },
  {
    id: 'mobile-app',
    departmentOwner: 'Mobile (example)',
    privacyNoticeUrl: 'https://example.com/privacy/mobile-app',
    credentialId: '22222222-2222-2222-2222-222222222222',
    secret: 'mobile-app-demo-secret',
  },
];

const ALLOWED_KEYS = ['plan', 'referrer', 'ab_variant'];

async function main(): Promise<void> {
  console.log('Seeding...');

  const adminHash = await argon2.hash('admin12345');
  const analystHash = await argon2.hash('analyst12345');

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
        secretHash: await argon2.hash(t.secret),
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

  console.log('Seed complete.');
  console.log('  admin / admin12345     (admin; web-portal + mobile-app)');
  console.log('  analyst / analyst12345 (user; web-portal only)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
