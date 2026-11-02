import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import type {
  Account,
  AllowedKey,
  DeadLetterPage,
  Entitlement,
  IngestionHealth,
  ProducerCredential,
  ProducerCredentialIssued,
  Tenant,
} from '@ea/contracts';
import { PrismaService } from '../prisma.service';

const PAGE_SIZE = 50;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ----- tenants -----
  async listTenants(): Promise<Tenant[]> {
    const rows = await this.prisma.tenant.findMany({ orderBy: { id: 'asc' } });
    return rows.map(toTenant);
  }

  async createTenant(input: { tenantId: string; departmentOwner: string; privacyNoticeUrl: string }): Promise<Tenant> {
    const existing = await this.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (existing) throw new ConflictException({ code: 'duplicate', title: 'Tenant already exists' });
    const row = await this.prisma.tenant.create({
      data: {
        id: input.tenantId,
        departmentOwner: input.departmentOwner,
        privacyNoticeUrl: input.privacyNoticeUrl,
      },
    });
    return toTenant(row);
  }

  // ----- accounts -----
  async listAccounts(): Promise<Account[]> {
    const rows = await this.prisma.account.findMany({ orderBy: { username: 'asc' } });
    return rows.map(toAccount);
  }

  async createAccount(input: { username: string; role: 'user' | 'admin'; password: string }): Promise<Account> {
    const existing = await this.prisma.account.findUnique({ where: { username: input.username } });
    if (existing) throw new ConflictException({ code: 'duplicate', title: 'Username already exists' });
    const row = await this.prisma.account.create({
      data: {
        username: input.username,
        role: input.role,
        status: 'active',
        passwordHash: await argon2.hash(input.password),
      },
    });
    return toAccount(row);
  }

  // ----- entitlements -----
  async listEntitlements(accountId: string): Promise<Entitlement[]> {
    await this.assertAccount(accountId);
    const rows = await this.prisma.entitlement.findMany({
      where: { accountId },
      orderBy: { tenantId: 'asc' },
    });
    return rows.map((r) => ({ tenantId: r.tenantId, grantedAt: r.grantedAt.toISOString() }));
  }

  async grantEntitlement(accountId: string, tenantId: string): Promise<Entitlement> {
    await this.assertAccount(accountId);
    await this.assertTenant(tenantId);
    const row = await this.prisma.entitlement.upsert({
      where: { accountId_tenantId: { accountId, tenantId } },
      update: {},
      create: { accountId, tenantId },
    });
    return { tenantId: row.tenantId, grantedAt: row.grantedAt.toISOString() };
  }

  async revokeEntitlement(accountId: string, tenantId: string): Promise<void> {
    await this.prisma.entitlement
      .delete({ where: { accountId_tenantId: { accountId, tenantId } } })
      .catch(() => undefined);
  }

  // ----- producer credentials -----
  async listCredentials(tenantId?: string): Promise<ProducerCredential[]> {
    const rows = await this.prisma.producerCredential.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCredential);
  }

  async createCredential(tenantId: string): Promise<ProducerCredentialIssued> {
    await this.assertTenant(tenantId);
    const secret = randomBytes(32).toString('base64url');
    const row = await this.prisma.producerCredential.create({
      data: { tenantId, secretHash: await argon2.hash(secret), status: 'active' },
    });
    return { ...toCredential(row), secret };
  }

  async revokeCredential(credentialId: string): Promise<ProducerCredential> {
    const existing = await this.prisma.producerCredential.findUnique({ where: { id: credentialId } });
    if (!existing) throw new NotFoundException({ code: 'not-found', title: 'Credential not found' });
    const row = await this.prisma.producerCredential.update({
      where: { id: credentialId },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    return toCredential(row);
  }

  // ----- allowed keys -----
  async listAllowedKeys(tenantId: string): Promise<AllowedKey[]> {
    await this.assertTenant(tenantId);
    const rows = await this.prisma.allowedPropertyKey.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });
    return rows.map((r) => ({ key: r.key, addedAt: r.addedAt.toISOString() }));
  }

  async addAllowedKey(tenantId: string, key: string): Promise<AllowedKey> {
    await this.assertTenant(tenantId);
    const existing = await this.prisma.allowedPropertyKey.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (existing) throw new ConflictException({ code: 'duplicate', title: 'Key already allow-listed' });
    const row = await this.prisma.allowedPropertyKey.create({ data: { tenantId, key } });
    return { key: row.key, addedAt: row.addedAt.toISOString() };
  }

  async removeAllowedKey(tenantId: string, key: string): Promise<void> {
    await this.prisma.allowedPropertyKey
      .delete({ where: { tenantId_key: { tenantId, key } } })
      .catch(() => undefined);
  }

  // ----- ingestion health -----
  async ingestionHealth(): Promise<IngestionHealth> {
    const tenants = await this.prisma.tenant.findMany({ orderBy: { id: 'asc' } });
    const since = new Date(Date.now() - 60_000);
    const result = await Promise.all(
      tenants.map(async (t) => {
        const [statsAgg, deadLetterCount] = await Promise.all([
          this.prisma.ingestStatsMinute.aggregate({
            where: { tenantId: t.id, minute: { gte: since } },
            _sum: { accepted: true, deadLettered: true },
          }),
          this.prisma.deadLetter.count({ where: { tenantId: t.id, expiresAt: { gt: new Date() } } }),
        ]);
        return {
          tenantId: t.id,
          throughputPerMinute: statsAgg._sum.accepted ?? 0,
          lagSeconds: 0,
          deadLetterCount,
          refusedPublishCount: 0,
          status: 'ok' as const,
          dataAsOf: new Date().toISOString(),
        };
      }),
    );
    return { tenants: result };
  }

  // ----- dead letters -----
  async listDeadLetters(tenantId: string, page: number): Promise<DeadLetterPage> {
    await this.assertTenant(tenantId);
    const where = { tenantId };
    const [rows, totalItems] = await Promise.all([
      this.prisma.deadLetter.findMany({
        where,
        orderBy: { deadLetteredAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.deadLetter.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        deadLetterId: r.id,
        tenantId: r.tenantId,
        reasonCode: r.reasonCode,
        fieldPath: r.fieldPath,
        deadLetteredAt: r.deadLetteredAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
      })),
      page,
      pageSize: PAGE_SIZE,
      totalItems,
    };
  }

  private async assertAccount(accountId: string): Promise<void> {
    const row = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!row) throw new NotFoundException({ code: 'not-found', title: 'Account not found' });
  }

  private async assertTenant(tenantId: string): Promise<void> {
    const row = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!row) throw new NotFoundException({ code: 'not-found', title: 'Tenant not found' });
  }
}

function toTenant(row: {
  id: string;
  departmentOwner: string;
  privacyNoticeUrl: string;
  retentionDays: number;
  createdAt: Date;
}): Tenant {
  return {
    tenantId: row.id,
    departmentOwner: row.departmentOwner,
    privacyNoticeUrl: row.privacyNoticeUrl,
    retentionDays: row.retentionDays,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAccount(row: {
  id: string;
  username: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  createdAt: Date;
}): Account {
  return {
    accountId: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCredential(row: {
  id: string;
  tenantId: string;
  status: 'active' | 'revoked';
  createdAt: Date;
}): ProducerCredential {
  return {
    credentialId: row.id,
    tenantId: row.tenantId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
