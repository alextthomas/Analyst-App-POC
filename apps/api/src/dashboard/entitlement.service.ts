import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async isEntitled(accountId: string, tenantId: string): Promise<boolean> {
    const row = await this.prisma.entitlement.findUnique({
      where: { accountId_tenantId: { accountId, tenantId } },
    });
    return row !== null;
  }

  /**
   * Enforce entitlement. A non-entitled OR non-existent tenant both yield 404,
   * so the API never discloses which tenants exist (AC-7.1, AC-7.3).
   */
  async assertEntitled(accountId: string, tenantId: string): Promise<void> {
    if (!(await this.isEntitled(accountId, tenantId))) {
      throw new NotFoundException({ code: 'not-found', title: 'Not found' });
    }
  }

  async listEntitledTenants(accountId: string) {
    const rows = await this.prisma.entitlement.findMany({
      where: { accountId },
      include: { tenant: true },
      orderBy: { tenantId: 'asc' },
    });
    return rows.map((r) => r.tenant);
  }
}
