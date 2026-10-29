import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useProto } from "../ctx";
import { VM } from "../messages";
import { TENANTS } from "../mock";
import {
  CopyBox,
  ErrorSummary,
  Field,
  Gate,
  Hint,
  Live,
  Notice,
  Page,
  type StateDef,
} from "../ui";

/* ---------- S-15 Accounts ---------- */
export const S15_STATES: StateDef[] = [
  { id: "default", label: "Default (list)" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error" },
  { id: "created-user", label: "Success: create (user) + one-time link" },
  { id: "created-admin", label: "Success: create (admin) + one-time link" },
  { id: "disabled", label: "Success: disable" },
  { id: "reset", label: "Success: reset credential + link" },
  { id: "role", label: "Success: role change" },
  { id: "mfa", label: "Success: MFA reset" },
  { id: "unlock", label: "Success: unlock" },
  { id: "refused", label: "Refused: last admin (VM-40)" },
  { id: "step-up-required", label: "Step-up required" },
  { id: "leaving-link", label: "Leaving a link (confirmation)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

interface Acct {
  name: string;
  role: "user" | "admin";
  status: "active" | "disabled" | "locked";
  mfa: string;
}
const LINK_TEXT =
  "Give this link to the account holder. It works once and expires in 24 hours. It is not shown again. No email is sent.";
const LEAVE = "You cannot see this again. Leave without copying it?";

export function S15({ st }: { st: string }) {
  const { guard, confirm, setLeaveGuard } = useProto();
  const [accts, setAccts] = useState<Acct[]>([
    {
      name: "user-0001",
      role: "user",
      status: "active",
      mfa: "not applicable",
    },
    {
      name: "user-0002",
      role: "user",
      status: "locked",
      mfa: "not applicable",
    },
    { name: "admin-0001", role: "admin", status: "active", mfa: "enrolled" },
    { name: "admin-0002", role: "admin", status: "disabled", mfa: "enrolled" },
  ]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState<{
    for: string;
    admin: boolean;
    reset: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState("");

  useEffect(() => {
    setMsg("");
    setLink(null);
    setCopied(false);
    setErrors({});
    if (st === "created-user") {
      setMsg("Account user-0004 created.");
      setLink({ for: "user-0004", admin: false, reset: false });
    }
    if (st === "created-admin") {
      setMsg("Account admin-0003 created.");
      setLink({ for: "admin-0003", admin: true, reset: false });
    }
    if (st === "disabled")
      setMsg("Account disabled. Existing sessions end on the next request.");
    if (st === "reset")
      setLink({ for: "user-0001", admin: false, reset: true });
    if (st === "role")
      setMsg(
        "Role changed. It takes effect on the next request and other sessions of this account are ended.",
      );
    if (st === "mfa")
      setMsg(
        "Authenticator reset. admin-0002 must set it up again at next sign-in.",
      );
    if (st === "unlock") setMsg("Account unlocked.");
    if (st === "refused") setErrors({ "acct-table": VM.v40 });
    if (st === "leaving-link") {
      setLink({ for: "user-0004", admin: false, reset: false });
      confirm(LEAVE, () => setLink(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st]);

  useEffect(() => {
    setLeaveGuard(link && !copied ? LEAVE : null);
    return () => setLeaveGuard(null);
  }, [link, copied, setLeaveGuard]);

  const activeAdmins = accts.filter(
    (a) => a.role === "admin" && a.status === "active",
  ).length;
  const isLastAdmin = (a: Acct) =>
    a.role === "admin" && a.status === "active" && activeAdmins <= 1;
  const refuse = () => {
    setErrors({ "acct-table": VM.v40 });
    setAttempt((x) => x + 1);
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const er: Record<string, string> = {};
    if (!name.trim()) er.uname = VM.v38;
    else if (accts.some((a) => a.name === name.trim())) er.uname = VM.v39;
    if (!role) er.urole = VM.v37;
    setErrors(er);
    if (Object.keys(er).length) return;
    const make = () => {
      const n = name.trim();
      setAccts((x) => [
        ...x,
        {
          name: n,
          role: role === "admin" ? "admin" : "user",
          status: "active",
          mfa: role === "admin" ? "reset required" : "not applicable",
        },
      ]);
      setMsg(`Account ${n} created.`);
      setLink({ for: n, admin: role === "admin", reset: false });
      setCopied(false);
      setName("");
      setRole("");
    };
    guard(role === "admin" ? { stepUp: "Create admin account" } : {}, make);
  };

  const patch = (n: string, p: Partial<Acct>) =>
    setAccts((x) => x.map((a) => (a.name === n ? { ...a, ...p } : a)));
  const disable = (a: Acct) => {
    setErrors({});
    if (isLastAdmin(a)) return refuse();
    guard(
      { confirm: `Disable account ${a.name}? The account cannot sign in.` },
      () => {
        patch(a.name, { status: "disabled" });
        setMsg("Account disabled. Existing sessions end on the next request.");
        setLink(null);
      },
    );
  };
  const reset = (a: Acct) => {
    setErrors({});
    guard({ stepUp: "Reset credential" }, () => {
      setLink({ for: a.name, admin: a.role === "admin", reset: true });
      setCopied(false);
      setMsg("");
    });
  };
  const changeRole = (a: Acct) => {
    setErrors({});
    if (isLastAdmin(a)) return refuse();
    guard({ stepUp: "Change role" }, () => {
      patch(a.name, { role: a.role === "admin" ? "user" : "admin" });
      setMsg(
        "Role changed. It takes effect on the next request and other sessions of this account are ended.",
      );
    });
  };
  const resetMfa = (a: Acct) => {
    setErrors({});
    guard(
      {
        stepUp: "Reset authenticator",
        confirm: `Reset the authenticator for ${a.name}? They must set it up again at next sign-in.`,
      },
      () => {
        patch(a.name, { mfa: "reset required" });
        setMsg(
          `Authenticator reset. ${a.name} must set it up again at next sign-in.`,
        );
      },
    );
  };
  const unlock = (a: Acct) => {
    setErrors({});
    guard({ stepUp: "Unlock account" }, () => {
      patch(a.name, { status: "active" });
      setMsg("Account unlocked.");
    });
  };
  const leave = () => {
    if (copied) setLink(null);
    else confirm(LEAVE, () => setLink(null));
  };

  const linkValue = useMemo(
    () => "https://example.com/set-password/DEMO-ONE-TIME-TOKEN",
    [],
  );
  return (
    <Page title="Accounts">
      <Gate st={st}>
        <Live>{msg ? <Notice kind="success">{msg}</Notice> : null}</Live>
        <ErrorSummary errors={errors} attempt={attempt} />
        {link ? (
          <section aria-labelledby="link-h" className="notice warn">
            <h2 id="link-h">
              {link.reset
                ? `Reset link for ${link.for}`
                : `One-time setup link for ${link.for}`}
            </h2>
            <CopyBox
              label="Link"
              value={linkValue}
              onCopied={() => {
                setCopied(true);
                setLive("Link copied");
              }}
            />
            <p>{LINK_TEXT}</p>
            {link.admin ? (
              <p>
                {link.for} will set a password and set up an authenticator using
                this link.
              </p>
            ) : null}
            <Live>{live}</Live>
            <button type="button" className="secondary" onClick={leave}>
              Done
            </button>
          </section>
        ) : null}
        <table id="acct-table" tabIndex={-1}>
          <caption>Accounts</caption>
          <thead>
            <tr>
              <th scope="col">Username</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Authenticator</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accts.map((a) => (
              <tr key={a.name}>
                <th scope="row">{a.name}</th>
                <td>{a.role}</td>
                <td>{a.status}</td>
                <td>{a.mfa}</td>
                <td className="actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => disable(a)}
                  >
                    Disable {a.name}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => reset(a)}
                  >
                    Reset credential for {a.name}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => changeRole(a)}
                  >
                    Change role of {a.name}
                  </button>
                  {a.role === "admin" ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => resetMfa(a)}
                    >
                      Reset authenticator of {a.name}
                    </button>
                  ) : null}
                  {a.status === "locked" ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => unlock(a)}
                    >
                      Unlock {a.name}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Create account</h2>
        <form onSubmit={create} noValidate>
          <Field id="uname" label="Username" required error={errors.uname}>
            {(f) => (
              <input
                {...f}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field id="urole" label="Role" required error={errors.urole}>
            {(f) => (
              <select
                {...f}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Choose</option>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            )}
          </Field>
          <p>
            There is no initial password. A one-time setup link is shown once.
          </p>
          <div className="actions">
            <button type="submit">Create account</button>
          </div>
        </form>
        <Hint>
          admin-0001 is the only active admin: disabling or demoting it gives
          VM-40. Creating an admin needs step-up. The link is shown once;
          leaving it before copying asks for confirmation (also when navigating
          away).
        </Hint>
      </Gate>
    </Page>
  );
}

/* ---------- S-16 Producer credentials ---------- */
export const S16_STATES: StateDef[] = [
  { id: "default", label: "Default (list)" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no credentials)" },
  { id: "error", label: "Error" },
  { id: "created", label: "Success: create + secret once" },
  { id: "rotated", label: "Success: rotate + secret once" },
  { id: "revoked", label: "Success: revoke" },
  { id: "step-up-required", label: "Step-up required" },
  { id: "leaving-secret", label: "Leaving a secret (confirmation)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

interface Cred {
  id: string;
  tenant: string;
  status: "active" | "in rotation overlap" | "revoked";
  overlap?: string;
  revokedAt?: string;
}
const LEAVE_SECRET = "You cannot see this again. Leave without copying it?";

export function S16({ st }: { st: string }) {
  const { guard, confirm, setLeaveGuard } = useProto();
  const [creds, setCreds] = useState<Cred[]>([
    { id: "cred-0001", tenant: "tenant-alpha", status: "active" },
    {
      id: "cred-0002",
      tenant: "tenant-bravo",
      status: "revoked",
      revokedAt: "2026-10-01 12:00 UTC",
    },
  ]);
  const [tenant, setTenant] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [msg, setMsg] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState("");

  useEffect(() => {
    setMsg("");
    setSecret(null);
    setCopied(false);
    if (st === "created") {
      setMsg(
        "Credential created. Copy the secret now. It is shown once and cannot be shown again.",
      );
      setSecret("DEMO-SECRET-NOT-REAL-0001");
    }
    if (st === "rotated") {
      setMsg(
        "Credential rotated. The old and the new credential are both accepted until 2026-10-30 10:00 UTC (up to 24 hours).",
      );
      setSecret("DEMO-SECRET-NOT-REAL-0002");
    }
    if (st === "revoked")
      setMsg(
        "Credential revoked. Publishes with it are refused within 60 seconds.",
      );
    if (st === "leaving-secret") {
      setSecret("DEMO-SECRET-NOT-REAL-0003");
      confirm(LEAVE_SECRET, () => setSecret(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st]);
  useEffect(() => {
    setLeaveGuard(secret && !copied ? LEAVE_SECRET : null);
    return () => setLeaveGuard(null);
  }, [secret, copied, setLeaveGuard]);

  const list = st === "empty" ? [] : creds;
  const create = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    setErr(tenant ? {} : { ctenant: VM.v43 });
    if (!tenant) return;
    guard({ stepUp: "Create producer credential" }, () => {
      const id = `cred-${String(creds.length + 1).padStart(4, "0")}`;
      setCreds([...creds, { id, tenant, status: "active" }]);
      setMsg(
        "Credential created. Copy the secret now. It is shown once and cannot be shown again.",
      );
      setSecret("DEMO-SECRET-NOT-REAL-" + id);
      setCopied(false);
      setTenant("");
    });
  };
  const rotate = (c: Cred) =>
    guard({ stepUp: "Rotate producer credential" }, () => {
      setCreds(
        creds.map((x) =>
          x.id === c.id
            ? {
                ...x,
                status: "in rotation overlap",
                overlap: "2026-10-30 10:00 UTC",
              }
            : x,
        ),
      );
      setMsg(
        "Credential rotated. The old and the new credential are both accepted until 2026-10-30 10:00 UTC (up to 24 hours).",
      );
      setSecret("DEMO-SECRET-NOT-REAL-ROTATED");
      setCopied(false);
    });
  const revoke = (c: Cred) =>
    guard(
      {
        confirm:
          "Revoke this credential? Publishes with it are refused within 60 seconds.",
      },
      () => {
        setCreds(
          creds.map((x) =>
            x.id === c.id
              ? { ...x, status: "revoked", revokedAt: "2026-10-29 10:00 UTC" }
              : x,
          ),
        );
        setMsg(
          "Credential revoked. Publishes with it are refused within 60 seconds.",
        );
        setSecret(null);
      },
    );

  return (
    <Page title="Producer credentials">
      <Gate st={st}>
        <Live>{msg ? <Notice kind="success">{msg}</Notice> : null}</Live>
        {secret ? (
          <section aria-labelledby="sec-h" className="notice warn">
            <h2 id="sec-h">New secret</h2>
            <CopyBox
              label="Secret"
              value={secret}
              onCopied={() => {
                setCopied(true);
                setLive("Secret copied");
              }}
            />
            <p>
              It is shown once and cannot be shown again. A lost secret means a
              new one is issued.
            </p>
            <Live>{live}</Live>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (copied) setSecret(null);
                else confirm(LEAVE_SECRET, () => setSecret(null));
              }}
            >
              Done
            </button>
          </section>
        ) : null}
        {list.length === 0 ? (
          <Notice>No producer credentials exist for this tenant.</Notice>
        ) : (
          <table>
            <caption>Producer credentials (times UTC)</caption>
            <thead>
              <tr>
                <th scope="col">Credential</th>
                <th scope="col">Tenant</th>
                <th scope="col">Status</th>
                <th scope="col">Permission</th>
                <th scope="col">Overlap expiry</th>
                <th scope="col">Revoked</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.id}</th>
                  <td>{c.tenant}</td>
                  <td>{c.status}</td>
                  <td>Publish events to this tenant</td>
                  <td>{c.overlap ?? ""}</td>
                  <td>
                    {c.revokedAt
                      ? `${c.revokedAt} (publishes refused within 60 seconds)`
                      : ""}
                  </td>
                  <td className="actions">
                    {c.status !== "revoked" ? (
                      <>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => rotate(c)}
                        >
                          Rotate {c.id}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => revoke(c)}
                        >
                          Revoke {c.id}
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h2>Create credential</h2>
        <ErrorSummary errors={err} attempt={attempt} />
        <form onSubmit={create} noValidate>
          <Field id="ctenant" label="Tenant" required error={err.ctenant}>
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
          <p>
            Permission: Publish events to this tenant (the only permission in
            v1).
          </p>
          <div className="actions">
            <button type="submit">Create credential</button>
          </div>
        </form>
        <Hint>
          Secrets are synthetic placeholders. Overlap during rotation is up to
          24 hours.
        </Hint>
      </Gate>
    </Page>
  );
}

/* ---------- S-17 Audit log ---------- */
export const S17_STATES: StateDef[] = [
  { id: "success", label: "Success" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty (no matches)" },
  { id: "error", label: "Error (read-only, Retry)" },
  { id: "permission-denied", label: "Permission-denied -> S-18" },
];

interface Rec {
  time: string;
  actor: string;
  action: string;
  target: string;
  tenant: string;
  outcome: string;
  count?: number;
}
const ACTIONS = [
  "sign_in",
  "step_up",
  "tenant_create",
  "entitlement_grant",
  "dead_letter_open",
  "audit_view",
  "credential_rotate",
];
const RECORDS: Rec[] = Array.from({ length: 120 }, (_, i) => {
  const t = new Date(Date.UTC(2026, 9, 29, 10, 0) - i * 17 * 60000);
  return {
    time: t.toISOString().slice(0, 16).replace("T", " ") + " UTC",
    actor: i % 3 === 0 ? "admin-0002" : "admin-0001",
    action: ACTIONS[i % ACTIONS.length] ?? "sign_in",
    target: `target-${String(i % 9).padStart(3, "0")}`,
    tenant: TENANTS[i % 3]?.id ?? "",
    outcome: i % 11 === 0 ? "refused" : "success",
  };
});
RECORDS.splice(3, 0, {
  time: "2026-10-29 08:55 UTC",
  actor: "platform",
  action: "refused_publish (aggregated)",
  target: "unknown credential",
  tenant: "tenant-alpha",
  outcome: "refused",
  count: 42,
});

export function S17({ st }: { st: string }) {
  const [f, setF] = useState({
    actor: "",
    action: "",
    tenant: "",
    from: "",
    to: "",
  });
  const [applied, setApplied] = useState(f);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [announce, setAnnounce] = useState("");

  const rows = useMemo(
    () =>
      RECORDS.filter(
        (r) =>
          (!applied.actor || r.actor === applied.actor) &&
          (!applied.action || r.action === applied.action) &&
          (!applied.tenant || r.tenant === applied.tenant) &&
          (!applied.from || r.time.slice(0, 10) >= applied.from) &&
          (!applied.to || r.time.slice(0, 10) <= applied.to),
      ),
    [applied],
  );
  const visible = st === "empty" ? [] : rows;
  const pages = Math.max(1, Math.ceil(visible.length / 50));

  const dateOk = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
  const apply = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const er: Record<string, string> = {};
    if (f.from && !dateOk(f.from)) er.afrom = VM.v46;
    if (f.to && !dateOk(f.to)) er.ato = VM.v46;
    if (!er.afrom && !er.ato && f.from && f.to && f.to < f.from)
      er.ato = VM.v45;
    setErrors(er);
    if (Object.keys(er).length) return;
    setApplied(f);
    setPage(1);
    const n = RECORDS.filter(
      (r) =>
        (!f.actor || r.actor === f.actor) &&
        (!f.action || r.action === f.action) &&
        (!f.tenant || r.tenant === f.tenant) &&
        (!f.from || r.time.slice(0, 10) >= f.from) &&
        (!f.to || r.time.slice(0, 10) <= f.to),
    ).length;
    setAnnounce(`${n} records match`);
  };

  return (
    <Page title="Audit log">
      <Gate st={st} readOnly>
        <p>
          Audit records are kept for 12 months. Newest first, 50 per page, times
          in UTC. Opening this viewer is itself audited. Records cannot be
          edited or deleted.
        </p>
        <ErrorSummary errors={errors} attempt={attempt} />
        <form onSubmit={apply} noValidate aria-label="Audit filters">
          <div className="row">
            <Field id="aactor" label="Actor">
              {(p) => (
                <select
                  {...p}
                  value={f.actor}
                  onChange={(e) => setF({ ...f, actor: e.target.value })}
                >
                  <option value="">All</option>
                  <option>admin-0001</option>
                  <option>admin-0002</option>
                  <option>platform</option>
                </select>
              )}
            </Field>
            <Field id="aaction" label="Action">
              {(p) => (
                <select
                  {...p}
                  value={f.action}
                  onChange={(e) => setF({ ...f, action: e.target.value })}
                >
                  <option value="">All</option>
                  {ACTIONS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field id="atenant" label="Tenant">
              {(p) => (
                <select
                  {...p}
                  value={f.tenant}
                  onChange={(e) => setF({ ...f, tenant: e.target.value })}
                >
                  <option value="">All</option>
                  {TENANTS.map((t) => (
                    <option key={t.id}>{t.id}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              id="afrom"
              label="From date (UTC)"
              hint="YYYY-MM-DD"
              error={errors.afrom}
            >
              {(p) => (
                <input
                  {...p}
                  type="text"
                  value={f.from}
                  onChange={(e) => setF({ ...f, from: e.target.value })}
                />
              )}
            </Field>
            <Field
              id="ato"
              label="To date (UTC)"
              hint="YYYY-MM-DD"
              error={errors.ato}
            >
              {(p) => (
                <input
                  {...p}
                  type="text"
                  value={f.to}
                  onChange={(e) => setF({ ...f, to: e.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="actions">
            <button type="submit">Apply filters</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const z = {
                  actor: "",
                  action: "",
                  tenant: "",
                  from: "",
                  to: "",
                };
                setF(z);
                setApplied(z);
                setErrors({});
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </div>
        </form>
        <Live>{announce}</Live>
        {visible.length === 0 ? (
          <Notice>No audit records match these filters.</Notice>
        ) : (
          <>
            <div className="scroll">
              <table>
                <caption>
                  Audit records, newest first ({visible.length} matching)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Time (UTC)</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Target</th>
                    <th scope="col">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.slice((page - 1) * 50, page * 50).map((r, i) => (
                    <tr key={`${r.time}-${i}`}>
                      <td>{r.time}</td>
                      <td>{r.actor}</td>
                      <td>
                        {r.action}
                        {r.count ? ` (count: ${r.count})` : ""}
                      </td>
                      <td>{r.target}</td>
                      <td>{r.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label="Audit log pages" className="actions">
              <button
                type="button"
                className="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous page
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                type="button"
                className="secondary"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                Next page
              </button>
            </nav>
          </>
        )}
      </Gate>
    </Page>
  );
}
