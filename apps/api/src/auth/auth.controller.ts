import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import type { SessionInfo, SignInResult } from '@ea/contracts';
import { AuthService } from './auth.service';
import { CurrentSession } from './current-session.decorator';
import { Public } from './auth.guard';
import type { AuthedSession } from './auth.service';
import { config } from '../config';
import { clearSessionCookie, setSessionCookie } from './session-cookie';

class SignInDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('sign-in')
  async signIn(@Body() dto: SignInDto, @Res({ passthrough: true }) res: Response): Promise<SignInResult> {
    const account = await this.auth.verifyCredentials(dto.username, dto.password);
    if (!account) {
      // Generic failure; does not reveal whether the user exists or is locked.
      throw new UnauthorizedException({ code: 'sign-in-failed', title: 'Sign-in failed' });
    }
    const { cookieValue, csrfToken, idleExpiresAt } = await this.auth.createSession(account.id);
    setSessionCookie(res, cookieValue, config.sessionIdleMinutes * 60_000);
    const session: SessionInfo = {
      accountId: account.id,
      username: account.username,
      role: account.role,
      idleExpiresAt: idleExpiresAt.toISOString(),
      csrfToken,
    };
    // MFA is skipped in the POC, so sign-in always completes immediately.
    return { next: 'done', session };
  }

  @Get('session')
  getSession(@CurrentSession() session: AuthedSession): SessionInfo {
    return {
      accountId: session.accountId,
      username: session.username,
      role: session.role,
      idleExpiresAt: session.idleExpiresAt.toISOString(),
      csrfToken: session.csrfToken,
    };
  }

  @Post('sign-out')
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const cookieValue = req.cookies?.[config.sessionCookieName] as string | undefined;
    await this.auth.destroySession(cookieValue);
    clearSessionCookie(res);
  }
}
