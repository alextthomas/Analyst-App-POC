/**
 * Pure aggregation logic for the dashboard overview. Kept free of Prisma/Nest
 * so the k-anonymity suppression, date-range validation and rollup maths can be
 * unit-tested in isolation. DashboardService wires these to the database.
 */
import { BadRequestException } from '@nestjs/common';
import type {
  MetricCell,
  NamedBreakdown,
  Overview,
  OverviewBreakdowns,
  SeriesPoint,
} from '@ea/contracts';
import { config } from '../config';

/** One agg_daily row as read for aggregation. */
export interface AggRow {
  eventDate: Date;
  eventType: string;
  country: string;
  browserFamily: string;
  osFamily: string;
  subjectKey: string;
  eventCount: number;
}

export interface OverviewQuery {
  from: string;
  to: string;
  eventType?: string;
  compare?: boolean;
}

/** Accumulates events and the set of distinct subject keys for k-anonymity. */
export class CellAccumulator {
  events = 0;
  private readonly subjects = new Set<string>();

  add(subjectKey: string, count: number): void {
    this.events += count;
    // '' means anonymous; it does not count towards unique users.
    if (subjectKey !== '') this.subjects.add(subjectKey);
  }

  /** Unique identified users seen in this cell. */
  get uniqueUsers(): number {
    return this.subjects.size;
  }

  /**
   * Suppress a cell when it has at least one identified user but fewer than k.
   * A purely anonymous cell (0 unique users) is not a re-identification risk
   * and is shown with uniqueUsers 0 (ADR-012 anonymous-cell rule, simplified).
   */
  toCell(): MetricCell {
    if (this.uniqueUsers > 0 && this.uniqueUsers < config.kThreshold) {
      return { suppressed: true };
    }
    return { suppressed: false, events: this.events, uniqueUsers: this.uniqueUsers };
  }
}

export function parseUtcDay(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException({
      code: 'validation-error',
      title: 'Invalid date',
      errors: [{ field, code: 'format' }],
    });
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException({
      code: 'validation-error',
      title: 'Invalid date',
      errors: [{ field, code: 'format' }],
    });
  }
  return d;
}

