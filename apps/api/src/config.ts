/** Central runtime configuration, read from environment with sane local defaults. */
export const config = {
  port: Number(process.env.API_PORT ?? 8080),
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'ea_sid',
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES ?? 30),
  webOrigins: (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** k-anonymity threshold: cells below this many unique users are suppressed. */
  kThreshold: 5,
};
