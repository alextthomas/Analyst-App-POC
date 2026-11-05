import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

/** Field names that may carry PII, credentials or event content. */
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'secret',
  'cookie',
  'authorization',
  'userId',
  'context',
  'properties',
  'payload',
  'csrfToken',
] as const;

/**
 * Pino redaction paths. Pino wildcards match a single level, so each sensitive
 * key is covered at the top level and up to three levels deep.
 */
export const REDACT_PATHS: string[] = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  'err.meta',
  '*.err.meta',
  ...SENSITIVE_KEYS.flatMap((k) => [k, `*.${k}`, `*.*.${k}`, `*.*.*.${k}`]),
];

export const REDACT_CENSOR = '[Redacted]';

export function loggerOptions(): LoggerOptions {
  return {
    level: process.env.LOG_LEVEL ?? 'info',
    redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR },
  };
}

export function createLogger(destination?: DestinationStream): Logger {
  const opts = loggerOptions();
  return destination ? pino(opts, destination) : pino(opts);
}

/** Shared process logger (stdout JSON). */
export const logger: Logger = createLogger();

/**
 * Reduce any thrown value to `{ name, code, message }`. Never pass the raw
 * error object to a logger: Prisma and parse errors can embed event content.
 */
export function errFields(err: unknown): { name: string; code?: string; message: string } {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    return {
      name: err.name,
      ...(typeof code === 'string' ? { code } : {}),
      // Prisma messages can echo query arguments (event content); keep the first line only.
      message: (err.message.split('\n').find((l) => l.trim().length > 0) ?? '').slice(0, 200),
    };
  }
  return { name: 'NonError', message: typeof err === 'string' ? err.slice(0, 200) : 'non-error value thrown' };
}
