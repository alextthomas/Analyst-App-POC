import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { API_BASE, apiReachable } from './helpers';

/**
 * HTTP integration tests against the running dev API (npm run dev:api).
 * They assume the seed data: admin/admin12345 (both tenants) and
 * analyst/analyst12345 (web-portal only). If the API is not reachable the
 * suite is skipped with a clear message rather than failing the run.
 */

let apiUp = false;
const agent = request(API_BASE);

/** Sign in and return the session cookie + CSRF token. */
async function signIn(username: string, password: string): Promise<{ cookie: string[]; csrf: string }> {
  const res = await agent.post('/api/v1/auth/sign-in').send({ username, password });
  expect(res.status).toBe(201);
  const cookie = res.headers['set-cookie'] as unknown as string[];
  return { cookie, csrf: res.body.session.csrfToken as string };
}

beforeAll(async () => {
  apiUp = await apiReachable();
});

describe.runIf(process.env.SKIP_API !== '1')('API HTTP (integration)', () => {
  it('serves health probes without auth', async () => {
    if (!apiUp) return expect.unreachable('API not reachable; start it with npm run dev:api');
    const res = await agent.get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects an unauthenticated dashboard request', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const res = await agent.get('/api/v1/tenants');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('unauthenticated');
  });

  it('rejects bad credentials with a generic failure', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const res = await agent.post('/api/v1/auth/sign-in').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('sign-in-failed');
  });

  it('signs in admin and lists both entitled tenants', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const { cookie } = await signIn('admin', 'admin12345');
    const res = await agent.get('/api/v1/tenants').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const ids = (res.body.items as { tenantId: string }[]).map((t) => t.tenantId).sort();
    expect(ids).toEqual(['mobile-app', 'web-portal']);
  });

  it('scopes a user to only its entitled tenants', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const { cookie } = await signIn('analyst', 'analyst12345');
    const res = await agent.get('/api/v1/tenants').set('Cookie', cookie);
    const ids = (res.body.items as { tenantId: string }[]).map((t) => t.tenantId);
    expect(ids).toEqual(['web-portal']);
  });

  it('returns 404 (not 403) for a tenant the user is not entitled to', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const { cookie } = await signIn('analyst', 'analyst12345');
    const res = await agent
      .get('/api/v1/tenants/mobile-app/overview?from=2026-01-01&to=2026-01-07')
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not-found');
  });

  it('returns 403 when a user hits an admin route', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const { cookie } = await signIn('analyst', 'analyst12345');
    const res = await agent.get('/api/v1/admin/tenants').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('forbidden');
  });

  it('rejects an unsafe method without a CSRF token', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const { cookie } = await signIn('admin', 'admin12345');
    // No X-CSRF-Token header.
    const res = await agent
      .post('/api/v1/admin/tenants')
      .set('Cookie', cookie)
      .send({ tenantId: 'csrf-test', departmentOwner: 'x', privacyNoticeUrl: 'https://example.com/p' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('csrf-invalid');
  });

  it('validates the overview date range (from after to => 400)', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const { cookie } = await signIn('admin', 'admin12345');
    const res = await agent
      .get('/api/v1/tenants/web-portal/overview?from=2026-03-10&to=2026-03-01')
      .set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation-error');
  });

  it('returns an aggregate-only overview with the expected shape', async () => {
    if (!apiUp) return expect.unreachable('API not reachable');
    const { cookie } = await signIn('admin', 'admin12345');
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const res = await agent
      .get(`/api/v1/tenants/web-portal/overview?from=${from}&to=${to}&compare=true`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totals');
    expect(res.body).toHaveProperty('series');
    expect(res.body).toHaveProperty('breakdowns.country');
    expect(Array.isArray(res.body.topEventTypes)).toBe(true);
    // Response must never carry raw/pseudonymous user ids.
    expect(JSON.stringify(res.body)).not.toContain('subjectId');
  });
});
