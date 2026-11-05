import { useEffect, useState } from 'react';
import type { ProducerCredential, Tenant } from '@ea/contracts';
import { api, ApiError } from '../../api';
import { Busy, ErrorBox, Notice } from '../../ui';

/** S-16 Admin: Producer credentials. Create (secret shown once) and list. */
export function AdminCredentials(): JSX.Element {
  const [items, setItems] = useState<ProducerCredential[] | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState(false);
  const [issuedSecret, setIssuedSecret] = useState<{ credentialId: string; secret: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (): void => {
    setError(false);
    api.adminCredentials().then((r) => setItems(r.items)).catch(() => setError(true));
  };
  useEffect(() => {
    load();
    api.adminTenants().then((r) => {
      setTenants(r.items);
      if (r.items.length > 0) setTenantId(r.items[0]!.tenantId);
    });
  }, []);

  const onCreate = async (): Promise<void> => {
    if (!tenantId) return;
    setFormError(null);
    setBusy(true);
    try {
      const issued = await api.adminCreateCredential(tenantId);
      setIssuedSecret({ credentialId: issued.credentialId, secret: issued.secret });
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.problem.title : 'Could not create credential.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1 tabIndex={-1}>Producer credentials</h1>
      <p>Credentials let a producer application publish events for a tenant over NATS.</p>

      <div className="row">
        <div className="field">
          <label htmlFor="credTenant">Tenant</label>
          <select id="credTenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            {tenants.map((t) => (
              <option key={t.tenantId} value={t.tenantId}>
                {t.tenantId}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ alignSelf: 'end' }}>
          <button type="button" onClick={onCreate} disabled={busy || !tenantId}>
            {busy ? 'Creating…' : 'Create credential'}
          </button>
        </div>
      </div>
      {formError ? (
        <div role="alert" className="notice error">
          <p>{formError}</p>
        </div>
      ) : null}

      {issuedSecret ? (
        <Notice kind="success">
          <p>
            <strong>Secret shown once.</strong> Copy it now; it cannot be retrieved again.
          </p>
          <p>Credential id: <code>{issuedSecret.credentialId}</code></p>
          <div className="mono">{issuedSecret.secret}</div>
          <div className="actions">
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(issuedSecret.secret).catch(() => undefined)}
            >
              Copy secret
            </button>
            <button type="button" className="secondary" onClick={() => setIssuedSecret(null)}>
              Done
            </button>
          </div>
        </Notice>
      ) : null}

      {error ? <ErrorBox text="The data could not be loaded. Try again." onRetry={load} /> : null}
      {!items && !error ? <Busy /> : null}
      {items ? (
        <table>
          <caption>Producer credentials</caption>
          <thead>
            <tr>
              <th scope="col">Credential id</th>
              <th scope="col">Tenant</th>
              <th scope="col">Status</th>
              <th scope="col">Created (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.credentialId}>
                <th scope="row"><code>{c.credentialId}</code></th>
                <td>{c.tenantId}</td>
                <td>{c.status}</td>
                <td>{c.createdAt.replace('T', ' ').slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
