import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestWithSession } from './auth.guard';
import type { AuthedSession } from './auth.service';

/** Injects the resolved session (guaranteed present on guarded routes). */
export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedSession => {
    const req = ctx.switchToHttp().getRequest<RequestWithSession>();
    if (!req.session) {
      // Should never happen on a guarded route.
      throw new Error('No session on request');
    }
    return req.session;
  },
);
