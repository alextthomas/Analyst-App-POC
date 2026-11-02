/**
 * Loads environment from the repo-root .env and the api-local .env.
 * Import this first (before config) in any entrypoint (main, ingest, seed).
 * Root .env holds the full app config; api .env holds DATABASE_URL for Prisma.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

// api/.env (DATABASE_URL etc.) and then the repo root .env (does not override).
loadDotenv({ path: resolve(__dirname, '../.env') });
loadDotenv({ path: resolve(__dirname, '../../../.env') });
