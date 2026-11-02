import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma.service';
import { config } from '../config';

export interface AuthedSession {
  idHash: string;
  accountId: string;
  username: string;
  role: 'user' | 'admin';
  csrfToken: string;
  idleExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Verify username/password. Returns the account or null (generic failure). */
  async verifyCredentials(username: string, password: string) {
    const account = await this.prisma.account.findUnique({ where: { username } });
    if (!account || account.status !== 'active') return null;
    const ok = await argon2.verify(account.passwordHash, password).catch(() => false);
    if (!ok) return null;
    return account;
  }

  /** Create a server-side session and return the opaque cookie value + csrf token. */
  async createSession(accountId: string): Promise<{ cookieValue: string; csrfToken: string; idleExpiresAt: Date }> {
    const cookieValue = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const idleExpiresAt = new Date(Date.now() + config.sessionIdleMinutes * 60_000);
    await this.prisma.session.create({
      data: {
        idHash: this.hashToken(cookieValue),
        accountId,
        csrfToken,
        idleExpiresAt,
      },
    });
    return { cookieValue, csrfToken, idleExpiresAt };
  }

  /** Resolve a cookie value to a live session, sliding the idle timer. Null if invalid/expired. */
  async resolveSession(cookieValue: string | undefined): Promise<AuthedSession | null> {
    if (!cookieValue) return null;
    const idHash = this.hashToken(cookieValue);
    const session = await this.prisma.session.findUnique({
      where: { idHash },
      include: { account: true },
    });
    if (!session) return null;
    if (session.idleExpiresAt.getTime() < Date.now() || session.account.status !== 'active') {
      await this.prisma.session.delete({ where: { idHash } }).catch(() => undefined);
      return null;
    }
    // Slide the idle timer (keep-alive on activity).
    const idleExpiresAt = new Date(Date.now() + config.sessionIdleMinutes * 60_000);
    await this.prisma.session.update({ where: { idHash }, data: { idleExpiresAt } });
    return {
      idHash,
      accountId: session.accountId,
      username: session.account.username,
      role: session.account.role,
      csrfToken: session.csrfToken,
      idleExpiresAt,
    };
  }

  async destroySession(cookieValue: string | undefined): Promise<void> {
    if (!cookieValue) return;
    await this.prisma.session
      .delete({ where: { idHash: this.hashToken(cookieValue) } })
      .catch(() => undefined);
  }
}
