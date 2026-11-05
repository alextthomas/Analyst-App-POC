import { beforeAll, describe, expect, it } from 'vitest';
import * as argon2 from 'argon2';
import { AuthService } from '../../src/auth/auth.service';
import type { PrismaService } from '../../src/prisma.service';

/**
 * AuthService unit tests with an in-memory Prisma double. No Nest DI: the class
 * is instantiated directly, which exercises the hashing and session logic.
 */

interface FakeAccount {
  id: string;
  username: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  passwordHash: string;
}

interface FakeSession {
  idHash: string;
  accountId: string;
  csrfToken: string;
  idleExpiresAt: Date;
}

function makePrisma(accounts: FakeAccount[]): PrismaService {
  const sessions = new Map<string, FakeSession>();
  return {
    account: {
      findUnique: async ({ where }: { where: { username?: string; id?: string } }) =>
        accounts.find((a) => (where.username ? a.username === where.username : a.id === where.id)) ?? null,
    },
    session: {
      create: async ({ data }: { data: FakeSession }) => {
        sessions.set(data.idHash, data);
        return data;
      },
      findUnique: async ({ where }: { where: { idHash: string } }) => {
        const s = sessions.get(where.idHash);
        if (!s) return null;
        const account = accounts.find((a) => a.id === s.accountId)!;
        return { ...s, account };
      },
      update: async ({ where, data }: { where: { idHash: string }; data: { idleExpiresAt: Date } }) => {
        const s = sessions.get(where.idHash)!;
        s.idleExpiresAt = data.idleExpiresAt;
        return s;
      },
      delete: async ({ where }: { where: { idHash: string } }) => {
        sessions.delete(where.idHash);
        return {};
      },
    },
    // expose for assertions
    _sessions: sessions,
  } as unknown as PrismaService;
}

let hash: string;
beforeAll(async () => {
  hash = await argon2.hash('correct horse battery');
});

describe('AuthService.verifyCredentials', () => {
  it('returns the account for valid credentials', async () => {
    const prisma = makePrisma([
      { id: 'a1', username: 'admin', role: 'admin', status: 'active', passwordHash: hash },
    ]);
    const svc = new AuthService(prisma);
    const account = await svc.verifyCredentials('admin', 'correct horse battery');
    expect(account?.id).toBe('a1');
  });

  it('returns null for a wrong password', async () => {
    const prisma = makePrisma([
      { id: 'a1', username: 'admin', role: 'admin', status: 'active', passwordHash: hash },
    ]);
    const svc = new AuthService(prisma);
    expect(await svc.verifyCredentials('admin', 'wrong')).toBeNull();
  });

  it('returns null for an unknown user', async () => {
    const svc = new AuthService(makePrisma([]));
    expect(await svc.verifyCredentials('nobody', 'x')).toBeNull();
  });

  it('returns null for a disabled account', async () => {
    const prisma = makePrisma([
      { id: 'a1', username: 'admin', role: 'admin', status: 'disabled', passwordHash: hash },
    ]);
    const svc = new AuthService(prisma);
    expect(await svc.verifyCredentials('admin', 'correct horse battery')).toBeNull();
  });
});

describe('AuthService session lifecycle', () => {
  it('creates a session and resolves it back to the account', async () => {
    const prisma = makePrisma([
      { id: 'a1', username: 'admin', role: 'admin', status: 'active', passwordHash: hash },
    ]);
    const svc = new AuthService(prisma);
    const { cookieValue, csrfToken } = await svc.createSession('a1');
    expect(cookieValue).toBeTruthy();
    expect(csrfToken).toBeTruthy();

    const session = await svc.resolveSession(cookieValue);
    expect(session?.accountId).toBe('a1');
    expect(session?.role).toBe('admin');
    expect(session?.csrfToken).toBe(csrfToken);
  });

  it('returns null for an unknown cookie', async () => {
    const svc = new AuthService(makePrisma([]));
    expect(await svc.resolveSession('nope')).toBeNull();
    expect(await svc.resolveSession(undefined)).toBeNull();
  });

  it('rejects and deletes an expired session', async () => {
    const prisma = makePrisma([
      { id: 'a1', username: 'admin', role: 'admin', status: 'active', passwordHash: hash },
    ]);
    const svc = new AuthService(prisma);
    const { cookieValue } = await svc.createSession('a1');
    // Force expiry in the store.
    const store = (prisma as unknown as { _sessions: Map<string, FakeSession> })._sessions;
    for (const s of store.values()) s.idleExpiresAt = new Date(Date.now() - 1000);
    expect(await svc.resolveSession(cookieValue)).toBeNull();
    expect(store.size).toBe(0);
  });

  it('destroys a session on demand', async () => {
    const prisma = makePrisma([
      { id: 'a1', username: 'admin', role: 'admin', status: 'active', passwordHash: hash },
    ]);
    const svc = new AuthService(prisma);
    const { cookieValue } = await svc.createSession('a1');
    await svc.destroySession(cookieValue);
    expect(await svc.resolveSession(cookieValue)).toBeNull();
  });
});
