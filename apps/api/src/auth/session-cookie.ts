import type { CookieOptions, Response } from 'express';
import { config } from '../config';

/** Attributes shared by set and clear so a Secure/__Host- cookie is actually removed. */
export function sessionCookieBase(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Secure is required for the __Host- prefix; enabled via COOKIE_SECURE=true over HTTPS.
    secure: config.cookieSecure,
    path: '/',
  };
}

export function setSessionCookie(res: Response, value: string, maxAgeMs: number): void {
  res.cookie(config.sessionCookieName, value, { ...sessionCookieBase(), maxAge: maxAgeMs });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.sessionCookieName, sessionCookieBase());
}
