import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useProto } from "./ctx";
import { GENERIC_READ, GENERIC_WRITE, PENDING } from "./messages";

export interface StateDef {
  id: string;
  label: string;
}

export function Page({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
    document.title = `${title} - Event Analytics (prototype)`;
  }, [title]);
  return (
    <section>
      <h1 ref={ref} tabIndex={-1}>
        {title}
      </h1>
      {children}
    </section>
  );
}

export function Busy({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="busy">
      <span className="spinner" aria-hidden="true" /> {label}
    </div>
  );
}

export function ErrorBox({
  readOnly = false,
  text,
}: {
  readOnly?: boolean;
  text?: string;
}) {
  const { go, screen } = useProto();
  return (
    <div role="alert" className="notice error">
      <p>{text ?? (readOnly ? GENERIC_READ : GENERIC_WRITE)}</p>
      <button type="button" onClick={() => go(screen)}>
        Retry
      </button>
    </div>
  );
}

export function Pending() {
  return (
    <div role="note" className="notice pending">
      <strong>Pending design.</strong> {PENDING}
    </div>
  );
}

export function Notice({
  kind = "info",
  children,
}: {
  kind?: "info" | "success" | "warn" | "error";
  children: ReactNode;
}) {
  return <div className={`notice ${kind}`}>{children}</div>;
}

/** Always-mounted polite live region so announcements are reliable. */
export function Live({ children }: { children?: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      {children}
    </div>
  );
}

/** Loading / error gate used by every data view (C-6). */
export function Gate({
  st,
  readOnly,
  children,
}: {
  st: string;
  readOnly?: boolean;
  children: ReactNode;
}) {
  if (st === "loading") return <Busy />;
  if (st === "error") return <ErrorBox readOnly={readOnly} />;
  return <>{children}</>;
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <details className="protohint">
      <summary>Prototype hints (not part of the product)</summary>
      <div>{children}</div>
    </details>
  );
}

export type FieldProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (p: FieldProps) => ReactNode;
}) {
  const hid = hint ? `${id}-hint` : undefined;
  const eid = error ? `${id}-err` : undefined;
  const describedBy = [hid, eid].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required ? " (required)" : ""}
      </label>
      {hint ? (
        <div id={hid} className="hint">
          {hint}
        </div>
      ) : null}
      {error ? (
        <div id={eid} className="field-error">
          <span className="sr-only">Error: </span>
          {error}
        </div>
      ) : null}
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
    </div>
  );
}

export function ErrorSummary({
  errors,
  attempt,
}: {
  errors: Record<string, string>;
  attempt: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const keys = Object.keys(errors);
  useEffect(() => {
    if (keys.length > 0) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  if (keys.length === 0) return null;
  return (
    <div ref={ref} tabIndex={-1} className="notice error summary" role="alert">
      <h2>There is a problem</h2>
      <ul>
        {keys.map((k) => (
          <li key={k}>
            <a
              href={`#${k}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(k)?.focus();
              }}
            >
              {errors[k]}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Dialog({
  title,
  onClose,
  children,
  role = "dialog",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const root = document.getElementById("app-root");
    root?.setAttribute("inert", "");
    const target =
      ref.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      ref.current;
    target?.focus();
    return () => {
      root?.removeAttribute("inert");
      if (prev && document.contains(prev)) prev.focus();
    };
  }, []);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const f = Array.from(
      ref.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]),input:not([disabled]),select,textarea,a[href]",
      ),
    );
    const first = f[0];
    const last = f[f.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return createPortal(
    <div className="overlay">
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby="dlg-title"
        tabIndex={-1}
        className="dialog"
        onKeyDown={onKey}
      >
        <h2 id="dlg-title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function CopyBox({
  label,
  value,
  onCopied,
}: {
  label: string;
  value: string;
  onCopied: () => void;
}) {
  return (
    <div className="copybox">
      <div className="mono" tabIndex={0} aria-label={label}>
        {value}
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).catch(() => undefined);
          onCopied();
        }}
      >
        Copy {label.toLowerCase()}
      </button>
    </div>
  );
}

export function StoreOutcome({ failed }: { failed: string[] }) {
  return (
    <table>
      <caption>Erasure outcome per store</caption>
      <thead>
        <tr>
          <th scope="col">Store</th>
          <th scope="col">Outcome</th>
        </tr>
      </thead>
      <tbody>
        {[
          "Event store",
          "Aggregates",
          "Dead-letter store",
          "Messaging layer",
          "Deduplication state",
          "Exports",
        ].map((s) => (
          <tr key={s}>
            <th scope="row">{s}</th>
            <td>{failed.includes(s) ? "Failed" : "Completed"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const fmt = (n: number): string => n.toLocaleString("en-US");
