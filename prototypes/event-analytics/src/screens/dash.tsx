import { useMemo, useState, type FormEvent } from "react";
import { useProto } from "../ctx";
import { SESSION_ENDED, VM } from "../messages";
import { APPS, EVENT_TYPES } from "../mock";
import {
  ErrorSummary,
  Field,
  Gate,
  Live,
  Notice,
  Page,
  fmt,
  type StateDef,
} from "../ui";

/* ---------- S-4 Application list ---------- */
export const S4_STATES: StateDef[] = [
  { id: "success", label: "Success (entitled applications)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no entitlements)" },
  { id: "error", label: "Error (read-only, Retry)" },
  {
    id: "permission-denied",
    label: "Permission-denied (unauthenticated -> S-1)",
  },
];

export function S4({ st }: { st: string }) {
  const { go, setApp, role } = useProto();
  const apps = [...APPS].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Page title="Applications">
      <Gate st={st} readOnly>
        {st === "empty" ? (
          <Notice>
            You are not entitled to any application yet. Ask a platform admin
            for access.
          </Notice>
        ) : (
          <>
            <p>
              Applications you are entitled to
              {role === "admin"
                ? " (admins see this list under the same entitlement rule)"
                : ""}
              .
            </p>
            <ul>
              {apps.map((a) => (
                <li key={a.id}>
                  <a
                    href="#overview"
                    onClick={(e) => {
                      e.preventDefault();
                      setApp(a.id);
                      go("S-5");
                    }}
                  >
                    {a.name}
                  </a>{" "}
                  - department owner: {a.owner}
                </li>
              ))}
            </ul>
          </>
        )}
      </Gate>
    </Page>
  );
}

/* ---------- S-18 Not found ---------- */
export const S18_STATES: StateDef[] = [{ id: "single", label: "Single state" }];

