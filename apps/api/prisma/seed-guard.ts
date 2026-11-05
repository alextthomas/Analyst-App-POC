import { randomBytes } from 'node:crypto';

export class SeedGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedGuardError';
  }
}

export interface SeedSecrets {
  /** True when running in the guarded (deployed, synthetic-only) mode. */
  guarded: boolean;
  adminPassword: string;
  analystPassword: string;
  /** Producer secret for a tenant id; never printed. */
  producerSecret(tenantId: string): string;
}

const MIN_PASSWORD_LENGTH = 12;

/** Local-only fallbacks, used only when EA_DATA_CLASSIFICATION is unset (developer machine). */
const LOCAL_DEFAULTS = {
  admin: 'admin12345',
  analyst: 'analyst12345',
  producer: (tenantId: string) => `${tenantId}-demo-secret`,
} as const;

function envKey(tenantId: string): string {
  return `SEED_PRODUCER_SECRET_${tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

/**
 * Decide which secrets the seed may use.
 * - EA_DATA_CLASSIFICATION unset: local development, legacy demo values allowed.
 * - EA_DATA_CLASSIFICATION=synthetic: passwords must come from the environment.
 * - anything else: refuse to run.
 */
export function resolveSeedSecrets(env: NodeJS.ProcessEnv): SeedSecrets {
  const classification = env.EA_DATA_CLASSIFICATION;

  if (classification === undefined || classification === '') {
    return {
      guarded: false,
      adminPassword: env.SEED_ADMIN_PASSWORD || LOCAL_DEFAULTS.admin,
      analystPassword: env.SEED_ANALYST_PASSWORD || LOCAL_DEFAULTS.analyst,
      producerSecret: (tenantId) => env[envKey(tenantId)] || LOCAL_DEFAULTS.producer(tenantId),
    };
  }

  if (classification !== 'synthetic') {
    throw new SeedGuardError('Refusing to seed: EA_DATA_CLASSIFICATION must be "synthetic" when set.');
  }

  const admin = env.SEED_ADMIN_PASSWORD;
  const analyst = env.SEED_ANALYST_PASSWORD;
  if (!admin || !analyst) {
    throw new SeedGuardError('Refusing to seed: SEED_ADMIN_PASSWORD and SEED_ANALYST_PASSWORD are required.');
  }
  if (admin.length < MIN_PASSWORD_LENGTH || analyst.length < MIN_PASSWORD_LENGTH) {
    throw new SeedGuardError(`Refusing to seed: seed passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return {
    guarded: true,
    adminPassword: admin,
    analystPassword: analyst,
    // Producer secrets are not used for NATS auth in the POC; random unless supplied.
    producerSecret: (tenantId) => env[envKey(tenantId)] || randomBytes(32).toString('hex'),
  };
}
