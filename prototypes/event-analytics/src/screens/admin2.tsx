import { useEffect, useState, type FormEvent } from "react";
import { useProto } from "../ctx";
import { VM, coverText, vm22, vmNotCovered } from "../messages";
import { NOW_UTC, TENANTS, UNCOVERED_TENANT } from "../mock";
import {
  Busy,
  ErrorSummary,
  Field,
  Gate,
  Hint,
  Live,
  Notice,
  Page,
  Pending,
  StoreOutcome,
  type StateDef,
} from "../ui";

/* ---------- S-10 Data-subject access and erasure ---------- */
export const S10_STATES: StateDef[] = [
  { id: "empty", label: "Empty (blank form)" },
  { id: "loading-queued", label: "Loading: export queued" },
  { id: "loading-generating", label: "Loading: export generating" },
  { id: "failed", label: "Export failed" },
  { id: "success-access", label: "Success: access (export ready)" },
  { id: "success-erasure", label: "Success: erasure outcome" },
  { id: "no-data", label: "Empty result: no data held" },
  {
    id: "error-partial-erasure",
    label: "Error: erasure failed in some stores (re-run)",
  },
  { id: "partial-refused", label: "Partial: pair refused (VM-22)" },
  { id: "expired", label: "Expired export" },
  { id: "pending-design", label: "Pending design (UX-Q-20)" },
  { id: "error", label: "Error: system" },
  { id: "step-up-required", label: "Step-up required" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

interface Pair {
  n: number;
  tenant: string;
  userId: string;
  covered: boolean;
}
type Res =
  | {
      kind: "access";
      status: "queued" | "generating" | "ready" | "failed" | "expired";
      refused: string[];
      pairs: number;
    }
  | { kind: "erasure"; failed: string[]; refused: string[]; pairs: number }
  | { kind: "nodata"; pairs: number };

export function S10({ st }: { st: string }) {
  const { guard } = useProto();
  const [ref, setRef] = useState("");
  const [pairs, setPairs] = useState<Pair[]>([
    { n: 1, tenant: "", userId: "", covered: false },
  ]);
  const [next, setNext] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<Res | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote("");
    const map: Record<string, Res | null> = {
      "loading-queued": {
        kind: "access",
        status: "queued",
        refused: [],
        pairs: 2,
      },
      "loading-generating": {
        kind: "access",
        status: "generating",
        refused: [],
        pairs: 2,
      },
      failed: { kind: "access", status: "failed", refused: [], pairs: 2 },
      "success-access": {
        kind: "access",
        status: "ready",
        refused: [],
        pairs: 2,
      },
      "success-erasure": { kind: "erasure", failed: [], refused: [], pairs: 2 },
      "no-data": { kind: "nodata", pairs: 1 },
      "error-partial-erasure": {
        kind: "erasure",
        failed: ["Messaging layer", "Exports"],
        refused: [],
        pairs: 2,
      },
      "partial-refused": {
        kind: "access",
        status: "ready",
        refused: [UNCOVERED_TENANT],
        pairs: 1,
      },
      expired: { kind: "access", status: "expired", refused: [], pairs: 2 },
    };
    setRes(map[st] ?? null);
  }, [st]);

  // Simulated progress (the real screen polls every 10 seconds; shortened here to 3 seconds for review).
  useEffect(() => {
    if (!res || res.kind !== "access") return;
    if (res.status !== "queued" && res.status !== "generating") return;
    if (st === "loading-queued" || st === "loading-generating") return;
    const h = window.setTimeout(
      () =>
        setRes({
          ...res,
          status: res.status === "queued" ? "generating" : "ready",
        }),
      3000,
    );
    return () => window.clearTimeout(h);
  }, [res, st]);

  const upd = (n: number, p: Partial<Pair>) =>
    setPairs(pairs.map((x) => (x.n === n ? { ...x, ...p } : x)));
  const addPair = () => {
    if (pairs.length >= 20) return setErrors({ "add-pair": VM.v22b });
    setPairs([...pairs, { n: next, tenant: "", userId: "", covered: false }]);
    setNext(next + 1);
    setErrors({});
  };

  const run = (mode: "access" | "erasure") => {
    setAttempt((a) => a + 1);
    const er: Record<string, string> = {};
    if (!ref.trim()) er.ref = VM.v19;
    else if (ref.length > 100) er.ref = VM.v19a;
    if (pairs.length === 0) er["add-pair"] = VM.v22c;
    pairs.forEach((p) => {
      if (!p.tenant) er[`pair-${p.n}-tenant`] = VM.v20;
      if (!p.userId.trim()) er[`pair-${p.n}-user`] = VM.v21;
      if (p.tenant && !p.covered) er[`pair-${p.n}-cov`] = coverText(p.tenant);
    });
    setErrors(er);
    if (Object.keys(er).length) return;
    const refused = Array.from(
      new Set(
        pairs.filter((p) => p.tenant === UNCOVERED_TENANT).map((p) => p.tenant),
      ),
    );
    const ok = pairs.filter((p) => p.tenant !== UNCOVERED_TENANT);
    if (ok.length === 0) {
      setErrors({ "pair-1-tenant": vm22(UNCOVERED_TENANT) });
      return;
    }
    guard(
      { stepUp: mode === "access" ? "DSAR export" : "DSAR deletion" },
      () => {
        const idsUsed = ok.map((p) => p.userId);
        const nodata = idsUsed.every((u) => u === "user-none");
        const failed =
          mode === "erasure" && idsUsed.includes("user-fail")
            ? ["Messaging layer", "Exports"]
            : [];
        if (nodata) setRes({ kind: "nodata", pairs: ok.length });
        else if (mode === "access")
          setRes({
            kind: "access",
            status: "queued",
            refused,
            pairs: ok.length,
          });
        else setRes({ kind: "erasure", failed, refused, pairs: ok.length });
        // C-4: user ids are visible only during entry.
        setPairs([{ n: next, tenant: "", userId: "", covered: false }]);
        setNext(next + 1);
        setRef("");
        setNote("");
      },
    );
  };
  const rerun = () =>
    guard({ stepUp: "DSAR deletion" }, () => {
      setRes((r) => (r && r.kind === "erasure" ? { ...r, failed: [] } : r));
      setNote("Erasure re-run completed for the failed stores.");
    });

  const refusedList = res && res.kind !== "nodata" ? res.refused : [];
  return (
    <Page title="Data-subject access and erasure">
      <Gate st={st}>
        {st === "pending-design" ? <Pending /> : null}
        <ErrorSummary errors={errors} attempt={attempt} />
        <form onSubmit={(e: FormEvent) => e.preventDefault()} noValidate>
          <Field
            id="ref"
            label="Verification reference"
            required
            hint="Free text, up to 100 characters."
            error={errors.ref}
          >
            {(f) => (
              <input
                {...f}
                type="text"
                autoComplete="off"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            )}
          </Field>
          <h2>Pairs (1 to 20)</h2>
          {pairs.map((p, i) => (
            <fieldset className="pair" key={p.n}>
              <legend>Pair {i + 1}</legend>
              <div className="row">
                <Field
                  id={`pair-${p.n}-tenant`}
                  label="Tenant"
                  error={errors[`pair-${p.n}-tenant`]}
                >
                  {(f) => (
                    <select
                      {...f}
                      value={p.tenant}
                      onChange={(e) =>
                        upd(p.n, { tenant: e.target.value, covered: false })
                      }
                    >
                      <option value="">Choose</option>
                      {TENANTS.map((t) => (
                        <option key={t.id}>{t.id}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field
                  id={`pair-${p.n}-user`}
                  label="User id"
                  error={errors[`pair-${p.n}-user`]}
                >
                  {(f) => (
                    <input
                      {...f}
                      type="text"
                      autoComplete="off"
                      value={p.userId}
                      onChange={(e) => upd(p.n, { userId: e.target.value })}
                    />
                  )}
                </Field>
              </div>
              <div
                className={
                  errors[`pair-${p.n}-cov`] ? "field has-error" : "field"
                }
              >
                <label>
                  <input
                    id={`pair-${p.n}-cov`}
                    type="checkbox"
                    checked={p.covered}
                    aria-describedby={
                      errors[`pair-${p.n}-cov`]
                        ? `pair-${p.n}-cov-err`
                        : undefined
                    }
                    onChange={(e) => upd(p.n, { covered: e.target.checked })}
                  />{" "}
                  The verification reference covers this tenant
                </label>
                {errors[`pair-${p.n}-cov`] ? (
                  <div id={`pair-${p.n}-cov-err`} className="field-error">
                    {errors[`pair-${p.n}-cov`]}
                  </div>
                ) : null}
              </div>
              {pairs.length > 1 ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPairs(pairs.filter((x) => x.n !== p.n))}
                >
                  Remove pair {i + 1}
                </button>
              ) : null}
            </fieldset>
          ))}
          <div className="actions">
            <button type="button" className="secondary" onClick={addPair}>
              Add pair
            </button>
          </div>
          {errors["add-pair"] ? (
            <div id="add-pair" className="field-error" tabIndex={-1}>
              {errors["add-pair"]}
            </div>
          ) : null}
          <div className="actions">
            <button type="button" onClick={() => run("access")}>
              Run access
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => run("erasure")}
            >
              Run erasure
            </button>
          </div>
        </form>

        <h2>Result</h2>
        <Live>{note ? <Notice kind="success">{note}</Notice> : null}</Live>
        {refusedList.length ? (
          <Notice kind="warn">
            <ul>
              {refusedList.map((t) => (
                <li key={t}>{vm22(t)}</li>
              ))}
            </ul>
            The other pairs follow the request.
          </Notice>
        ) : null}
        {!res ? <p>No request run yet.</p> : null}
        {res ? (
          <p>
            Request reference: REQ-XXXX-7F3A (masked). Pairs: {res.pairs}. Time:{" "}
            {NOW_UTC}. User ids are not shown.
          </p>
        ) : null}
        {res?.kind === "nodata" ? (
          <Notice>
            No data is held for the subject. The request and outcome were
            recorded.
          </Notice>
        ) : null}
        {res?.kind === "access" ? (
          <div role="status" aria-live="polite">
            {res.status === "queued" || res.status === "generating" ? (
              <>
                <Busy label="Generating the export. This takes up to 15 minutes." />
                <p>Status: {res.status}. Updated every 10 seconds.</p>
              </>
            ) : null}
            {res.status === "ready" ? (
              <Notice kind="success">
                Export ready. It is available until 2026-11-05 10:00 UTC and is
                then deleted.{" "}
                <button
                  type="button"
                  onClick={() =>
                    guard({ stepUp: "DSAR export" }, () =>
                      setNote(
                        "Download started (prototype: no file). The download is audited.",
                      ),
                    )
                  }
                >
                  Download JSON export (expires 2026-11-05 10:00 UTC)
                </button>
              </Notice>
            ) : null}
            {res.status === "failed" ? (
              <Notice kind="error">
                Status: failed. The export could not be generated. Run access
                again.
              </Notice>
            ) : null}
            {res.status === "expired" ? (
              <Notice kind="warn">
                This export has expired and was deleted.
              </Notice>
            ) : null}
          </div>
        ) : null}
        {res?.kind === "erasure" ? (
          <>
            <StoreOutcome failed={res.failed} />
            {res.failed.length ? (
              <Notice kind="error">
                Erasure did not finish for: {res.failed.join(", ")}.{" "}
                <button type="button" onClick={rerun}>
                  Re-run erasure for failed stores
                </button>
              </Notice>
            ) : null}
            <Notice>
              Unparseable dead-letter messages cannot be matched to a subject.
              They are never displayed or revealable and expire within 7 days.
            </Notice>
          </>
        ) : null}
        <Hint>
          Tenant tenant-charlie is not covered by any reference (VM-22). User id
          "user-none" gives the no-data result; "user-fail" fails two stores on
          erasure. Export progress is accelerated to 3-second steps. The tick
          box per pair is VM-22a.
        </Hint>
      </Gate>
    </Page>
  );
}

/* ---------- S-11 Objection and S-12 Restriction (shared pattern) ---------- */
interface Entry {
  ref: string;
  added: string;
  by: string;
  tenant: string;
}
interface Cfg {
  title: string;
  noun: string;
  tenantMissing: string;
  userMissing: string;
  uncovered: (t: string) => string;
  dup: string;
  refAdd: string;
  refRemove: string;
  refLong: string;
  stepAdd: string;
  stepRemove: string;
  empty: string;
  removeConfirm: string;
}
const S11_CFG: Cfg = {
  title: "Objection (suppression list)",
  noun: "suppression",
  tenantMissing: VM.v23,
  userMissing: VM.v24,
  uncovered: vmNotCovered,
  dup: VM.v26,
  refAdd: VM.v27,
  refRemove: VM.v27,
  refLong: VM.v27a,
  stepAdd: "Record objection",
  stepRemove: "Remove suppression entry",
  empty: "No objections are recorded for this tenant.",
  removeConfirm:
    "Remove this entry from the suppression list? New events for the subject will be stored again.",
};
const S12_CFG: Cfg = {
  title: "Restriction list",
  noun: "restriction",
  tenantMissing: VM.v28,
  userMissing: VM.v29,
  uncovered: vmNotCovered,
  dup: VM.v31,
  refAdd: VM.v19,
  refRemove: VM.v32,
  refLong: VM.v32a,
  stepAdd: "Add restriction",
  stepRemove: "Remove restriction entry",
  empty: "No restrictions are recorded for this tenant.",
  removeConfirm:
    "Remove this entry from the restriction list? The subject's events will be included in queries again.",
};

export const S11_STATES: StateDef[] = [
  { id: "default", label: "Default (list with entries)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no objections)" },
  { id: "error", label: "Error" },
  { id: "success", label: "Success: objection recorded + per-store outcome" },
  { id: "partial", label: "Partial: erasure failed in some stores" },
  { id: "step-up-required", label: "Step-up required" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];
export const S12_STATES: StateDef[] = [
  { id: "default", label: "Default (list with entries)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no restrictions)" },
  { id: "error", label: "Error" },
  { id: "success-add", label: "Success: add" },
  { id: "success-remove", label: "Success: remove" },
  { id: "step-up-required", label: "Step-up required" },
  { id: "pending-design", label: "Pending design (UX-Q-20)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

const SEED: Entry[] = [
  {
    ref: "REQ-XXXX-1A2B",
    added: "2026-10-20 09:12 UTC",
    by: "admin-0001",
    tenant: "tenant-alpha",
  },
  {
    ref: "REQ-XXXX-3C4D",
    added: "2026-10-22 14:40 UTC",
    by: "admin-0001",
    tenant: "tenant-alpha",
  },
  {
    ref: "REQ-XXXX-5E6F",
    added: "2026-10-25 11:05 UTC",
    by: "admin-0002",
    tenant: "tenant-bravo",
  },
];

function SubjectScreen({
  st,
  cfg,
  isObjection,
}: {
  st: string;
  cfg: Cfg;
  isObjection: boolean;
}) {
  const { guard } = useProto();
  const [entries, setEntries] = useState<Entry[]>(SEED);
  const [listTenant, setListTenant] = useState("tenant-alpha");
  const [ref, setRef] = useState("");
  const [tenant, setTenant] = useState("");
  const [userId, setUserId] = useState("");
  const [covered, setCovered] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState<"" | "add" | "remove">("");
  const [failed, setFailed] = useState<string[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [rmRef, setRmRef] = useState("");
  const [rmErr, setRmErr] = useState("");

  useEffect(() => {
    setMsg("");
    setFailed(null);
    if (st === "success" || st === "success-add") {
      setMsg("add");
      if (isObjection) setFailed([]);
    }
    if (st === "partial") {
      setMsg("add");
      setFailed(["Messaging layer", "Deduplication state"]);
    }
    if (st === "success-remove") setMsg("remove");
  }, [st, isObjection]);

  const view = (st === "empty" ? [] : entries).filter(
    (e) => e.tenant === listTenant,
  );

  const add = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const er: Record<string, string> = {};
    if (!ref.trim()) er.sref = cfg.refAdd;
    else if (ref.length > 100) er.sref = cfg.refLong;
    if (!tenant) er.stenant = cfg.tenantMissing;
    if (!userId.trim()) er.suser = cfg.userMissing;
    if (tenant && !er.stenant) {
      if (tenant === UNCOVERED_TENANT) er.stenant = cfg.uncovered(tenant);
      else if (!covered) er.scov = coverText(tenant);
      else if (userId.trim() === "user-0002" && tenant === "tenant-alpha")
        er.suser = cfg.dup;
    }
    setErrors(er);
    if (Object.keys(er).length) return;
    guard({ stepUp: cfg.stepAdd }, () => {
      const f =
        isObjection && userId.trim() === "user-fail"
          ? ["Messaging layer", "Deduplication state"]
          : [];
      setEntries((x) => [
        ...x,
        {
          ref: "REQ-XXXX-" + String(x.length + 1).padStart(4, "0"),
          added: NOW_UTC,
          by: "admin-0001",
          tenant,
        },
      ]);
      setListTenant(tenant);
      setMsg("add");
      setFailed(isObjection ? f : null);
      // C-4: user id visible only during entry.
      setRef("");
      setUserId("");
      setTenant("");
      setCovered(false);
    });
  };
  const doRemove = () => {
    if (!rmRef.trim()) return setRmErr(cfg.refRemove);
    if (rmRef.length > 100) return setRmErr(cfg.refLong);
    setRmErr("");
    const target = removing;
    guard({ stepUp: cfg.stepRemove, confirm: cfg.removeConfirm }, () => {
      setEntries((x) => x.filter((y) => y.ref !== target));
      setRemoving(null);
      setRmRef("");
      setMsg("remove");
      setFailed(null);
    });
  };

  return (
    <Page title={cfg.title}>
      <Gate st={st}>
        {st === "pending-design" ? <Pending /> : null}
        {!isObjection ? (
          <p>
            Effect: stored events are kept and excluded from totals, unique
            users and breakdowns for queries started after saving.
          </p>
        ) : null}
        <Live>
          {msg === "add" && !isObjection ? (
            <Notice kind="success">
              Restriction added. The subject's events are kept and excluded from
              queries started from now.
            </Notice>
          ) : null}
          {msg === "add" && isObjection ? (
            <Notice kind={failed && failed.length ? "warn" : "success"}>
              {failed && failed.length
                ? `Erasure did not finish for: ${failed.join(", ")}. The suppression is in effect. Re-run the erasure.`
                : "Objection recorded. New events for this subject are no longer stored. Erasure outcome:"}
            </Notice>
          ) : null}
          {msg === "remove" ? (
            <Notice kind="success">
              {isObjection
                ? "Entry removed. New events for the subject are stored again."
                : "Restriction removed. Queries started from now include the subject's events again."}
            </Notice>
          ) : null}
        </Live>
        {isObjection && msg === "add" && failed ? (
          <StoreOutcome failed={failed} />
        ) : null}
        {isObjection && failed && failed.length ? (
          <div className="actions">
            <button
              type="button"
              onClick={() =>
                guard({ stepUp: "Re-run erasure" }, () => {
                  setFailed([]);
                })
              }
            >
              Re-run erasure for failed stores
            </button>
          </div>
        ) : null}

        <h2>Add</h2>
        <ErrorSummary errors={errors} attempt={attempt} />
        <form onSubmit={add} noValidate>
          <Field
            id="sref"
            label="Verification reference"
            required
            hint="Free text, up to 100 characters."
            error={errors.sref}
          >
            {(f) => (
              <input
                {...f}
                type="text"
                autoComplete="off"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            )}
          </Field>
          <div className="row">
            <Field id="stenant" label="Tenant" error={errors.stenant}>
              {(f) => (
                <select
                  {...f}
                  value={tenant}
                  onChange={(e) => {
                    setTenant(e.target.value);
                    setCovered(false);
                  }}
                >
                  <option value="">Choose</option>
                  {TENANTS.map((t) => (
                    <option key={t.id}>{t.id}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field id="suser" label="User id" error={errors.suser}>
              {(f) => (
                <input
                  {...f}
                  type="text"
                  autoComplete="off"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className={errors.scov ? "field has-error" : "field"}>
            <label>
              <input
                id="scov"
                type="checkbox"
                checked={covered}
                aria-describedby={errors.scov ? "scov-err" : undefined}
                onChange={(e) => setCovered(e.target.checked)}
              />{" "}
              The verification reference covers this tenant
            </label>
            {errors.scov ? (
              <div id="scov-err" className="field-error">
                {errors.scov}
              </div>
            ) : null}
          </div>
          <div className="actions">
            <button type="submit">
              {isObjection ? "Record objection" : "Add restriction"}
            </button>
          </div>
        </form>

        <h2>Current {cfg.noun} entries</h2>
        <Field id="list-tenant" label="Tenant">
          {(f) => (
            <select
              {...f}
              value={listTenant}
              onChange={(e) => setListTenant(e.target.value)}
            >
              {TENANTS.map((t) => (
                <option key={t.id}>{t.id}</option>
              ))}
            </select>
          )}
        </Field>
        {isObjection ? (
          <p>
            New events dropped for {listTenant}:{" "}
            {listTenant === "tenant-alpha" ? 14 : 2}.
          </p>
        ) : null}
        <p>Entries: {view.length}. User ids are never shown.</p>
        {view.length === 0 ? (
          <Notice>{cfg.empty}</Notice>
        ) : (
          <table>
            <caption>
              {cfg.title} for {listTenant}
            </caption>
            <thead>
              <tr>
                <th scope="col">Request reference (masked)</th>
                <th scope="col">Date added (UTC)</th>
                <th scope="col">Added by</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {view.map((e) => (
                <tr key={e.ref}>
                  <th scope="row">{e.ref}</th>
                  <td>{e.added}</td>
                  <td>{e.by}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setRemoving(e.ref);
                        setRmRef("");
                        setRmErr("");
                      }}
                    >
                      Remove entry added {e.added}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {removing ? (
          <section aria-label="Remove entry">
            <Field
              id="rmref"
              label="Verification reference to remove the entry"
              required
              error={rmErr}
            >
              {(f) => (
                <input
                  {...f}
                  type="text"
                  autoComplete="off"
                  value={rmRef}
                  onChange={(e) => setRmRef(e.target.value)}
                />
              )}
            </Field>
            <div className="actions">
              <button type="button" className="danger" onClick={doRemove}>
                Remove entry
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setRemoving(null)}
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}
        <Hint>
          Tenant tenant-charlie is not covered (VM-{isObjection ? "25" : "30"}).
          Adding user-0002 for tenant-alpha is a duplicate.{" "}
          {isObjection ? 'User id "user-fail" fails two erasure stores. ' : ""}
          Removal needs a reference, step-up and a confirmation.
        </Hint>
      </Gate>
    </Page>
  );
}

export function S11({ st }: { st: string }) {
  return <SubjectScreen st={st} cfg={S11_CFG} isObjection />;
}
export function S12({ st }: { st: string }) {
  return <SubjectScreen st={st} cfg={S12_CFG} isObjection={false} />;
}

/* ---------- S-13 Retention ---------- */
export const S13_STATES: StateDef[] = [
  { id: "default", label: "Default (value shown)" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error" },
  { id: "success", label: "Success: saved" },
  { id: "success-lengthen", label: "Success: lengthened note" },
  { id: "step-up-required", label: "Step-up required (shortening)" },
  { id: "confirmation", label: "Confirmation dialog (purge counts)" },
  { id: "pending-design", label: "Pending design (UX-Q-20)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

function isoMinusDays(n: number): string {
  const d = new Date("2026-10-29T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function S13({ st }: { st: string }) {
  const { guard, confirm } = useProto();
  const [tenant, setTenant] = useState("tenant-alpha");
  const [current, setCurrent] = useState<Record<string, number>>({
    "tenant-alpha": 396,
    "tenant-bravo": 90,
    "tenant-charlie": 396,
  });
  const [val, setVal] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMsg(
      st === "success"
        ? "Retention saved. It applies to existing data at the next purge run."
        : st === "success-lengthen"
          ? "Retention saved. It applies to existing data at the next purge run. Data already purged is not restored."
          : "",
    );
    if (st === "confirmation")
      confirm(
        `Saving this value will purge 12,340 events recorded from ${isoMinusDays(396)} to ${isoMinusDays(181)} UTC at the next purge run. Nothing is purged until you confirm.`,
        () =>
          setMsg(
            "Retention saved. It applies to existing data at the next purge run.",
          ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st]);

  const cur = current[tenant] ?? 396;
  const save = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const v = val.trim();
    let m = "";
    if (!v) m = VM.v33;
    else if (!/^-?\d+$/.test(v)) m = VM.v34;
    else if (Number(v) < 1) m = VM.v35;
    else if (Number(v) > 396) m = VM.v36;
    setErr(m ? { ret: m } : {});
    if (m) return;
    const n = Number(v);
    const commit = () => {
      setCurrent({ ...current, [tenant]: n });
      setMsg(
        n > cur
          ? "Retention saved. It applies to existing data at the next purge run. Data already purged is not restored."
          : "Retention saved. It applies to existing data at the next purge run.",
      );
      setVal("");
    };
    if (n < cur) {
      const events = (cur - n) * 1234;
      guard(
        {
          stepUp: "Retention shortening",
          confirm: `Saving this value will purge ${events.toLocaleString("en-US")} events recorded from ${isoMinusDays(cur)} to ${isoMinusDays(n + 1)} UTC at the next purge run. Nothing is purged until you confirm.`,
        },
        commit,
      );
    } else commit();
  };

  return (
    <Page title="Tenant retention">
      <Gate st={st}>
        {st === "pending-design" ? <Pending /> : null}
        <Field id="rt" label="Tenant">
          {(f) => (
            <select
              {...f}
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
            >
              {TENANTS.map((t) => (
                <option key={t.id}>{t.id}</option>
              ))}
            </select>
          )}
        </Field>
        <p>
          Current retention: {cur} days. A change applies at the next purge run.
        </p>
        <Live>{msg ? <Notice kind="success">{msg}</Notice> : null}</Live>
        <ErrorSummary errors={err} attempt={attempt} />
        <form onSubmit={save} noValidate>
          <Field
            id="ret"
            label="Retention (days)"
            hint="1 to 396"
            error={err.ret}
          >
            {(f) => (
              <input
                {...f}
                type="text"
                inputMode="numeric"
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
            )}
          </Field>
          <div className="actions">
            <button type="submit">Save</button>
          </div>
        </form>
        <Hint>
          Enter a value below the current one (for example 30) to see step-up
          then the purge confirmation. 0 gives VM-35, 400 gives VM-36, 1.5 gives
          VM-34, empty gives VM-33.
        </Hint>
      </Gate>
    </Page>
  );
}

/* ---------- S-14 Allow-list ---------- */
export const S14_STATES: StateDef[] = [
  { id: "default", label: "Default (keys listed)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no keys)" },
  { id: "error", label: "Error" },
  { id: "success", label: "Success: key added" },
  { id: "step-up-required", label: "Step-up required" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

export function S14({ st }: { st: string }) {
  const { guard } = useProto();
  const [tenant, setTenant] = useState("tenant-alpha");
  const [keys, setKeys] = useState<Record<string, string[]>>({
    "tenant-alpha": ["page_name", "plan_tier"],
    "tenant-bravo": [],
    "tenant-charlie": ["screen_id"],
  });
  const [key, setKey] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setMsg(
      st === "success"
        ? "Key campaign_id added. It is accepted from this tenant now."
        : "",
    );
  }, [st]);

  const list = st === "empty" ? [] : (keys[tenant] ?? []);
  const add = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const k = key.trim();
    let m = "";
    if (!k) m = VM.v48;
    else if (k.length > 64) m = VM.v51;
    else if (!/^[a-z][a-z0-9_]*$/.test(k)) m = VM.v50;
    else if ((keys[tenant] ?? []).includes(k)) m = VM.v49;
    setErr(m ? { key: m } : {});
    if (m) return;
    guard({ stepUp: "Allow-list change" }, () => {
      setKeys({ ...keys, [tenant]: [...(keys[tenant] ?? []), k] });
      setMsg(`Key ${k} added. It is accepted from this tenant now.`);
      setKey("");
    });
  };
  const remove = (k: string) =>
    guard({ stepUp: "Allow-list change" }, () => {
      setKeys({
        ...keys,
        [tenant]: (keys[tenant] ?? []).filter((x) => x !== k),
      });
      setMsg(`Key ${k} removed.`);
    });

  return (
    <Page title="Allow-listed property keys">
      <Gate st={st}>
        <Field id="al-tenant" label="Tenant">
          {(f) => (
            <select
              {...f}
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
            >
              {TENANTS.map((t) => (
                <option key={t.id}>{t.id}</option>
              ))}
            </select>
          )}
        </Field>
        <p>Dropped-key count for {tenant}: 5.</p>
        <Live>{msg ? <Notice kind="success">{msg}</Notice> : null}</Live>
        {list.length === 0 ? (
          <Notice>
            No keys are allow-listed for this tenant. Free-form properties are
            dropped.
          </Notice>
        ) : (
          <table>
            <caption>Allowed keys for {tenant}</caption>
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((k) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => remove(k)}
                    >
                      Remove {k}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ErrorSummary errors={err} attempt={attempt} />
        <form onSubmit={add} noValidate>
          <Field
            id="key"
            label="Property key"
            hint="Do not allow keys that carry personal data, such as email, name or phone. Values that look like personal data are not stored."
            error={err.key}
          >
            {(f) => (
              <input
                {...f}
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            )}
          </Field>
          <div className="actions">
            <button type="submit">Add key</button>
          </div>
        </form>
      </Gate>
    </Page>
  );
}
