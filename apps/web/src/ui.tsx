import type { ReactNode } from 'react';
import type { MetricCell } from '@ea/contracts';

export const fmt = (n: number): string => n.toLocaleString('en-US');

export function Busy({ label = 'Loading' }: { label?: string }): JSX.Element {
  return (
    <div role="status" aria-busy="true" className="busy">
      <span className="spinner" aria-hidden="true" /> {label}
    </div>
  );
}

export function Notice({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'success' | 'warn' | 'error';
  children: ReactNode;
}): JSX.Element {
  return <div className={`notice ${kind}`}>{children}</div>;
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }): JSX.Element {
  return (
    <div role="alert" className="notice error">
      <p>{text}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

/** Renders a metric cell, showing the suppression marker when below k. */
export function Cell({ cell }: { cell: MetricCell }): JSX.Element {
  if (cell.suppressed) {
    return (
      <span className="supp" title="Suppressed: fewer than 5 users (privacy)">
        &mdash;
      </span>
    );
  }
  return <>{fmt(cell.events)}</>;
}

export function cellUsers(cell: MetricCell): string {
  return cell.suppressed ? '—' : fmt(cell.uniqueUsers);
}
