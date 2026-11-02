import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, type AuthedSession } from './auth.service';
import { config } from '../config';

/** Mark a route (or controller) as public - no session required. */
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/** Require role 'admin' on a route (or controller). */
export const ADMIN_KEY = 'requireAdmin';
export const RequireAdmin = () => SetMetadata(ADMIN_KEY, true);

export interface RequestWithSession extends Request {
  session?: AuthedSession;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<RequestWithSession>();
    const cookieValue = req.cookies?.[config.sessionCookieName] as string | undefined;
    const session = await this.auth.resolveSession(cookieValue);
    if (session) req.session = session;

    if (isPublic) return true;

    if (!session) throw new UnauthorizedException({ code: 'unauthenticated', title: 'No valid session' });

    // CSRF: unsafe methods require a matching synchroniser token.
    if (UNSAFE_METHODS.has(req.method)) {
      const header = req.header('X-CSRF-Token');
      if (!header || header !== session.csrfToken) {
        throw new ForbiddenException({ code: 'csrf-invalid', title: 'CSRF token missing or invalid' });
      }
    }

    const requireAdmin = this.reflector.getAllAndOverride<boolean>(ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requireAdmin && session.role !== 'admin') {
      // A 'user' hitting an admin route gets 403 (audited in the full design).
      throw new ForbiddenException({ code: 'forbidden', title: 'Admin role required' });
    }

    return true;
  }
}
