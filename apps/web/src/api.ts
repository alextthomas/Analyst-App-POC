import type {
  AccountList,
  AllowedKeyList,
  ApplicationList,
  DeadLetterPage,
  EntitlementList,
  EventTypeList,
  IngestionHealth,
  Overview,
  Problem,
  ProducerCredentialIssued,
  ProducerCredentialList,
  SessionInfo,
  SignInResult,
  Tenant,
  TenantList,
} from '@ea/contracts';

/**
 * API base URL. VITE_API_BASE always wins (even when empty). Otherwise a
 * production build is same-origin (relative paths behind the reverse proxy) and
 * dev targets the local API.
 */
export function resolveApiBase(env: { VITE_API_BASE?: string; PROD: boolean }): string {
  if (env.VITE_API_BASE !== undefined) return env.VITE_API_BASE;
  return env.PROD ? '' : 'http://localhost:8080';
}

const BASE = resolveApiBase({ VITE_API_BASE: import.meta.env.VITE_API_BASE, PROD: import.meta.env.PROD });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem,
  ) {
    super(problem.title || `HTTP ${status}`);
  }
}

/** The CSRF token from the current session, required on unsafe methods. */
let csrfToken: string | null = null;
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (method !== 'GET' && method !== 'HEAD' && csrfToken) headers.set('X-CSRF-Token', csrfToken);

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const problem: Problem = data ?? {
      type: '',
      title: `HTTP ${res.status}`,
      status: res.status,
      code: 'unknown',
    };
    throw new ApiError(res.status, problem);
  }
  return data as T;
}

export const api = {
  // auth
  signIn: (username: string, password: string) =>
    request<SignInResult>('/api/v1/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getSession: () => request<SessionInfo>('/api/v1/auth/session'),
  signOut: () => request<void>('/api/v1/auth/sign-out', { method: 'POST' }),

  // dashboard
  listTenants: () => request<ApplicationList>('/api/v1/tenants'),
  eventTypes: (tenantId: string) =>
    request<EventTypeList>(`/api/v1/tenants/${encodeURIComponent(tenantId)}/event-types`),
  overview: (tenantId: string, params: { from: string; to: string; eventType?: string; compare?: boolean }) => {
    const q = new URLSearchParams({ from: params.from, to: params.to });
    if (params.eventType) q.set('eventType', params.eventType);
    if (params.compare) q.set('compare', 'true');
    return request<Overview>(`/api/v1/tenants/${encodeURIComponent(tenantId)}/overview?${q.toString()}`);
  },

  // admin
  adminTenants: () => request<TenantList>('/api/v1/admin/tenants'),
  adminCreateTenant: (body: { tenantId: string; departmentOwner: string; privacyNoticeUrl: string }) =>
    request<Tenant>('/api/v1/admin/tenants', { method: 'POST', body: JSON.stringify(body) }),
  adminAccounts: () => request<AccountList>('/api/v1/admin/accounts'),
  adminEntitlements: (accountId: string) =>
    request<EntitlementList>(`/api/v1/admin/accounts/${encodeURIComponent(accountId)}/entitlements`),
  adminGrant: (accountId: string, tenantId: string) =>
    request<void>(
      `/api/v1/admin/accounts/${encodeURIComponent(accountId)}/entitlements/${encodeURIComponent(tenantId)}`,
      { method: 'POST' },
    ),
  adminRevoke: (accountId: string, tenantId: string) =>
    request<void>(
      `/api/v1/admin/accounts/${encodeURIComponent(accountId)}/entitlements/${encodeURIComponent(tenantId)}`,
      { method: 'DELETE' },
    ),
  adminCredentials: () => request<ProducerCredentialList>('/api/v1/admin/producer-credentials'),
  adminCreateCredential: (tenantId: string) =>
    request<ProducerCredentialIssued>('/api/v1/admin/producer-credentials', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    }),
  adminAllowedKeys: (tenantId: string) =>
    request<AllowedKeyList>(`/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/allowed-keys`),
  ingestionHealth: () => request<IngestionHealth>('/api/v1/admin/ingestion-health'),
  deadLetters: (tenantId: string, page = 1) =>
    request<DeadLetterPage>(`/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/dead-letters?page=${page}`),
};
