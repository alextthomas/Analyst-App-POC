import { useEffect, useState } from 'react';
import type { TenantHealth } from '@ea/contracts';
import { api } from '../../api';
import { Busy, ErrorBox, fmt } from '../../ui';

/** S-8 Admin: Ingestion health (admin landing). Auto-refreshes every 30s. */
export function IngestionHealth(): JSX.Element {
  const [rows, setRows] = useState<TenantHealth[] | null>(null);
  const [error, setError] = useState(false);

  const load = (): void => {
    api
      .ingestionHealth()
      .then((r) => {
        setRows(r.tenants);
        setError(false);
      })
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section>
      <h1 tabIndex={-1}>Ingestion health</h1>
      <p>Per-tenant throughput and dead-letter counts. Refreshes every 30 seconds.</p>
      {error ? <ErrorBox text="The data could not be loaded. Try again." onRetry={load} /> : null}
      {!rows && !error ? <Busy /> : null}
      {rows ? (
        <table>
          <caption>Ingestion health by tenant</caption>
          <thead>
            <tr>
              <th scope="col">Tenant</th>
              <th scope="col">Throughput (events/min)</th>
              <th scope="col">Lag (s)</th>
              <th scope="col">Dead letters</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.tenantId}>
                <th scope="row">{h.tenantId}</th>
                <td>{fmt(h.throughputPerMinute)}</td>
                <td>{h.lagSeconds}</td>
                <td>{fmt(h.deadLetterCount)}</td>
                <td>{h.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
