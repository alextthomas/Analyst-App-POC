import { Injectable } from '@nestjs/common';
import type { MetricCell, Overview } from '@ea/contracts';
import { PrismaService } from '../prisma.service';
import {
  aggregate,
  buildComparison,
  computeTodaySoFar,
  planRange,
  previousPeriod,
  todayUtc,
  type AggRow,
  type OverviewQuery,
} from './dashboard.aggregate';

export type { OverviewQuery } from './dashboard.aggregate';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async listEventTypes(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.aggDaily.findMany({
      where: { tenantId },
      distinct: ['eventType'],
      select: { eventType: true },
      orderBy: { eventType: 'asc' },
    });
    return rows.map((r) => r.eventType);
  }

  async getOverview(tenantId: string, q: OverviewQuery): Promise<Overview> {
    const today = todayUtc();
    const plan = planRange(q, today);

    const rows = await this.readRows(tenantId, plan.from, plan.to, q.eventType);

    const todaySoFar: MetricCell | undefined = plan.toIsToday ? computeTodaySoFar(rows, today) : undefined;

    if (!plan.hasCompleteDays) {
      // Only today in range: totals/series/breakdowns are absent (ADR-012).
      return {
        tenantId,
        range: { from: q.from, to: q.to, completeDays: 0 },
        totals: { suppressed: false, events: 0, uniqueUsers: 0 },
        series: [],
        topEventTypes: [],
        breakdowns: { country: [], browserFamily: [], osFamily: [], eventType: [] },
        ...(todaySoFar ? { todaySoFar } : {}),
      };
    }

    const completeRows = rows.filter((r) => r.eventDate.getTime() <= plan.lastCompleteDay.getTime());
    const overview = aggregate(tenantId, q, plan.from, plan.lastCompleteDay, completeRows);
    if (todaySoFar) overview.todaySoFar = todaySoFar;

    if (q.compare) {
      const { prevFrom, prevTo } = previousPeriod(plan.from, plan.lastCompleteDay);
      const prevRows = await this.readRows(tenantId, prevFrom, prevTo, q.eventType);
      overview.comparison = buildComparison(prevFrom, prevTo, prevRows, overview.totals);
    }

    return overview;
  }

  private async readRows(
    tenantId: string,
    from: Date,
    to: Date,
    eventType: string | undefined,
  ): Promise<AggRow[]> {
    return this.prisma.aggDaily.findMany({
      where: {
        tenantId,
        eventDate: { gte: from, lte: to },
        ...(eventType ? { eventType } : {}),
      },
      select: {
        eventDate: true,
        eventType: true,
        country: true,
        browserFamily: true,
        osFamily: true,
        subjectKey: true,
        eventCount: true,
      },
    });
  }
}
