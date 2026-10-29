import { useCallback, useEffect, useRef, useState } from "react";
import { ProtoCtx, type GuardOpts, type Proto, type Role } from "./ctx";
import { IDLE_WARNING, SESSION_ENDED } from "./messages";
import { SCREENS, defaultState, screenDef } from "./registry";
import { StepUpForm } from "./screens/auth";
import { S18 } from "./screens/dash";
import { Dialog } from "./ui";

type Modal =
  | { kind: "step"; action: string; run: () => void }
  | { kind: "confirm"; text: string; run: () => void }
  | { kind: "idle" }
  | null;

const ADMIN_NAV = [
  "S-8",
  "S-6",
  "S-7",
  "S-9",
  "S-10",
  "S-11",
  "S-12",
  "S-13",
  "S-14",
  "S-15",
  "S-16",
  "S-17",
];
const NAV_LABEL: Record<string, string> = {
  "S-4": "Applications",
  "S-5": "Overview",
  "S-6": "Tenants",
  "S-7": "Entitlements",
  "S-8": "Ingestion health",
  "S-9": "Dead letters",
  "S-10": "Data-subject requests",
  "S-11": "Objection",
  "S-12": "Restriction",
  "S-13": "Retention",
  "S-14": "Allow-listed keys",
  "S-15": "Accounts",
  "S-16": "Producer credentials",
  "S-17": "Audit log",
};

export function App() {
  const [role, setRole] = useState<Role>("user");
  const [screen, setScreen] = useState("S-1");
  const [st, setSt] = useState(defaultState("S-1"));
  const [app, setApp] = useState("tenant-alpha");
  const [modal, setModal] = useState<Modal>(null);
  const [stale, setStale] = useState(false);
  const [fresh, setFresh] = useState(false);
  const leave = useRef<string | null>(null);

  const needStep = (stale || st === "step-up-required") && !fresh;
  const needRef = useRef(needStep);
  needRef.current = needStep;
  useEffect(() => setFresh(false), [screen, st]);

  const go = useCallback((s: string, next?: string) => {
    const run = () => {
      leave.current = null;
      setScreen(s);
      setSt(next ?? defaultState(s));
    };
    if (leave.current) setModal({ kind: "confirm", text: leave.current, run });
    else run();
  }, []);

  const guard = useCallback((o: GuardOpts, run: () => void) => {
    const afterStep = () => {
      if (o.confirm) setModal({ kind: "confirm", text: o.confirm, run });
      else run();
    };
    if (o.stepUp && needRef.current)
      setModal({ kind: "step", action: o.stepUp, run: afterStep });
    else afterStep();
  }, []);
  const confirm = useCallback(
    (text: string, run: () => void) => setModal({ kind: "confirm", text, run }),
    [],
  );
  const setLeaveGuard = useCallback((t: string | null) => {
    leave.current = t;
  }, []);

  const ctx: Proto = {
    role,
    setRole,
    screen,
    st,
    setSt,
    app,
    setApp,
    go,
    guard,
    confirm,
    setLeaveGuard,
  };
  const def = screenDef(screen);
  const refused = !!def.admin && role === "user";
  const denied = refused || st === "permission-denied";
  const authed = !def.pre;

  const switchRole = (r: Role) => {
    setRole(r);
    go(r === "admin" ? "S-8" : "S-4");
  };

  return (
    <ProtoCtx.Provider value={ctx}>
      <div id="app-root">
        <a className="skip" href="#main">
          Skip to main content
        </a>
        <div className="protobar" role="region" aria-label="Prototype controls">
          <span className="tag">PROTOTYPE (mock data, not the product)</span>
          <label>
            Role
            <select
              value={role}
              onChange={(e) => switchRole(e.target.value as Role)}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label>
            Screen
            <select value={screen} onChange={(e) => go(e.target.value)}>
              {SCREENS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} {s.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Screen state
            <select value={st} onChange={(e) => setSt(e.target.value)}>
              {def.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={stale}
              onChange={(e) => {
                setStale(e.target.checked);
                if (e.target.checked) setFresh(false);
              }}
            />
            Last authentication older than 5 minutes (forces step-up S-3)
          </label>
          <button type="button" onClick={() => setModal({ kind: "idle" })}>
            Show idle warning
          </button>
          <button type="button" onClick={() => go("S-1", "session-ended")}>
            End session
          </button>
        </div>

        {authed ? (
          <header className="appbar">
            <strong>Event Analytics</strong>
            <nav aria-label="Main">
              <ul>
                {["S-4", "S-5"].map((s) => (
                  <li key={s}>
                    <a
                      href="#nav"
                      aria-current={screen === s ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        go(s);
                      }}
                    >
                      {NAV_LABEL[s]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <span>
              Signed in as {role === "admin" ? "admin-0001" : "user-0001"} (
              {role})
            </span>
            <button
              type="button"
              className="secondary"
              onClick={() => go("S-1", "empty")}
            >
              Sign out
            </button>
          </header>
        ) : null}

        <div className="layout">
          {authed && role === "admin" ? (
            <nav className="side" aria-label="Admin">
              <ul>
                {ADMIN_NAV.map((s) => (
                  <li key={s}>
                    <a
                      href="#nav"
                      aria-current={screen === s ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        go(s);
                      }}
                    >
                      {NAV_LABEL[s]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <main id="main">
            {refused ? (
              <div className="notice">
                Prototype: role "user" opened an admin screen, so S-18 is shown
                and an audit entry is written (AC-9.3). Switch the role to admin
                to see {def.id}.
              </div>
            ) : null}
            {st === "session-ended" && screen !== "S-1" && screen !== "S-5" ? (
              <div className="notice warn">{SESSION_ENDED}</div>
            ) : null}
            {denied ? <S18 /> : def.render(st)}
          </main>
        </div>

        {modal?.kind === "step" ? (
          <Dialog title="Confirm it is you" onClose={() => setModal(null)}>
            <StepUpForm
              action={modal.action}
              onCancel={() => setModal(null)}
              onSuccess={() => {
                const run = modal.run;
                setFresh(true);
                setStale(false);
                setModal(null);
                run();
              }}
            />
          </Dialog>
        ) : null}
        {modal?.kind === "confirm" ? (
          <Dialog
            title="Please confirm"
            onClose={() => setModal(null)}
            role="alertdialog"
          >
            <p>{modal.text}</p>
            <div className="actions">
              <button
                type="button"
                className="danger"
                onClick={() => {
                  const r = modal.run;
                  setModal(null);
                  r();
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                className="secondary"
                data-autofocus
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
            </div>
          </Dialog>
        ) : null}
        {modal?.kind === "idle" ? (
          <Dialog
            title="Session ending soon"
            onClose={() => setModal(null)}
            role="alertdialog"
          >
            <p>{IDLE_WARNING}</p>
            <div className="actions">
              <button
                type="button"
                data-autofocus
                onClick={() => setModal(null)}
              >
                Stay signed in
              </button>
            </div>
          </Dialog>
        ) : null}
      </div>
    </ProtoCtx.Provider>
  );
}
