import { useCallback, useEffect, useState } from 'react';
import type { ApplicationSummary, NamedBreakdown, Overview as OverviewData, SeriesPoint } from '@ea/contracts';
import { api, ApiError } from '../api';
import { navigate, useRoute } from '../router';
import { Busy, Cell, cellUsers, ErrorBox, Notice } from '../ui';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoUtc(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** S-5 Application overview: aggregate dashboard with filters and comparison. */
export function Overview(): JSX.Element {
  const route = useRoute();
  const tenantFromUrl = route.query.get('tenant') ?? '';

  const [apps, setApps] = useState<ApplicationSummary[]>([]);
  const [tenant, setTenant] = useState(tenantFromUrl);
  const [from, setFrom] = useState(daysAgoUtc(7));
  const [to, setTo] = useState(todayUtc());
  const [eventType, setEventType] = useState('');
  const [compare, setCompare] = useState(false);
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load entitled apps once; default the tenant if none selected.
  useEffect(() => {
    api.listTenants().then((r) => {
      setApps(r.items);
      if (!tenant && r.items.length > 0) setTenant(r.items[0]!.tenantId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load event-type filter options when the tenant changes.
  useEffect(() => {
    if (!tenant) return;
    api
      .eventTypes(tenant)
      .then((r) => setEventTypes(r.items))
      .catch(() => setEventTypes([]));
  }, [tenant]);

  const load = useCallback(() => {
    if (!tenant) return;
    setLoading(true);
    setError(null);
    api
      .overview(tenant, { from, to, eventType: eventType || undefined, compare })
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 400) {
          setError(err.problem.title || 'Invalid filters.');
        } else if (err instanceof ApiError && err.status === 404) {
          setError('Application not found or you are not entitled to it.');
        } else {
          setError('Something went wrong. The data could not be loaded.');
        }
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [tenant, from, to, eventType, compare]);

  // Re-query when tenant or compare change immediately; date/type via Apply.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, compare]);

  const onApply = (): void => load();

  return (
    <section>
      <h1 tabIndex={-1}>Overview</h1>

      <div className="row" role="group" aria-label="Filters">
        <div className="field">
          <label htmlFor="app">Application</label>
          <select id="app" value={tenant} onChange={(e) => { setTenant(e.target.value); navigate('/overview', { tenant: e.target.value }); }}>
            {apps.map((a) => (
              <option key={a.tenantId} value={a.tenantId}>
                {a.tenantId}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">From (UTC)</label>
          <input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="to">To (UTC)</label>
          <input id="to" type="date" value={to} max={todayUtc()} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="etype">Event type</label>
          <select id="etype" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="">All event types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ alignSelf: 'end' }}>
          <button type="button" onClick={onApply}>
            Apply
          </button>
        </div>
        <div className="field" style={{ alignSelf: 'end' }}>
          <label className="check" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Compare with previous period
          </label>
        </div>
      </div>

      {error ? <ErrorBox text={error} onRetry={load} /> : null}
      {loading ? <Busy /> : null}
      {!loading && !error && data ? <OverviewBody data={data} compare={compare} /> : null}
    </section>
  );
}

function OverviewBody({ data, compare }: { data: OverviewData; compare: boolean }): JSX.Element {
  const hasComplete = data.range.completeDays > 0;
  return (
    <>
      <p>
        Range {data.range.from} to {data.range.to} UTC &middot; {data.range.completeDays} complete day
        {data.range.completeDays === 1 ? '' : 's'} (today shown separately).
      </p>

      {!hasComplete ? (
        <Notice kind="info">Only today is in range; complete-day figures appear once a full UTC day has passed.</Notice>
      ) : null}

      <div className="kpis">
        <div className="kpi">
          <div>Total events</div>
          <div className="v">
            <Cell cell={data.totals} />
          </div>
        </div>
        <div className="kpi">
          <div>Unique users</div>
          <div className="v">{cellUsers(data.totals)}</div>
        </div>
        {data.todaySoFar ? (
          <div className="kpi">
            <div>Today so far (partial)</div>
            <div className="v">
              <Cell cell={data.todaySoFar} />
            </div>
          </div>
        ) : null}
        {compare && data.comparison ? (
          <div className="kpi">
            <div>Change vs previous period</div>
            <div className="v">
              {data.comparison.eventsPercentChange === null
                ? 'n/a'
                : `${data.comparison.eventsPercentChange > 0 ? '+' : ''}${data.comparison.eventsPercentChange}%`}
            </div>
          </div>
        ) : null}
      </div>

      <Notice kind="info">
        Cells with fewer than 5 users are suppressed (shown as &mdash;) for privacy, so visible rows may sum to less
        than the total.
      </Notice>

      {hasComplete ? <Series points={data.series} /> : null}

      <div className="scroll">
        <BreakdownTable caption="Top event types" rows={data.topEventTypes} keyLabel="Event type" />
      </div>
      <div className="scroll">
        <BreakdownTable caption="By country" rows={data.breakdowns.country} keyLabel="Country" />
      </div>
      <div className="scroll">
        <BreakdownTable caption="By browser" rows={data.breakdowns.browserFamily} keyLabel="Browser" />
      </div>
      <div className="scroll">
        <BreakdownTable caption="By OS" rows={data.breakdowns.osFamily} keyLabel="OS" />
      </div>
    </>
  );
}

/** Inline SVG bar chart of the daily event series. */
function Series({ points }: { points: SeriesPoint[] }): JSX.Element {
  const values = points.map((p) => (p.cell.suppressed ? 0 : p.cell.events));
  const max = Math.max(1, ...values);
  const width = 640;
  const height = 160;
  const barGap = 6;
  const barWidth = points.length > 0 ? (width - barGap * (points.length + 1)) / points.length : 0;

  return (
    <figure>
      <figcaption>
        <strong>Events over time (complete UTC days)</strong>
      </figcaption>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily events bar chart">
        {points.map((p, i) => {
          const v = p.cell.suppressed ? 0 : p.cell.events;
          const h = Math.round((v / max) * (height - 30));
          const x = barGap + i * (barWidth + barGap);
          const y = height - 20 - h;
          return (
            <g key={p.date}>
              <rect x={x} y={y} width={barWidth} height={h} fill="#0b5cad">
                <title>
                  {p.date}: {p.cell.suppressed ? 'suppressed' : `${v} events`}
                </title>
              </rect>
              <text x={x + barWidth / 2} y={height - 6} fontSize="9" textAnchor="middle" fill="#4a5561">
                {p.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function BreakdownTable({
  caption,
  rows,
  keyLabel,
}: {
  caption: string;
  rows: NamedBreakdown[];
  keyLabel: string;
}): JSX.Element {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{keyLabel}</th>
          <th scope="col">Events</th>
          <th scope="col">Unique users</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={3}>No data in range.</td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.key}</th>
              <td>
                <Cell cell={r.cell} />
              </td>
              <td>{cellUsers(r.cell)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
