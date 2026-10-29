import { useEffect, useState, type FormEvent } from "react";
import { useProto } from "../ctx";
import { VM } from "../messages";
import { TENANTS, USERS, type Tenant } from "../mock";
import {
  ErrorSummary,
  Field,
  Gate,
  Hint,
  Live,
  Notice,
  Page,
  type StateDef,
} from "../ui";

/* ---------- S-6 Tenants ---------- */
export const S6_STATES: StateDef[] = [
  { id: "success", label: "Success (list with tenants)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no tenants)" },
  { id: "error", label: "Error" },
  { id: "saved", label: "Success: tenant saved message" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

export function S6({ st }: { st: string }) {
  const [rows, setRows] = useState<Tenant[]>(TENANTS);
  const [id, setId] = useState("");
  const [owner, setOwner] = useState("");
  const [url, setUrl] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setMsg(st === "saved" ? "Tenant tenant-delta saved." : "");
  }, [st]);

  const view = st === "empty" ? [] : rows;
  const isUrl = (v: string) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const er: Record<string, string> = {};
    if (!editing) {
      if (!id.trim()) er.tid = VM.v11;
      else if (!/^[a-z0-9-]{3,40}$/.test(id)) er.tid = VM.v14a;
      else if (rows.some((r) => r.id === id)) er.tid = VM.v12;
      if (!owner.trim()) er.owner = VM.v13;
      else if (owner.length > 100) er.owner = VM.v14b;
    }
    if (!url.trim()) er.url = VM.v14;
    else if (!isUrl(url.trim())) er.url = VM.v14c;
    setErrors(er);
    if (Object.keys(er).length) return;
    const t = "2026-10-29 10:00 UTC";
    if (editing)
      setRows(
        rows.map((r) =>
          r.id === editing ? { ...r, url: url.trim(), changed: t } : r,
        ),
      );
    else
      setRows([
        ...rows,
        { id, owner: owner.trim(), url: url.trim(), created: t, changed: t },
      ]);
    setMsg(`Tenant ${editing ?? id} saved.`);
    setEditing(null);
    setId("");
    setOwner("");
    setUrl("");
  };

  return (
    <Page title="Tenants">
      <Gate st={st}>
        <Live>{msg ? <Notice kind="success">{msg}</Notice> : null}</Live>
        {view.length === 0 ? (
          <Notice>No tenants exist yet. Create the first tenant.</Notice>
        ) : (
          <table>
            <caption>Tenants (times in UTC)</caption>
            <thead>
              <tr>
                <th scope="col">Tenant id</th>
                <th scope="col">Department owner</th>
                <th scope="col">Privacy notice</th>
                <th scope="col">Created</th>
                <th scope="col">Changed</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.id}</th>
                  <td>{r.owner}</td>
                  <td>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      Privacy notice for {r.id}
                    </a>
                  </td>
                  <td>{r.created}</td>
                  <td>{r.changed}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setEditing(r.id);
                        setUrl(r.url);
                        setErrors({});
                      }}
                    >
                      Edit URL for {r.id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h2>
          {editing ? `Edit privacy-notice URL for ${editing}` : "New tenant"}
        </h2>
        <ErrorSummary errors={errors} attempt={attempt} />
        <form onSubmit={submit} noValidate>
          {!editing ? (
            <>
              <Field
                id="tid"
                label="Tenant id"
                required
                hint="3 to 40 characters: lowercase letters, digits and hyphens. It cannot be changed later."
                error={errors.tid}
              >
                {(f) => (
                  <input
                    {...f}
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                  />
                )}
              </Field>
              <Field
                id="owner"
                label="Department owner"
                required
                error={errors.owner}
              >
                {(f) => (
                  <input
                    {...f}
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                  />
                )}
              </Field>
            </>
          ) : null}
          <Field
            id="url"
            label="Privacy-notice URL"
            required
            hint="Changes are audited."
            error={errors.url}
          >
            {(f) => (
              <input
                {...f}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            )}
          </Field>
          <div className="actions">
            <button type="submit">Save</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditing(null);
                setId("");
                setOwner("");
                setUrl("");
                setErrors({});
              }}
            >
              Cancel
            </button>
          </div>
        </form>
        <Hint>
          Tenant creation needs no step-up per the PRD list. Existing ids (for
          example tenant-alpha) give VM-12.
        </Hint>
      </Gate>
    </Page>
  );
}

