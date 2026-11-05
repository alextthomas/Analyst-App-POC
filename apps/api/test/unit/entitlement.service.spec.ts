import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EntitlementService } from '../../src/dashboard/entitlement.service';
import type { PrismaService } from '../../src/prisma.service';

function makePrisma(entitlements: { accountId: string; tenantId: string }[]): PrismaService {
  return {
    entitlement: {
      findUnique: async ({ where }: { where: { accountId_tenantId: { accountId: string; tenantId: string } } }) => {
        const { accountId, tenantId } = where.accountId_tenantId;
        return entitlements.find((e) => e.accountId === accountId && e.tenantId === tenantId) ?? null;
      },
      findMany: async ({ where }: { where: { accountId: string } }) =>
        entitlements
          .filter((e) => e.accountId === where.accountId)
          .map((e) => ({ ...e, tenant: { id: e.tenantId, departmentOwner: 'owner' } })),
    },
  } as unknown as PrismaService;
}

describe('EntitlementService', () => {
  const prisma = makePrisma([
    { accountId: 'u1', tenantId: 'web-portal' },
    { accountId: 'u1', tenantId: 'mobile-app' },
    { accountId: 'u2', tenantId: 'web-portal' },
  ]);
  const svc = new EntitlementService(prisma);

  it('reports entitlement correctly', async () => {
    expect(await svc.isEntitled('u1', 'web-portal')).toBe(true);
    expect(await svc.isEntitled('u2', 'mobile-app')).toBe(false);
  });

  it('assertEntitled passes for an entitled tenant', async () => {
    await expect(svc.assertEntitled('u1', 'mobile-app')).resolves.toBeUndefined();
  });

  it('assertEntitled throws NotFound for a non-entitled tenant (no existence disclosure)', async () => {
    await expect(svc.assertEntitled('u2', 'mobile-app')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists entitled tenants for an account', async () => {
    const tenants = await svc.listEntitledTenants('u1');
    expect(tenants.map((t) => t.id).sort()).toEqual(['mobile-app', 'web-portal']);
  });
});