export function S18() {
  const { role, go } = useProto();
  return (
    <Page title="Page not found">
      <p>Page not found. The page you asked for could not be found.</p>
      <div className="actions">
        {role === "admin" ? (
          <button type="button" onClick={() => go("S-8")}>
            Go to ingestion health
          </button>
        ) : (
          <button type="button" onClick={() => go("S-4")}>
            Go to application list
          </button>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => go("S-1", "empty")}
        >
          Sign out
        </button>
      </div>
    </Page>
  );
}

/* ---------- S-5 Overview ---------- */
export const S5_STATES: StateDef[] = [
  { id: "success", label: "Success" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no events in range)" },
  { id: "error", label: "Error (read-only, Retry)" },
  { id: "partial-suppression", label: "Partial: suppressed cells" },
  { id: "partial-comparison", label: "Partial: comparison (n/a and dash)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
  { id: "session-ended", label: "Session ended" },
];

interface Filters {
  app: string;
  start: string;
  end: string;
  type: string;
  compare: boolean;
}
const DEFAULT_RANGE = { start: "2026-10-22", end: "2026-10-28" };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function parseDay(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || iso(d) !== s ? null : d;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function dayList(start: Date, end: Date): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 400; d = addDays(d, 1))
    out.push(iso(d));
  return out;
}
function seriesFor(days: string[], seed: number): number[] {
  return days.map(
    (_, i) => 100 + ((i * 37 + seed) % 60) - (i % 7 > 4 ? 30 : 0),
  );
}
function rangeError(f: { start: string; end: string }): Record<string, string> {
  const er: Record<string, string> = {};
  const check = (k: "start" | "end") => {
    const v = f[k].trim();
    if (/^\d{4}-\d{2}-\d{2}[T ]\d/.test(v)) er[k] = VM.v10;
    else if (!parseDay(v)) er[k] = VM.v9;
  };
  check("start");
  check("end");
  const s = parseDay(f.start.trim());
  const e = parseDay(f.end.trim());
  if (s && e && !er.start && !er.end) {
    if (e < s) er.end = VM.v7;
    else {
      const limit = new Date(s.getTime());
      limit.setUTCMonth(limit.getUTCMonth() + 13);
      if (e > limit) er.end = VM.v8;
    }
  }
  return er;
}

function Suppressed({ text }: { text: string }) {
  return <span className="supp">{text}</span>;
}
function DashCompare() {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="tipwrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="secondary"
        aria-label="Not available, suppressed"
        aria-describedby={open ? "dash-tip" : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {"—"}
      </button>
      {open ? (
        <span id="dash-tip" role="tooltip" className="tip">
          Not shown because one of the compared values is suppressed to protect
          privacy.
        </span>
      ) : null}
    </span>
  );
}
function Delta({
  cur,
  prev,
  supp,
}: {
  cur: number;
  prev: number;
  supp?: boolean;
}) {
  if (supp) return <DashCompare />;
  if (prev === 0) return <>n/a</>;
  const p = ((cur - prev) / prev) * 100;
  return <>{`${p >= 0 ? "+" : ""}${p.toFixed(1)}%`}</>;
}

function BarChart({
  labels,
  cur,
  prev,
}: {
  labels: string[];
  cur: number[];
  prev?: number[];
}) {
  const max = Math.max(1, ...cur, ...(prev ?? []));
  const w = 600,
    h = 160,
    n = Math.max(1, cur.length);
  const bw = w / n;
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${w} ${h + 20}`}
      role="img"
      aria-label={`Events per UTC day, ${n} days${prev ? ", current and previous period" : ""}. A data table with the same values follows.`}
    >
      <defs>
        <pattern
          id="hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="4" fill="#fff" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="#444" strokeWidth="2" />
        </pattern>
      </defs>
      {cur.map((v, i) => {
        const bh = (v / max) * h;
        const pv = prev?.[i];
        const x = i * bw;
        return (
          <g key={labels[i] ?? i}>
            {pv !== undefined ? (
              <rect
                x={x + 0.5}
                y={h - (pv / max) * h}
                width={Math.max(1, bw / 2 - 1)}
                height={(pv / max) * h}
                fill="url(#hatch)"
                stroke="#444"
              />
            ) : null}
            <rect
              x={x + (pv !== undefined ? bw / 2 : 0.5)}
              y={h - bh}
              width={Math.max(1, (pv !== undefined ? bw / 2 : bw) - 1)}
              height={bh}
              fill="#0b5cad"
            />
          </g>
        );
      })}
      <line x1="0" y1={h} x2={w} y2={h} stroke="#000" />
      <text x="0" y={h + 14} fontSize="10">
        {labels[0] ?? ""}
      </text>
      <text x={w} y={h + 14} fontSize="10" textAnchor="end">
        {labels[labels.length - 1] ?? ""} (UTC)
      </text>
    </svg>
  );
}

export function S5({ st }: { st: string }) {
  const { app, setApp, go } = useProto();
  const firstApp =
    [...APPS].sort((a, b) => a.name.localeCompare(b.name))[0]?.id ?? "";
  const initial: Filters = {
    app: app || firstApp,
    ...DEFAULT_RANGE,
    type: "all",
    compare: false,
  };
  const [applied, setApplied] = useState<Filters>(initial);
  const [draft, setDraft] = useState<Filters>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [announce, setAnnounce] = useState("");

  const supp = st === "partial-suppression";
  const forceCmp = st === "partial-comparison";
  const compare = applied.compare || forceCmp;

  const model = useMemo(() => {
    const s = parseDay(applied.start) ?? parseDay(DEFAULT_RANGE.start);
    const e = parseDay(applied.end) ?? parseDay(DEFAULT_RANGE.end);
    if (!s || !e) return null;
    const days = dayList(s, e);
    const prevStart = addDays(s, -days.length);
    const prevDays = dayList(prevStart, addDays(s, -1));
    const seed = applied.app.length;
    const factor = applied.type === "all" ? 1 : 0.35;
    const cur = seriesFor(days, seed).map((v) => Math.round(v * factor));
    const prev = seriesFor(prevDays, seed + 11).map((v) =>
      Math.round(v * factor),
    );
    const total = cur.reduce((a, b) => a + b, 0);
    const prevTotal = prev.reduce((a, b) => a + b, 0);
    return {
      days,
      prevDays,
      cur,
      prev,
      total,
      prevTotal,
      users: Math.round(total * 0.31),
      prevUsers: forceCmp ? 0 : Math.round(prevTotal * 0.3),
    };
  }, [applied, forceCmp]);

  const apply = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const er = rangeError(draft);
    setErrors(er);
    if (Object.keys(er).length) return;
    setApplied({ ...draft, start: draft.start.trim(), end: draft.end.trim() });
    setApp(draft.app);
    setAnnounce(
      `Results updated for ${draft.start.trim()} to ${draft.end.trim()} UTC`,
    );
  };
  const resetAll = () => {
    setDraft({ ...initial, app: draft.app });
    setApplied({ ...initial, app: draft.app });
    setErrors({});
    setAnnounce("Filters cleared");
  };
  const chips: { key: string; label: string; clear(): void }[] = [
    {
      key: "application",
      label: `Application: ${APPS.find((a) => a.id === applied.app)?.name ?? applied.app}`,
      clear: () => {
        setDraft({ ...draft, app: firstApp });
        setApplied({ ...applied, app: firstApp });
      },
    },
    {
      key: "date range",
      label: `Range: ${applied.start} to ${applied.end} UTC`,
      clear: () => {
        setDraft({ ...draft, ...DEFAULT_RANGE });
        setApplied({ ...applied, ...DEFAULT_RANGE });
      },
    },
    ...(applied.type !== "all"
      ? [
          {
            key: "event type",
            label: `Event type: ${applied.type}`,
            clear: () => {
              setDraft({ ...draft, type: "all" });
              setApplied({ ...applied, type: "all" });
            },
          },
        ]
      : []),
  ];

  const countries = [
    { name: "DE", users: 420, prev: 380 },
    { name: "FR", users: 310, prev: 295 },
    { name: "NL", users: 150, prev: 160 },
    { name: "SE", users: 9, prev: 8 },
    { name: "NO", users: 3, prev: 2 },
    { name: "Unknown (anonymous only)", users: 0, prev: 0 },
  ];
  const suppressedNames = supp || forceCmp ? ["NO", "SE"] : [];
  const markerFor = (name: string) =>
    name.startsWith("Unknown")
      ? "Suppressed (fewer than 5 events)"
      : "Suppressed (fewer than 5 users)";

  if (st === "session-ended")
    return (
      <Page title="Application overview">
        <Notice kind="warn">{SESSION_ENDED}</Notice>
        <button type="button" onClick={() => go("S-1", "session-ended")}>
          Go to sign-in
        </button>
      </Page>
    );

  return (
    <Page title="Application overview">
      <ErrorSummary errors={errors} attempt={attempt} />
      <form onSubmit={apply} noValidate aria-label="Filters">
        <div className="row">
          <Field id="f-app" label="Application">
            {(f) => (
              <select
                {...f}
                value={draft.app}
                onChange={(e) => setDraft({ ...draft, app: e.target.value })}
              >
                {[...APPS]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            )}
          </Field>
          <Field
            id="start"
            label="Start date (UTC)"
            hint="YYYY-MM-DD, whole days"
            error={errors.start}
          >
            {(f) => (
              <input
                {...f}
                type="text"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            )}
          </Field>
          <Field
            id="end"
            label="End date (UTC)"
            hint="YYYY-MM-DD, whole days"
            error={errors.end}
          >
            {(f) => (
              <input
                {...f}
                type="text"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            )}
          </Field>
          <Field id="f-type" label="Event type">
            {(f) => (
              <select
                {...f}
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              >
                <option value="all">All event types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="actions">
          <button type="submit">Apply</button>
          <button type="button" className="secondary" onClick={resetAll}>
            Clear all
          </button>
        </div>
      </form>
      <label>
        <input
          type="checkbox"
          checked={compare}
          onChange={(e) =>
            setApplied({ ...applied, compare: e.target.checked })
          }
        />{" "}
        Compare with previous period
      </label>
      <h2>Active filters</h2>
      <ul className="chips">
        {chips.map((c) => (
          <li key={c.key}>
            {c.label}
            <button
              type="button"
              className="secondary"
              aria-label={`Clear filter: ${c.key}`}
              onClick={c.clear}
            >
              x
            </button>
          </li>
        ))}
      </ul>
      <Live>{announce}</Live>

      <Gate st={st} readOnly>
        {st === "empty" || !model ? (
          <Notice>
            No events were recorded for this application in the selected range.
          </Notice>
        ) : (
          <>
            {supp || forceCmp ? (
              <Notice kind="warn">
                Some values are suppressed to protect privacy, so the values
                shown may add up to less than the total.
              </Notice>
            ) : null}
            <div className="kpis">
              <div className="kpi">
                <div>Total events</div>
                <div className="v">{fmt(model.total)}</div>
                {compare ? (
                  <div>
                    Previous: {fmt(model.prevTotal)}; change:{" "}
                    <Delta cur={model.total} prev={model.prevTotal} />
                  </div>
                ) : null}
              </div>
              <div className="kpi">
                <div>Unique users</div>
                <div className="v">{fmt(model.users)}</div>
                {compare ? (
                  <div>
                    Previous: {fmt(model.prevUsers)}; change:{" "}
                    <Delta cur={model.users} prev={model.prevUsers} />
                  </div>
                ) : null}
              </div>
            </div>
            <h2>Events over time (UTC days)</h2>
            <BarChart
              labels={model.days}
              cur={model.cur}
              prev={compare ? model.prev : undefined}
            />
            {compare ? (
              <div className="legend">
                <span>
                  <span className="swatch" style={{ background: "#0b5cad" }} />
                  Selected range
                </span>
                <span>
                  <span
                    className="swatch"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg,#fff,#fff 2px,#444 2px,#444 4px)",
                    }}
                  />
                  Previous period (hatched)
                </span>
              </div>
            ) : null}
            <details>
              <summary>Data table for events over time</summary>
              <div
                className="scroll"
                tabIndex={0}
                role="region"
                aria-label="Events over time data table, scrollable"
              >
                <table>
                  <caption>Events per UTC day</caption>
                  <thead>
                    <tr>
                      <th scope="col">Day (UTC)</th>
                      <th scope="col">Events</th>
                      {compare ? (
                        <th scope="col">Previous period day</th>
                      ) : null}
                      {compare ? <th scope="col">Previous events</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {model.days.map((d, i) => (
                      <tr key={d}>
                        <th scope="row">{d}</th>
                        <td>{fmt(model.cur[i] ?? 0)}</td>
                        {compare ? <td>{model.prevDays[i] ?? ""}</td> : null}
                        {compare ? <td>{fmt(model.prev[i] ?? 0)}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <h2>Top 10 event types</h2>
            <table>
              <caption>Top 10 event types by count</caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Event type</th>
                  <th scope="col">Events</th>
                </tr>
              </thead>
              <tbody>
                {(applied.type === "all" ? EVENT_TYPES : [applied.type]).map(
                  (t, i) => (
                    <tr key={t}>
                      <td>{i + 1}</td>
                      <th scope="row">{t}</th>
                      <td>
                        {fmt(
                          applied.type === "all"
                            ? Math.round((model.total * (10 - i)) / 55)
                            : model.total,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
            <h2>Breakdown by country (unique users)</h2>
            <table>
              <caption>Unique users by country</caption>
              <thead>
                <tr>
                  <th scope="col">Country</th>
                  <th scope="col">Users</th>
                  {compare ? <th scope="col">Previous</th> : null}
                  {compare ? <th scope="col">Change</th> : null}
                </tr>
              </thead>
              <tbody>
                {countries
                  .filter(
                    (c) => supp || forceCmp || !c.name.startsWith("Unknown"),
                  )
                  .map((c) => {
                    const hide =
                      suppressedNames.includes(c.name) ||
                      (c.name.startsWith("Unknown") && (supp || forceCmp));
                    return (
                      <tr key={c.name}>
                        <th scope="row">{c.name}</th>
                        <td>
                          {hide ? (
                            <Suppressed text={markerFor(c.name)} />
                          ) : (
                            fmt(c.users)
                          )}
                        </td>
                        {compare ? (
                          <td>
                            {hide ? (
                              <Suppressed text={markerFor(c.name)} />
                            ) : (
                              fmt(c.prev)
                            )}
                          </td>
                        ) : null}
                        {compare ? (
                          <td>
                            <Delta cur={c.users} prev={c.prev} supp={hide} />
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {supp || forceCmp ? (
              <p>
                When exactly one cell of a breakdown is suppressed, the smallest
                other cell is also marked (SE here).
              </p>
            ) : null}
            <p>
              All dates and times are UTC. Per-user records and user ids are
              never shown.
            </p>
          </>
        )}
      </Gate>
    </Page>
  );
}