/* ---------- S-7 Entitlements ---------- */
export const S7_STATES: StateDef[] = [
  { id: "success", label: "Success (entitlements listed)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no entitlements)" },
  { id: "error", label: "Error" },
  { id: "saved", label: "Success: entitlement saved message" },
  { id: "step-up-required", label: "Step-up required (grant)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

export function S7({ st }: { st: string }) {
  const { guard } = useProto();
  const [ent, setEnt] = useState<Record<string, string[]>>({
    "user-0001": ["tenant-alpha"],
    "user-0002": ["tenant-alpha", "tenant-bravo"],
    "user-0003": [],
  });
  const [user, setUser] = useState("");
  const [tenant, setTenant] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setMsg(
      st === "saved"
        ? "Entitlement saved. It takes effect for new queries within 60 seconds."
        : "",
    );
  }, [st]);

  const grant = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const er: Record<string, string> = {};
    if (!user) er.u = VM.v15;
    if (!tenant) er.t = VM.v16;
    setErrors(er);
    if (Object.keys(er).length) return;
    guard({ stepUp: "Grant entitlement" }, () => {
      setEnt((m) => ({
        ...m,
        [user]: Array.from(new Set([...(m[user] ?? []), tenant])),
      }));
      setMsg(
        "Entitlement saved. It takes effect for new queries within 60 seconds.",
      );
    });
  };
  const revoke = (u: string, t: string) =>
    guard({ confirm: `Revoke access to ${t} for ${u}?` }, () => {
      setEnt((m) => ({ ...m, [u]: (m[u] ?? []).filter((x) => x !== t) }));
      setMsg(
        "Entitlement saved. It takes effect for new queries within 60 seconds.",
      );
    });

  const entries = Object.entries(
    st === "empty"
      ? { "user-0001": [], "user-0002": [], "user-0003": [] }
      : ent,
  );
  return (
    <Page title="User entitlements">
      <Gate st={st}>
        <Live>{msg ? <Notice kind="success">{msg}</Notice> : null}</Live>
        <p>A change takes effect for new queries within 60 seconds.</p>
        <table>
          <caption>Tenants granted per user</caption>
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Tenants granted</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([u, ts]) => (
              <tr key={u}>
                <th scope="row">{u}</th>
                <td>
                  {ts.length === 0 ? (
                    "This user has no entitlements."
                  ) : (
                    <ul>
                      {ts.map((t) => (
                        <li key={t}>
                          {t}{" "}
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => revoke(u, t)}
                          >
                            Revoke {t} for {u}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Grant access</h2>
        <ErrorSummary errors={errors} attempt={attempt} />
        <form onSubmit={grant} noValidate>
          <div className="row">
            <Field id="u" label="User" error={errors.u}>
              {(f) => (
                <select
                  {...f}
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                >
                  <option value="">Choose</option>
                  {USERS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field id="t" label="Tenant" error={errors.t}>
              {(f) => (
                <select
                  {...f}
                  value={tenant}
                  onChange={(e) => setTenant(e.target.value)}
                >
                  <option value="">Choose</option>
                  {TENANTS.map((t) => (
                    <option key={t.id}>{t.id}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="actions">
            <button type="submit">Grant</button>
          </div>
        </form>
      </Gate>
    </Page>
  );
}

/* ---------- S-8 Ingestion health ---------- */
export const S8_STATES: StateDef[] = [
  { id: "success", label: "Success" },
  { id: "loading", label: "Loading (first load)" },
  { id: "empty", label: "Empty (no activity)" },
  { id: "error", label: "Error (stale data kept, Retry)" },
  { id: "paused", label: "Paused" },
  { id: "partial", label: "Partial (one tenant unknown)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

function clock(tick: number): string {
  const m = tick % 60;
  return `2026-10-29 10:${String(m).padStart(2, "0")}:00 UTC`;
}

export function S8({ st }: { st: string }) {
  const { go, setApp } = useProto();
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (paused || st === "paused") return;
    const h = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(h);
  }, [paused, st]);
  const isPaused = paused || st === "paused";
  const staleTime = clock(Math.max(0, tick - 1));
  const rows = [
    { t: "tenant-alpha", thr: 420 + tick * 3, lag: 1, dl: 2, ref: 0 },
    { t: "tenant-bravo", thr: 180 + tick, lag: 4, dl: 2, ref: 3 },
    { t: "tenant-charlie", thr: 60, lag: 0, dl: 0, ref: 0 },
  ];
  return (
    <Page title="Ingestion health">
      <Gate st={st} readOnly>
        {st === "empty" ? (
          <Notice>No ingestion activity has been recorded yet.</Notice>
        ) : (
          <>
            {st === "error" ? (
              <div role="alert" className="notice error">
                <p>
                  Health data could not be refreshed. Showing data from{" "}
                  {staleTime}.
                </p>
                <button type="button" onClick={() => setTick((t) => t + 1)}>
                  Retry
                </button>
              </div>
            ) : null}
            {isPaused ? (
              <Notice kind="warn">
                Auto-refresh is paused. Data is from {staleTime}.{" "}
                <button type="button" onClick={() => setPaused(false)}>
                  Resume
                </button>
              </Notice>
            ) : (
              <p>
                Auto-refresh every 30 seconds.{" "}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPaused(true)}
                >
                  Pause auto-refresh
                </button>
              </p>
            )}
            <p>
              Last refreshed:{" "}
              <span role="status" aria-live="polite">
                {isPaused || st === "error" ? staleTime : clock(tick)}
              </span>
            </p>
            <table>
              <caption>Per-tenant ingestion (counts; times UTC)</caption>
              <thead>
                <tr>
                  <th scope="col">Tenant</th>
                  <th scope="col">Throughput (events per minute)</th>
                  <th scope="col">Consumer lag (seconds)</th>
                  <th scope="col">Dead letters</th>
                  <th scope="col">Refused publishes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const unknown = st === "partial" && r.t === "tenant-bravo";
                  return (
                    <tr key={r.t}>
                      <th scope="row">{r.t}</th>
                      <td>{unknown ? "unknown" : r.thr}</td>
                      <td>{unknown ? "unknown" : r.lag}</td>
                      <td>
                        {unknown ? (
                          "unknown"
                        ) : (
                          <a
                            href="#dl"
                            onClick={(e) => {
                              e.preventDefault();
                              setApp(r.t);
                              go("S-9");
                            }}
                          >
                            {r.dl} dead letters for {r.t}
                          </a>
                        )}
                      </td>
                      <td>{unknown ? "unknown" : r.ref}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p>
              Platform level: refusals for unknown credentials: 7. Dead letters
              from a wrong-tenant publish are shown against the credential's own
              tenant.
            </p>
          </>
        )}
      </Gate>
    </Page>
  );
}

/* ---------- S-9 Dead letters ---------- */
export const S9_STATES: StateDef[] = [
  { id: "success", label: "Success (list)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "error", label: "Error" },
  { id: "replay", label: "Success: replay outcome" },
  { id: "discard", label: "Success: discard" },
  { id: "step-up-required", label: "Step-up required (open, reveal)" },
  { id: "unparseable", label: "Unparseable event opened" },
  { id: "partial", label: "Partial: event no longer available" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

interface DL {
  id: string;
  tenant: string;
  reason: string;
  path: string;
  at: string;
  expires: string;
  parseable: boolean;
  keys: string[];
}
const DLS: DL[] = [
  {
    id: "dl-0001",
    tenant: "tenant-alpha",
    reason: "SCHEMA_INVALID",
    path: "properties.page_name",
    at: "2026-10-28 08:15 UTC",
    expires: "2026-11-04 08:15 UTC",
    parseable: true,
    keys: ["event_name", "properties.page_name", "properties.plan"],
  },
  {
    id: "dl-0002",
    tenant: "tenant-alpha",
    reason: "UNKNOWN_KEY",
    path: "properties.extra_flag",
    at: "2026-10-28 09:40 UTC",
    expires: "2026-11-04 09:40 UTC",
    parseable: true,
    keys: ["event_name", "properties.extra_flag"],
  },
  {
    id: "dl-0003",
    tenant: "tenant-bravo",
    reason: "UNPARSEABLE_BODY",
    path: "(none)",
    at: "2026-10-27 22:05 UTC",
    expires: "2026-11-03 22:05 UTC",
    parseable: false,
    keys: [],
  },
  {
    id: "dl-0004",
    tenant: "tenant-bravo",
    reason: "SCHEMA_INVALID",
    path: "user_ref",
    at: "2026-10-28 11:30 UTC",
    expires: "2026-11-04 11:30 UTC",
    parseable: true,
    keys: ["event_name", "user_ref"],
  },
];

export function S9({ st }: { st: string }) {
  const { guard, app, setApp } = useProto();
  const [removed, setRemoved] = useState<string[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState("");
  const [revealed, setRevealed] = useState<{
    key: string;
    left: number;
  } | null>(null);
  const [live, setLive] = useState("");
  const [selErr, setSelErr] = useState("");
  const [msg, setMsg] = useState("");
  const [outcome, setOutcome] = useState<{ id: string; r: string }[]>([]);
  const tenant = app || "tenant-alpha";

  useEffect(() => {
    setMsg("");
    setOutcome([]);
    setOpen(null);
    if (st === "replay") {
      setMsg("Replay requested for 3 events.");
      setOutcome([
        { id: "dl-0001", r: "Stored" },
        { id: "dl-0002", r: "Still invalid" },
        { id: "dl-0004", r: "Already stored and not stored again" },
      ]);
    }
    if (st === "discard") setMsg("2 events discarded.");
    if (st === "unparseable") {
      setApp("tenant-bravo");
      setOpen("dl-0003");
    }
    if (st === "partial") setOpen("dl-0001");
  }, [st, setApp]);

  useEffect(() => {
    if (!revealed) return;
    const h = window.setInterval(() => {
      setRevealed((r) => {
        if (!r) return r;
        if (r.left <= 1) {
          setLive("The value is masked again.");
          return null;
        }
        return { ...r, left: r.left - 1 };
      });
    }, 1000);
    return () => window.clearInterval(h);
  }, [revealed !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const list =
    st === "empty"
      ? []
      : DLS.filter((d) => d.tenant === tenant && !removed.includes(d.id));
  const detail = DLS.find((d) => d.id === open);

  const act = (kind: "replay" | "discard") => {
    if (sel.length === 0) return setSelErr(VM.v18);
    setSelErr("");
    const n = sel.length;
    const doIt = () => {
      if (kind === "discard") {
        setRemoved((r) => [...r, ...sel]);
        setMsg(`${n} events discarded.`);
        setOutcome([]);
      } else {
        setMsg(`Replay requested for ${n} events.`);
        setOutcome(
          sel.map((id, i) => ({ id, r: i % 2 ? "Still invalid" : "Stored" })),
        );
      }
      setSel([]);
    };
    guard(
      kind === "discard"
        ? { confirm: `Discard ${n} events? This cannot be undone.` }
        : {},
      doIt,
    );
  };

  const submitReveal = (e: FormEvent) => {
    e.preventDefault();
    const r = reason.trim();
    if (!r) return setReasonErr(VM.v17);
    if (r.length < 10 || r.length > 500) return setReasonErr(VM.v17a);
    setReasonErr("");
    const key = revealKey;
    if (!key) return;
    guard({ stepUp: "Reveal one value" }, () => {
      setRevealed({ key, left: 60 });
      setRevealKey(null);
      setReason("");
      setLive(`Value of ${key} revealed for 60 seconds.`);
    });
  };

  return (
    <Page title="Dead-letter events">
      <Gate st={st}>
        <Field id="dl-tenant" label="Tenant">
          {(f) => (
            <select
              {...f}
              value={tenant}
              onChange={(e) => {
                setApp(e.target.value);
                setOpen(null);
                setSel([]);
              }}
            >
              {TENANTS.map((t) => (
                <option key={t.id}>{t.id}</option>
              ))}
            </select>
          )}
        </Field>
        <Live>{msg ? <Notice kind="success">{msg}</Notice> : null}</Live>
        {outcome.length ? (
          <table>
            <caption>Replay outcome per event</caption>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {outcome.map((o) => (
                <tr key={o.id}>
                  <th scope="row">{o.id}</th>
                  <td>{o.r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {list.length === 0 ? (
          <Notice>There are no dead-lettered events for this tenant.</Notice>
        ) : (
          <>
            <p>Dead-lettered events expire within 7 days. Times are UTC.</p>
            <table>
              <caption>
                Dead-lettered events for {tenant} ({sel.length} selected)
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <input
                      type="checkbox"
                      aria-label="Select all events"
                      checked={sel.length === list.length}
                      onChange={(e) =>
                        setSel(e.target.checked ? list.map((d) => d.id) : [])
                      }
                    />
                  </th>
                  <th scope="col">Event</th>
                  <th scope="col">Tenant</th>
                  <th scope="col">Reason code</th>
                  <th scope="col">Field path</th>
                  <th scope="col">Dead-lettered</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${d.id}`}
                        checked={sel.includes(d.id)}
                        onChange={(e) =>
                          setSel(
                            e.target.checked
                              ? [...sel, d.id]
                              : sel.filter((x) => x !== d.id),
                          )
                        }
                      />
                    </td>
                    <th scope="row">{d.id}</th>
                    <td>{d.tenant}</td>
                    <td>{d.reason}</td>
                    <td>{d.path}</td>
                    <td>{d.at}</td>
                    <td>{d.expires}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          guard({ stepUp: "Open dead-letter event" }, () => {
                            setOpen(d.id);
                            setRevealed(null);
                          })
                        }
                      >
                        Open {d.id}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p role="status" className="sr-only">
              {sel.length} events selected
            </p>
            {selErr ? (
              <div className="field-error" role="alert">
                {selErr}
              </div>
            ) : null}
            <div className="actions">
              <button type="button" onClick={() => act("replay")}>
                Replay selected
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => act("discard")}
              >
                Discard selected
              </button>
            </div>
          </>
        )}

        {st === "partial" && open ? (
          <Notice kind="warn">This event is no longer available.</Notice>
        ) : null}
        {detail && st !== "partial" ? (
          <section aria-labelledby="detail-h">
            <h2 id="detail-h">Event {detail.id}</h2>
            {!detail.parseable ? (
              <Notice kind="warn">
                This message could not be read. Its content is never shown and
                cannot be revealed. It expires within 7 days.
              </Notice>
            ) : (
              <>
                <p>Keys are visible; all payload values are masked.</p>
                <table>
                  <caption>Payload of {detail.id}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Key</th>
                      <th scope="col">Value</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.keys.map((k) => (
                      <tr key={k}>
                        <th scope="row">{k}</th>
                        <td>
                          {revealed?.key === k ? (
                            <>
                              example-value-{k.length}{" "}
                              <span>({revealed.left} seconds left)</span>
                            </>
                          ) : (
                            <span aria-label={`Masked value of ${k}`}>
                              Masked
                            </span>
                          )}
                        </td>
                        <td>
                          {revealed?.key === k ? (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setRevealed(null);
                                setLive("The value is masked again.");
                              }}
                            >
                              Hide {k}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setRevealKey(k);
                                setReason("");
                                setReasonErr("");
                              }}
                            >
                              Reveal {k}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {revealKey ? (
                  <form onSubmit={submitReveal} noValidate>
                    <Field
                      id="reason"
                      label={`Reason to reveal ${revealKey}`}
                      hint="10 to 500 characters. Every reveal is audited."
                      error={reasonErr}
                    >
                      {(f) => (
                        <textarea
                          {...f}
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      )}
                    </Field>
                    <div className="actions">
                      <button type="submit">Reveal value</button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setRevealKey(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </>
            )}
          </section>
        ) : null}
        <Live>{live}</Live>
        <Hint>
          Reveal shows a synthetic value for 60 seconds, then re-masks
          (announced). Selecting nothing and pressing Replay or Discard gives
          VM-18. Use the state switcher for opened unparseable events.
        </Hint>
      </Gate>
    </Page>
  );
}
