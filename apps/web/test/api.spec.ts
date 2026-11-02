import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setCsrfToken } from '../src/api';

/** Capture fetch calls and return a canned response. */
function mockFetch(response: { status: number; body?: unknown }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const text = response.body === undefined ? '' : JSON.stringify(response.body);
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      text: async () => text,
    } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn };
}

afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken(null);
});

describe('api client', () => {
  beforeEach(() => setCsrfToken(null));

  it('sends GET requests with credentials and no CSRF header', async () => {
    const { calls } = mockFetch({ status: 200, body: { items: [] } });
    await api.listTenants();
    expect(calls).toHaveLength(1);
    const init = calls[0]!.init;
    expect(init.credentials).toBe('include');
    const headers = new Headers(init.headers);
    expect(headers.has('X-CSRF-Token')).toBe(false);
    expect(calls[0]!.url).toContain('/api/v1/tenants');
  });

  it('adds the X-CSRF-Token header on unsafe methods once a token is set', async () => {
    setCsrfToken('tok-123');
    const { calls } = mockFetch({ status: 201, body: { next: 'done', session: {} } });
    await api.signIn('admin', 'pw');
    const init = calls[0]!.init;
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('X-CSRF-Token')).toBe('tok-123');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not add a CSRF header on POST when no token is set', async () => {
    const { calls } = mockFetch({ status: 201, body: {} });
    await api.signIn('admin', 'pw');
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.has('X-CSRF-Token')).toBe(false);
  });

  it('throws ApiError carrying the problem body on a non-ok response', async () => {
    mockFetch({ status: 404, body: { code: 'not-found', title: 'Not found', status: 404, type: '' } });
    await expect(api.overview('web-portal', { from: '2026-01-01', to: '2026-01-02' })).rejects.toBeInstanceOf(ApiError);
    try {
      await api.overview('web-portal', { from: '2026-01-01', to: '2026-01-02' });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      if (err instanceof ApiError) {
        expect(err.status).toBe(404);
        expect(err.problem.code).toBe('not-found');
      }
    }
  });

  it('builds the overview query string with compare and eventType', async () => {
    const { calls } = mockFetch({ status: 200, body: {} });
    await api.overview('web-portal', { from: '2026-01-01', to: '2026-01-07', eventType: 'page_view', compare: true });
    const url = calls[0]!.url;
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-01-07');
    expect(url).toContain('eventType=page_view');
    expect(url).toContain('compare=true');
  });

  it('returns undefined for a 204 response', async () => {
    mockFetch({ status: 204 });
    await expect(api.signOut()).resolves.toBeUndefined();
  });
});
