import { useEffect, useState, type FormEvent } from 'react';
import type { Tenant } from '@ea/contracts';
import { api, ApiError } from '../../api';
import { Busy, ErrorBox } from '../../ui';

/** S-6 Admin: Tenants. List and create applications (tenants). */
export function AdminTenants(): JSX.Element {
  const [items, setItems] = useState<Tenant[] | null>(null);
  const [error, setError] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [owner, setOwner] = useState('');
  const [url, setUrl] = useState('https://example.com/privacy/');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (): void => {
    setError(false);
    setItems(null);
    api.adminTenants().then((r) => setItems(r.items)).catch(() => setError(true));
  };
  useEffect(load, []);

  const onCreate = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      await api.adminCreateTenant({ tenantId, departmentOwner: owner, privacyNoticeUrl: url });
      setTenantId('');
      setOwner('');
      setUrl('https://example.com/privacy/');
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.problem.title : 'Could not create tenant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1 tabIndex={-1}>Tenants</h1>

      <form onSubmit={onCreate} noValidate>
        <h2>Create a tenant</h2>
        {formError ? (
          <div role="alert" className="notice error">
            <p>{formError}</p>
          </div>
        ) : null}
        <div className="row">
          <div className="field">
            <label htmlFor="tid">Tenant id</label>
            <input id="tid" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="my-app" />
            <div className="hint">3-40 chars: lowercase letters, digits, hyphens.</div>
          </div>
          <div className="field">
            <label htmlFor="owner">Department owner</label>
            <input id="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="url">Privacy notice URL</label>
            <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="field" style={{ alignSelf: 'end' }}>
            <button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </form>

      {error ? <ErrorBox text="The data could not be loaded. Try again." onRetry={load} /> : null}
      {!items && !error ? <Busy /> : null}
      {items ? (
        <table>
          <caption>All tenants</caption>
          <thead>
            <tr>
              <th scope="col">Tenant</th>
              <th scope="col">Owner</th>
              <th scope="col">Privacy notice</th>
              <th scope="col">Retention (days)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.tenantId}>
                <th scope="row">{t.tenantId}</th>
                <td>{t.departmentOwner}</td>
                <td>
                  <a href={t.privacyNoticeUrl} target="_blank" rel="noreferrer">
                    {t.privacyNoticeUrl}
                  </a>
                </td>
                <td>{t.retentionDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
