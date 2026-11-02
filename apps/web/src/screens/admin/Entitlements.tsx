import { useEffect, useState } from 'react';
import type { Account, Entitlement, Tenant } from '@ea/contracts';
import { api, ApiError } from '../../api';
import { Busy, ErrorBox } from '../../ui';

/** S-7 Admin: User entitlements. Grant/revoke tenant access per account. */
export function AdminEntitlements(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [accountId, setAccountId] = useState('');
  const [entitlements, setEntitlements] = useState<Entitlement[] | null>(null);
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.adminAccounts(), api.adminTenants()])
      .then(([a, t]) => {
        setAccounts(a.items);
        setTenants(t.items);
        if (a.items.length > 0) setAccountId(a.items[0]!.accountId);
      })
      .catch(() => setError(true));
  }, []);

  const loadEntitlements = (id: string): void => {
    if (!id) return;
    setEntitlements(null);
    api.adminEntitlements(id).then((r) => setEntitlements(r.items)).catch(() => setError(true));
  };
  useEffect(() => loadEntitlements(accountId), [accountId]);

  const granted = new Set((entitlements ?? []).map((e) => e.tenantId));

  const toggle = async (tenantId: string, has: boolean): Promise<void> => {
    setMsg(null);
    try {
      if (has) await api.adminRevoke(accountId, tenantId);
      else await api.adminGrant(accountId, tenantId);
      setMsg(`Access ${has ? 'revoked' : 'granted'}. Effective for new queries within 60 seconds.`);
      loadEntitlements(accountId);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.problem.title : 'Could not update entitlement.');
    }
  };

  if (error) return <ErrorBox text="The data could not be loaded." onRetry={() => window.location.reload()} />;

  return (
    <section>
      <h1 tabIndex={-1}>User entitlements</h1>
      <div className="field">
        <label htmlFor="acct">Account</label>
        <select id="acct" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.accountId} value={a.accountId}>
              {a.username} ({a.role})
            </option>
          ))}
        </select>
      </div>

      {msg ? <div className="notice success">{msg}</div> : null}

      {!entitlements ? (
        <Busy />
      ) : (
        <table>
          <caption>Tenant access for the selected account</caption>
          <thead>
            <tr>
              <th scope="col">Tenant</th>
              <th scope="col">Access</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const has = granted.has(t.tenantId);
              return (
                <tr key={t.tenantId}>
                  <th scope="row">{t.tenantId}</th>
                  <td>{has ? 'Granted' : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={has ? 'danger' : undefined}
                      onClick={() => void toggle(t.tenantId, has)}
                    >
                      {has ? 'Revoke' : 'Grant'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
