import { useAuth } from './auth';
import { navigate, useRoute } from './router';
import { Busy } from './ui';
import { SignIn } from './screens/SignIn';
import { Applications } from './screens/Applications';
import { Overview } from './screens/Overview';
import { AdminTenants } from './screens/admin/Tenants';
import { AdminEntitlements } from './screens/admin/Entitlements';
import { IngestionHealth } from './screens/admin/IngestionHealth';
import { AdminCredentials } from './screens/admin/Credentials';

const USER_NAV = [
  { path: '/applications', label: 'Applications' },
  { path: '/overview', label: 'Overview' },
];

const ADMIN_NAV = [
  { path: '/admin/health', label: 'Ingestion health' },
  { path: '/admin/tenants', label: 'Tenants' },
  { path: '/admin/entitlements', label: 'Entitlements' },
  { path: '/admin/credentials', label: 'Producer credentials' },
];

export function App(): JSX.Element {
  const { session, loading, signOut } = useAuth();
  const route = useRoute();

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Busy label="Loading session" />
      </div>
    );
  }

  if (!session) return <SignIn />;

  const isAdmin = session.role === 'admin';

  return (
    <div id="app-root">
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header className="appbar">
        <strong>Event Analytics</strong>
        <nav aria-label="Main">
          <ul>
            {USER_NAV.map((n) => (
              <li key={n.path}>
                <a
                  href={`#${n.path}`}
                  aria-current={route.path === n.path ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(n.path);
                  }}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span>
          Signed in as {session.username} ({session.role})
        </span>
        <button type="button" className="secondary" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>

      <div className="layout">
        {isAdmin ? (
          <nav className="side" aria-label="Admin">
            <ul>
              {ADMIN_NAV.map((n) => (
                <li key={n.path}>
                  <a
                    href={`#${n.path}`}
                    aria-current={route.path === n.path ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(n.path);
                    }}
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <main id="main">
          <Screen path={route.path} isAdmin={isAdmin} />
        </main>
      </div>
    </div>
  );
}

function Screen({ path, isAdmin }: { path: string; isAdmin: boolean }): JSX.Element {
  // Admin-only routes: a non-admin is redirected to the application list.
  const adminRoutes = new Set(ADMIN_NAV.map((n) => n.path));
  if (adminRoutes.has(path) && !isAdmin) {
    return (
      <section>
        <h1 tabIndex={-1}>Not found</h1>
        <p>This page is not available for your account.</p>
      </section>
    );
  }

  switch (path) {
    case '/':
    case '/applications':
      return <Applications />;
    case '/overview':
      return <Overview />;
    case '/admin/health':
      return <IngestionHealth />;
    case '/admin/tenants':
      return <AdminTenants />;
    case '/admin/entitlements':
      return <AdminEntitlements />;
    case '/admin/credentials':
      return <AdminCredentials />;
    default:
      return (
        <section>
          <h1 tabIndex={-1}>Not found</h1>
          <p>No such page.</p>
        </section>
      );
  }
}
