import { useEffect, useState, type FormEvent } from "react";
import { useProto } from "../ctx";
import { SESSION_ENDED, VM } from "../messages";
import {
  Busy,
  ErrorBox,
  ErrorSummary,
  Field,
  Hint,
  Notice,
  Page,
  Pending,
  type StateDef,
} from "../ui";

/* ---------- S-1 Sign-in ---------- */
export const S1_STATES: StateDef[] = [
  { id: "empty", label: "Empty form" },
  { id: "loading", label: "Loading (signing in)" },
  { id: "error-wrong", label: "Error: wrong credentials (VM-1)" },
  { id: "error-locked", label: "Error: locked (same VM-1, UX-D-4)" },
  {
    id: "pending-throttled",
    label: "Pending design: throttled (UX-Q-5, VM-3 provisional)",
  },
  { id: "error-system", label: "Error: system" },
  { id: "success-user", label: "Success (user) -> S-4" },
  { id: "success-admin", label: "Success (admin password step) -> S-2" },
  { id: "session-ended", label: "Session ended banner" },
];

export function S1({ st }: { st: string }) {
  const { go, setRole } = useProto();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (st === "success-user") {
      setRole("user");
      go("S-4");
    } else if (st === "success-admin") {
      go("S-2");
    }
  }, [st, go, setRole]);

  const forced: Record<string, string> =
    st === "error-wrong" || st === "error-locked" ? { username: VM.v1 } : {};
  const shown = Object.keys(errors).length ? errors : forced;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!u.trim()) er.username = VM.v1a;
    if (!p) er.password = VM.v1b;
    setAttempt((a) => a + 1);
    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      if (p === "wrong") {
        setErrors({ username: VM.v1 });
      } else {
        setErrors({});
        if (u.startsWith("admin")) go("S-2");
        else {
          setRole("user");
          go("S-4");
        }
      }
    }, 400);
  };

  const isBusy = busy || st === "loading";
  return (
    <Page title="Sign in">
      {st === "session-ended" ? (
        <Notice kind="warn">{SESSION_ENDED}</Notice>
      ) : null}
      {st === "pending-throttled" ? (
        <>
          <Pending />
          <Notice kind="warn">
            Provisional text only: {VM.v3} (VM-3, pending design, CR-036)
          </Notice>
        </>
      ) : null}
      {st === "error-system" ? <ErrorBox /> : null}
      <ErrorSummary
        errors={shown}
        attempt={attempt + (st === "empty" ? 0 : 1)}
      />
      <form onSubmit={submit} noValidate>
        <Field
          id="username"
          label="Username"
          error={
            shown.username && shown.username !== VM.v1
              ? shown.username
              : undefined
          }
        >
          {(f) => (
            <input
              {...f}
              type="text"
              autoFocus
              value={u}
              onChange={(e) => setU(e.target.value)}
              autoComplete="username"
            />
          )}
        </Field>
        <Field id="password" label="Password" error={shown.password}>
          {(f) => (
            <input
              {...f}
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </Field>
        <div className="actions">
          <button type="submit" disabled={isBusy} aria-busy={isBusy}>
            {isBusy ? "Signing in" : "Sign in"}
          </button>
        </div>
        <div role="status" className="sr-only">
          {isBusy ? "Signing in" : ""}
        </div>
      </form>
      <Hint>
        Any non-empty values sign in. A username starting with "admin" continues
        to S-2. Password "wrong" gives VM-1. No self-service reset exists (v1
        sends no email).
      </Hint>
    </Page>
  );
}

/* ---------- S-2 TOTP ---------- */
export const S2_STATES: StateDef[] = [
  { id: "empty", label: "Empty code field" },
  { id: "loading", label: "Loading (verifying)" },
  { id: "error-wrong", label: "Error: wrong code (VM-4)" },
  { id: "error-replayed", label: "Error: replayed code (VM-5)" },
  { id: "error-locked", label: "Error: locked (generic VM-1)" },
  { id: "pending-repeated", label: "Pending design: repeated fails (UX-Q-3)" },
  { id: "error-nocode", label: "Error: no code supplied (stays on S-2)" },
  { id: "error-system", label: "Error: system" },
  { id: "success", label: "Success -> S-8" },
];

export function CodeField({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange(v: string): void;
  error?: string;
}) {
  return (
    <Field id={id} label="Authenticator code" hint="6 digits" error={error}>
      {(f) => (
        <input
          {...f}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function S2({ st }: { st: string }) {
  const { go, setRole } = useProto();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (st === "success") {
      setRole("admin");
      go("S-8");
    }
  }, [st, go, setRole]);

  const forcedMap: Record<string, string> = {
    "error-wrong": VM.v4,
    "error-replayed": VM.v5,
    "error-locked": VM.v1,
    "error-nocode": VM.v4a,
  };
  const forcedMsg = forcedMap[st];
  const shown = Object.keys(errors).length
    ? errors
    : forcedMsg
      ? { code: forcedMsg }
      : {};

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    if (!/^\d{6}$/.test(code)) return setErrors({ code: VM.v4a });
    if (code === "000000") return setErrors({ code: VM.v4 });
    if (code === "111111") return setErrors({ code: VM.v5 });
    setErrors({});
    setRole("admin");
    go("S-8");
  };

  return (
    <Page title="Authenticator code">
      {st === "error-system" ? <ErrorBox /> : null}
      {st === "pending-repeated" ? <Pending /> : null}
      <ErrorSummary
        errors={shown}
        attempt={attempt + (st === "empty" ? 0 : 1)}
      />
      <form onSubmit={submit} noValidate>
        <CodeField
          id="code"
          value={code}
          onChange={setCode}
          error={shown.code}
        />
        <div className="actions">
          <button
            type="submit"
            disabled={st === "loading"}
            aria-busy={st === "loading"}
          >
            {st === "loading" ? "Verifying" : "Verify"}
          </button>
          <button type="button" className="secondary" onClick={() => go("S-1")}>
            Cancel
          </button>
        </div>
      </form>
      {st === "loading" ? <Busy label="Verifying" /> : null}
      <Hint>
        Any 6 digits verify and continue to S-8. 000000 gives VM-4. 111111 gives
        VM-5. A user-role account never sees S-2. Enrolment content is on S-19.
      </Hint>
    </Page>
  );
}

/* ---------- S-3 Step-up ---------- */
export const S3_STATES: StateDef[] = [
  { id: "empty", label: "Empty fields" },
  { id: "loading", label: "Loading (confirming)" },
  { id: "error-wrong", label: "Error: wrong password or code (VM-6)" },
  { id: "error-replayed", label: "Error: replayed code (VM-5)" },
  {
    id: "pending-repeated",
    label: "Pending design: repeated failure (UX-Q-3)",
  },
  { id: "error-system", label: "Error: system" },
  { id: "success", label: "Success (returns to action, input kept)" },
  { id: "not-required", label: "Not required (last auth <= 5 min)" },
];

export function StepUpForm({
  action,
  forced,
  onSuccess,
  onCancel,
}: {
  action: string;
  forced?: string;
  onSuccess(): void;
  onCancel(): void;
}) {
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);

  const forcedMap: Record<string, string> = {
    "error-wrong": VM.v6,
    "error-replayed": VM.v5,
  };
  const fm = forced ? forcedMap[forced] : undefined;
  const shown = Object.keys(errors).length
    ? errors
    : fm
      ? { "su-password": fm }
      : {};

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    if (!pw || !code) return setErrors({ "su-password": VM.v6a });
    if (pw === "wrong" || code === "000000")
      return setErrors({ "su-password": VM.v6 });
    if (code === "111111") return setErrors({ "su-code": VM.v5 });
    setErrors({});
    onSuccess();
  };

  if (forced === "not-required")
    return (
      <Notice>
        When the last authentication is 5 minutes or less old, S-3 is not shown.
      </Notice>
    );
  if (forced === "success")
    return (
      <Notice kind="success">
        Confirmed. Returning to the blocked action, which resumes with its input
        kept. Step-up is audited.
      </Notice>
    );
  return (
    <form onSubmit={submit} noValidate>
      <p>Confirm it is you to continue: {action}</p>
      {forced === "error-system" ? <ErrorBox /> : null}
      {forced === "pending-repeated" ? <Pending /> : null}
      <ErrorSummary
        errors={shown}
        attempt={attempt + (forced && forced !== "empty" ? 1 : 0)}
      />
      <Field id="su-password" label="Password">
        {(f) => (
          <input
            {...f}
            type="password"
            data-autofocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
          />
        )}
      </Field>
      <CodeField
        id="su-code"
        value={code}
        onChange={setCode}
        error={shown["su-code"]}
      />
      <div className="actions">
        <button
          type="submit"
          disabled={forced === "loading"}
          aria-busy={forced === "loading"}
        >
          {forced === "loading" ? "Confirming" : "Confirm"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function S3({ st }: { st: string }) {
  const { go } = useProto();
  return (
    <Page title="Step-up re-authentication">
      <p>
        Shown as a dialog over the blocked action on every REQ-27 action when
        the last authentication is older than 5 minutes (tick the control in the
        prototype bar, or use a step-up-required state on any admin screen).
        Shown here as a page for review.
      </p>
      <div className="notice">
        <StepUpForm
          action="Example action (prototype)"
          forced={st}
          onSuccess={() => go("S-8")}
          onCancel={() => go("S-8")}
        />
      </div>
      <Hint>
        Wrong password or code 000000 gives VM-6. 111111 gives VM-5. Escape or
        Cancel leaves the action unperformed.
      </Hint>
    </Page>
  );
}

/* ---------- S-19 Set password via one-time link ---------- */
export const S19_STATES: StateDef[] = [
  { id: "empty-user", label: "Empty form (user link)" },
  { id: "empty-admin", label: "Empty form (admin link, with TOTP enrolment)" },
  { id: "loading", label: "Loading (link check / submit)" },
  { id: "error-link", label: "Error: link used or expired" },
  { id: "error-password", label: "Error: password rule (VM-41)" },
  { id: "error-breached", label: "Error: password rule (VM-42)" },
  { id: "error-mismatch", label: "Error: mismatch (VM-47)" },
  { id: "error-totp", label: "Error: TOTP code (VM-4)" },
  { id: "error-totp-replayed", label: "Error: TOTP replayed (VM-5)" },
  { id: "error-enrol-expired", label: "Error: enrolment expired (VM-52)" },
  { id: "success-user", label: "Success (user)" },
  { id: "success-admin", label: "Success (admin)" },
];

const BREACHED = ["password1234", "passwordpassword", "qwertyuiop12"];

function QrPlaceholder() {
  const cells: JSX.Element[] = [];
  for (let y = 0; y < 15; y++)
    for (let x = 0; x < 15; x++)
      if ((x * 7 + y * 13 + x * y) % 3 === 0)
        cells.push(
          <rect key={`${x}-${y}`} x={x * 8} y={y * 8} width="8" height="8" />,
        );
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      role="img"
      aria-label="QR code for authenticator setup. The same key is shown as text next to it."
    >
      <rect width="120" height="120" fill="#fff" />
      {cells}
    </svg>
  );
}

export function S19({ st }: { st: string }) {
  const { go } = useProto();
  const isAdmin =
    st === "empty-admin" ||
    st.includes("totp") ||
    st === "error-enrol-expired" ||
    st === "success-admin";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<null | "user" | "admin">(null);
  const [restarted, setRestarted] = useState(0);

  const forcedMap: Record<string, Record<string, string>> = {
    "error-password": { "new-password": VM.v41 },
    "error-breached": { "new-password": VM.v42 },
    "error-mismatch": { "confirm-password": VM.v47 },
    "error-totp": { "totp-code": VM.v4 },
    "error-totp-replayed": { "totp-code": VM.v5 },
    "error-enrol-expired": { "totp-code": VM.v52 },
  };
  const shown = Object.keys(errors).length ? errors : (forcedMap[st] ?? {});
  const finish =
    done ??
    (st === "success-user" ? "user" : st === "success-admin" ? "admin" : null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAttempt((a) => a + 1);
    const er: Record<string, string> = {};
    if (pw.length < 12) er["new-password"] = VM.v41;
    else if (BREACHED.includes(pw.toLowerCase())) er["new-password"] = VM.v42;
    else if (pw !== pw2) er["confirm-password"] = VM.v47;
    if (isAdmin) {
      if (!/^\d{6}$/.test(code)) er["totp-code"] = VM.v4a;
      else if (code === "000000") er["totp-code"] = VM.v4;
      else if (code === "111111") er["totp-code"] = VM.v5;
    }
    setErrors(er);
    if (Object.keys(er).length === 0) setDone(isAdmin ? "admin" : "user");
  };

  if (st === "loading")
    return (
      <Page title="Set your password">
        <Busy label="Checking your link" />
      </Page>
    );
  if (st === "error-link")
    return (
      <Page title="Set your password">
        <Notice kind="error">
          This link has expired or was already used. Ask an admin for a new one.
        </Notice>
      </Page>
    );
  if (finish)
    return (
      <Page title="Set your password">
        <Notice kind="success">
          {finish === "admin"
            ? "Password set and authenticator enrolled. Sign in."
            : "Password set. Sign in."}
          {finish === "user" ? " Other sessions of the account end." : ""}
        </Notice>
        <button type="button" onClick={() => go("S-1")}>
          Go to sign-in
        </button>
      </Page>
    );

  return (
    <Page title="Set your password">
      <p>
        The password must be at least 12 characters. Pasting and password
        managers are allowed.
      </p>
      <ErrorSummary
        errors={shown}
        attempt={attempt + (Object.keys(forcedMap).includes(st) ? 1 : 0)}
      />
      <form onSubmit={submit} noValidate key={restarted}>
        <Field
          id="new-password"
          label="New password"
          error={shown["new-password"]}
        >
          {(f) => (
            <input
              {...f}
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>
        <Field
          id="confirm-password"
          label="Confirm new password"
          error={shown["confirm-password"]}
        >
          {(f) => (
            <input
              {...f}
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>
        {isAdmin ? (
          <fieldset>
            <legend>Set up your authenticator</legend>
            <p>
              This setup page expires 10 minutes after it opens. If it expires,
              open your setup link again to restart.
            </p>
            <div className="row">
              <QrPlaceholder />
              <div>
                <div>Key (text alternative to the QR code):</div>
                <div className="mono">DEMO-KEY-0000-SYNTHETIC</div>
              </div>
            </div>
            <CodeField
              id="totp-code"
              value={code}
              onChange={setCode}
              error={shown["totp-code"]}
            />
            {st === "error-enrol-expired" ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setErrors({});
                  setRestarted((r) => r + 1);
                  go("S-19", "empty-admin");
                }}
              >
                Restart setup
              </button>
            ) : null}
          </fieldset>
        ) : null}
        <div className="actions">
          <button type="submit">Set password</button>
        </div>
      </form>
      <Hint>
        Password under 12 chars gives VM-41, "password1234" gives VM-42. Code
        000000 gives VM-4, 111111 gives VM-5. Use the state switcher for the
        used/expired link and the 10-minute expiry.{" "}
      </Hint>
    </Page>
  );
}
