import { describe, expect, it } from 'vitest';
import {
  aggregate,
  buildComparison,
  CellAccumulator,
  computeTodaySoFar,
  daysBetweenInclusive,
  planRange,
  previousPeriod,
  type AggRow,
  type OverviewQuery,
} from '../../src/dashboard/dashboard.aggregate';

function row(partial: Partial<AggRow> & { eventDate: string }): AggRow {
  return {
    eventDate: new Date(`${partial.eventDate}T00:00:00.000Z`),
    eventType: partial.eventType ?? 'page_view',
    country: partial.country ?? 'US',
    browserFamily: partial.browserFamily ?? 'Chrome',
    osFamily: partial.osFamily ?? 'Windows',
    subjectKey: partial.subjectKey ?? 'u1',
    eventCount: partial.eventCount ?? 1,
  };
}

describe('CellAccumulator (k=5 suppression)', () => {
  it('shows a cell with 5 or more unique users', () => {
    const acc = new CellAccumulator();
    for (let i = 0; i < 5; i++) acc.add(`u${i}`, 2);
    expect(acc.toCell()).toEqual({ suppressed: false, events: 10, uniqueUsers: 5 });
  });

  it('suppresses a cell with 1 to 4 identified users', () => {
    const acc = new CellAccumulator();
    for (let i = 0; i < 4; i++) acc.add(`u${i}`, 3);
    expect(acc.toCell()).toEqual({ suppressed: true });
  });

  it('does not suppress a purely anonymous cell (0 unique users)', () => {
    const acc = new CellAccumulator();
    acc.add('', 7);
    acc.add('', 3);
    expect(acc.toCell()).toEqual({ suppressed: false, events: 10, uniqueUsers: 0 });
  });

  it('counts anonymous events towards the total but not unique users', () => {
    const acc = new CellAccumulator();
    for (let i = 0; i < 5; i++) acc.add(`u${i}`, 1);
    acc.add('', 100);
    const cell = acc.toCell();
    expect(cell).toEqual({ suppressed: false, events: 105, uniqueUsers: 5 });
  });

  it('counts each distinct subject only once', () => {
    const acc = new CellAccumulator();
    acc.add('u1', 1);
    acc.add('u1', 1);
    acc.add('u1', 1);
    // 1 unique user, below k, so suppressed.
    expect(acc.toCell()).toEqual({ suppressed: true });
  });
});

describe('planRange validation', () => {
  const today = new Date('2026-03-10T00:00:00.000Z');

  it('rejects a malformed date', () => {
    expect(() => planRange({ from: '2026/03/01', to: '2026-03-05' }, today)).toThrowError();
  });

  it('rejects from after to', () => {
    expect(() => planRange({ from: '2026-03-05', to: '2026-03-01' }, today)).toThrowError();
  });

  it('rejects to after the current UTC day', () => {
    expect(() => planRange({ from: '2026-03-01', to: '2026-03-11' }, today)).toThrowError();
  });

  it('rejects a range longer than 396 days', () => {
    expect(() => planRange({ from: '2024-01-01', to: '2026-03-10' }, today)).toThrowError();
  });

  it('treats to == today as having today partial and complete days before it', () => {
    const plan = planRange({ from: '2026-03-01', to: '2026-03-10' }, today);
    expect(plan.toIsToday).toBe(true);
    expect(plan.hasCompleteDays).toBe(true);
    expect(plan.lastCompleteDay.toISOString()).toBe('2026-03-09T00:00:00.000Z');
  });

  it('reports no complete days when only today is in range', () => {
    const plan = planRange({ from: '2026-03-10', to: '2026-03-10' }, today);
    expect(plan.hasCompleteDays).toBe(false);
  });
});

describe('daysBetweenInclusive', () => {
  it('counts inclusive whole days', () => {
    expect(
      daysBetweenInclusive(new Date('2026-03-01T00:00:00Z'), new Date('2026-03-01T00:00:00Z')),
    ).toBe(1);
    expect(
      daysBetweenInclusive(new Date('2026-03-01T00:00:00Z'), new Date('2026-03-07T00:00:00Z')),
    ).toBe(7);
  });
});

