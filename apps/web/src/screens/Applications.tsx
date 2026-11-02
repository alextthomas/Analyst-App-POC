import { useEffect, useState } from 'react';
import type { ApplicationSummary } from '@ea/contracts';
import { api } from '../api';
import { navigate } from '../router';
import { Busy, ErrorBox, Notice } from '../ui';

/** S-4 Application list: the tenants the signed-in account is entitled to. */
export function Applications(): JSX.Element {
  const [items, setItems] = useState<ApplicationSummary[] | null>(null);
  const [error, setError] = useState(false);

  const load = (): void => {
    setError(false);
    setItems(null);
    api
      .listTenants()
      .then((r) => setItems(r.items))
      .catch(() => setError(true));
  };
  useEffect(load, []);

  if (error) return <ErrorBox text="The data could not be loaded. Try again." onRetry={load} />;
  if (!items) return <Busy />;

  return (
    <section>
      <h1 tabIndex={-1}>Applications</h1>
      {items.length === 0 ? (
        <Notice>You are not entitled to any applications yet. Ask an admin to grant access.</Notice>
      ) : (
        <table>
          <caption>Applications you can view</caption>
          <thead>
            <tr>
              <th scope="col">Application</th>
              <th scope="col">Department owner</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.tenantId}>
                <th scope="row">{t.tenantId}</th>
                <td>{t.departmentOwner}</td>
                <td>
                  <button type="button" onClick={() => navigate('/overview', { tenant: t.tenantId })}>
                    View overview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