export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function daysBetweenInclusive(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export interface RangePlan {
  from: Date;
  to: Date;
  toIsToday: boolean;
  lastCompleteDay: Date;
  hasCompleteDays: boolean;
}

/**
 * Validate the requested range and compute the complete-day plan. Throws
 * BadRequestException on invalid input (bad format, from>to, to in the future,
 * range longer than 396 days).
 */
export function planRange(q: OverviewQuery, today: Date = todayUtc()): RangePlan {
  const from = parseUtcDay(q.from, '/from');
  const to = parseUtcDay(q.to, '/to');

  if (from.getTime() > to.getTime()) {
    throw new BadRequestException({
      code: 'validation-error',
      title: 'from must be on or before to',
      errors: [{ field: '/from', code: 'date-order' }],
    });
  }
  if (to.getTime() > today.getTime()) {
    throw new BadRequestException({
      code: 'validation-error',
      title: 'to must not be after the current UTC day',
      errors: [{ field: '/to', code: 'date-not-allowed' }],
    });
  }
  if (daysBetweenInclusive(from, to) > 396) {
    throw new BadRequestException({
      code: 'validation-error',
      title: 'Range may be at most 396 days',
      errors: [{ field: '/to', code: 'range-too-long' }],
    });
  }

  const toIsToday = to.getTime() === today.getTime();
  const lastCompleteDay = toIsToday ? addDays(today, -1) : to;
  const hasCompleteDays = lastCompleteDay.getTime() >= from.getTime();
  return { from, to, toIsToday, lastCompleteDay, hasCompleteDays };
}

/** Sum the current UTC day's rows into a single (suppressible) cell. */
export function computeTodaySoFar(rows: AggRow[], today: Date): MetricCell {
  const acc = new CellAccumulator();
  const todayIso = isoDay(today);
  for (const r of rows) {
    if (isoDay(r.eventDate) === todayIso) acc.add(r.subjectKey, r.eventCount);
  }
  return acc.toCell();
}

/** Build the overview body (totals, series, top types, breakdowns) from complete-day rows. */
export function aggregate(
  tenantId: string,
  q: OverviewQuery,
  from: Date,
  lastCompleteDay: Date,
  rows: AggRow[],
): Overview {
  const totals = new CellAccumulator();
  const byDay = new Map<string, CellAccumulator>();
  const byType = new Map<string, CellAccumulator>();
  const byCountry = new Map<string, CellAccumulator>();
  const byBrowser = new Map<string, CellAccumulator>();
  const byOs = new Map<string, CellAccumulator>();

  const bump = (m: Map<string, CellAccumulator>, key: string, subjectKey: string, count: number): void => {
    let acc = m.get(key);
    if (!acc) {
      acc = new CellAccumulator();
      m.set(key, acc);
    }
    acc.add(subjectKey, count);
  };

  for (const r of rows) {
    totals.add(r.subjectKey, r.eventCount);
    bump(byDay, isoDay(r.eventDate), r.subjectKey, r.eventCount);
    bump(byType, r.eventType, r.subjectKey, r.eventCount);
    bump(byCountry, r.country, r.subjectKey, r.eventCount);
    bump(byBrowser, r.browserFamily, r.subjectKey, r.eventCount);
    bump(byOs, r.osFamily, r.subjectKey, r.eventCount);
  }

  // Continuous daily series across complete days (zero-filled).
  const series: SeriesPoint[] = [];
  for (let d = new Date(from); d.getTime() <= lastCompleteDay.getTime(); d = addDays(d, 1)) {
    const key = isoDay(d);
    const acc = byDay.get(key);
    series.push({ date: key, cell: acc ? acc.toCell() : { suppressed: false, events: 0, uniqueUsers: 0 } });
  }

  const toBreakdown = (m: Map<string, CellAccumulator>): NamedBreakdown[] =>
    [...m.entries()]
      .map(([key, acc]) => ({ key, cell: acc.toCell(), _events: acc.events }))
      .sort((a, b) => b._events - a._events)
      .map(({ key, cell }) => ({ key, cell }));

  const topEventTypes = toBreakdown(byType).slice(0, 10);
  const breakdowns: OverviewBreakdowns = {
    country: toBreakdown(byCountry),
    browserFamily: toBreakdown(byBrowser),
    osFamily: toBreakdown(byOs),
    eventType: toBreakdown(byType),
  };

  return {
    tenantId,
    range: { from: q.from, to: q.to, completeDays: series.length },
    totals: totals.toCell(),
    series,
    topEventTypes,
    breakdowns,
  };
}

/** Compute the previous-period window of the same number of complete days. */
export function previousPeriod(from: Date, lastCompleteDay: Date): { prevFrom: Date; prevTo: Date } {
  const span = daysBetweenInclusive(from, lastCompleteDay);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(span - 1));
  return { prevFrom, prevTo };
}

/** Build the comparison block from the previous period's rows and current totals. */
export function buildComparison(
  prevFrom: Date,
  prevTo: Date,
  prevRows: AggRow[],
  currentTotals: MetricCell,
): NonNullable<Overview['comparison']> {
  const acc = new CellAccumulator();
  for (const r of prevRows) acc.add(r.subjectKey, r.eventCount);
  const prevCell = acc.toCell();

  let eventsPercentChange: number | null = null;
  const prevEvents = prevCell.suppressed ? null : prevCell.events;
  const curEvents = currentTotals.suppressed ? null : currentTotals.events;
  if (prevEvents !== null && curEvents !== null && prevEvents > 0) {
    eventsPercentChange = Math.round(((curEvents - prevEvents) / prevEvents) * 1000) / 10;
  }

  return {
    from: isoDay(prevFrom),
    to: isoDay(prevTo),
    totals: prevCell,
    eventsPercentChange,
  };
}