describe('aggregate', () => {
  const q: OverviewQuery = { from: '2026-03-01', to: '2026-03-03' };
  const from = new Date('2026-03-01T00:00:00.000Z');
  const lastCompleteDay = new Date('2026-03-03T00:00:00.000Z');

  it('zero-fills the daily series across every complete day', () => {
    // Only day 1 has data; days 2 and 3 should appear as zero cells.
    const rows: AggRow[] = [
      ...Array.from({ length: 5 }, (_, i) => row({ eventDate: '2026-03-01', subjectKey: `u${i}` })),
    ];
    const ov = aggregate('web-portal', q, from, lastCompleteDay, rows);
    expect(ov.series.map((p) => p.date)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
    expect(ov.series[1]!.cell).toEqual({ suppressed: false, events: 0, uniqueUsers: 0 });
    expect(ov.range.completeDays).toBe(3);
  });

  it('ranks top event types by event volume and caps at 10', () => {
    const rows: AggRow[] = [];
    // 12 event types; give each a descending count and >=5 users so none suppress.
    for (let t = 0; t < 12; t++) {
      for (let u = 0; u < 5; u++) {
        rows.push(row({ eventDate: '2026-03-01', eventType: `custom.t${t}`, subjectKey: `u${t}_${u}`, eventCount: 12 - t }));
      }
    }
    const ov = aggregate('web-portal', q, from, lastCompleteDay, rows);
    expect(ov.topEventTypes).toHaveLength(10);
    expect(ov.topEventTypes[0]!.key).toBe('custom.t0'); // highest count
  });

  it('suppresses per-dimension cells independently', () => {
    const rows: AggRow[] = [
      // US: 5 users -> visible
      ...Array.from({ length: 5 }, (_, i) => row({ eventDate: '2026-03-01', country: 'US', subjectKey: `us${i}` })),
      // GB: 2 users -> suppressed
      ...Array.from({ length: 2 }, (_, i) => row({ eventDate: '2026-03-01', country: 'GB', subjectKey: `gb${i}` })),
    ];
    const ov = aggregate('web-portal', q, from, lastCompleteDay, rows);
    const us = ov.breakdowns.country.find((c) => c.key === 'US');
    const gb = ov.breakdowns.country.find((c) => c.key === 'GB');
    expect(us!.cell.suppressed).toBe(false);
    expect(gb!.cell.suppressed).toBe(true);
  });
});

describe('computeTodaySoFar', () => {
  it('sums only the current UTC day rows', () => {
    const today = new Date('2026-03-10T00:00:00.000Z');
    const rows: AggRow[] = [
      row({ eventDate: '2026-03-09', subjectKey: '', eventCount: 50 }),
      row({ eventDate: '2026-03-10', subjectKey: '', eventCount: 7 }),
      row({ eventDate: '2026-03-10', subjectKey: '', eventCount: 3 }),
    ];
    expect(computeTodaySoFar(rows, today)).toEqual({ suppressed: false, events: 10, uniqueUsers: 0 });
  });
});

describe('previousPeriod + buildComparison', () => {
  it('computes the immediately-preceding window of the same length', () => {
    const from = new Date('2026-03-08T00:00:00.000Z');
    const lastCompleteDay = new Date('2026-03-14T00:00:00.000Z'); // 7 days
    const { prevFrom, prevTo } = previousPeriod(from, lastCompleteDay);
    expect(prevFrom.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(prevTo.toISOString()).toBe('2026-03-07T00:00:00.000Z');
  });

  it('computes a positive percent change', () => {
    const prevRows: AggRow[] = Array.from({ length: 5 }, (_, i) =>
      row({ eventDate: '2026-03-01', subjectKey: `u${i}`, eventCount: 10 }),
    ); // 50 events
    const cmp = buildComparison(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-07T00:00:00Z'),
      prevRows,
      { suppressed: false, events: 75, uniqueUsers: 5 },
    );
    expect(cmp.eventsPercentChange).toBe(50); // 50 -> 75 is +50%
  });

  it('returns null percent change when the previous period had zero events', () => {
    const cmp = buildComparison(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-07T00:00:00Z'),
      [],
      { suppressed: false, events: 75, uniqueUsers: 5 },
    );
    expect(cmp.eventsPercentChange).toBeNull();
  });

  it('returns null percent change when the current total is suppressed', () => {
    const prevRows: AggRow[] = Array.from({ length: 5 }, (_, i) =>
      row({ eventDate: '2026-03-01', subjectKey: `u${i}`, eventCount: 2 }),
    );
    const cmp = buildComparison(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-07T00:00:00Z'),
      prevRows,
      { suppressed: true },
    );
    expect(cmp.eventsPercentChange).toBeNull();
  });
});
