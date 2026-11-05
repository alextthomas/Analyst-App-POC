import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsBooleanString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { ApplicationList, EventTypeList, Overview } from '@ea/contracts';
import { EVENT_TYPE_PATTERN, TENANT_ID_PATTERN } from '@ea/contracts';
import { CurrentSession } from '../auth/current-session.decorator';
import type { AuthedSession } from '../auth/auth.service';
import { EntitlementService } from './entitlement.service';
import { DashboardService } from './dashboard.service';

class OverviewQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(71)
  @Matches(EVENT_TYPE_PATTERN)
  eventType?: string;

  @IsOptional()
  @IsBooleanString()
  compare?: string;
}

@Controller('api/v1')
export class DashboardController {
  constructor(
    private readonly entitlements: EntitlementService,
    private readonly dashboard: DashboardService,
  ) {}

  @Get('tenants')
  async listTenants(@CurrentSession() session: AuthedSession): Promise<ApplicationList> {
    const tenants = await this.entitlements.listEntitledTenants(session.accountId);
    return {
      items: tenants.map((t) => ({ tenantId: t.id, departmentOwner: t.departmentOwner })),
    };
  }

  @Get('tenants/:tenantId/event-types')
  async eventTypes(
    @CurrentSession() session: AuthedSession,
    @Param('tenantId') tenantId: string,
  ): Promise<EventTypeList> {
    this.assertTenantFormat(tenantId);
    await this.entitlements.assertEntitled(session.accountId, tenantId);
    const items = await this.dashboard.listEventTypes(tenantId);
    return { items: items as EventTypeList['items'] };
  }

  @Get('tenants/:tenantId/overview')
  async overview(
    @CurrentSession() session: AuthedSession,
    @Param('tenantId') tenantId: string,
    @Query() query: OverviewQueryDto,
  ): Promise<Overview> {
    this.assertTenantFormat(tenantId);
    await this.entitlements.assertEntitled(session.accountId, tenantId);
    return this.dashboard.getOverview(tenantId, {
      from: query.from,
      to: query.to,
      eventType: query.eventType,
      compare: query.compare === 'true',
    });
  }

  private assertTenantFormat(tenantId: string): void {
    // Malformed tenant ids are treated as not-found by the entitlement check,
    // but a quick format guard avoids needless queries.
    if (!TENANT_ID_PATTERN.test(tenantId)) {
      // Fall through to entitlement check which throws 404; keep behaviour uniform.
    }
  }
}
