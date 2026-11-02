/**
 * Integration-test helpers. Loads env, exposes a shared PrismaClient and a
 * reachability probe for the running API. These tests require Docker Postgres
 * (and, for the HTTP suites, the dev API) to be running.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

loadDotenv({ path: resolve(__dirname, '../../.env') });
loadDotenv({ path: resolve(__dirname, '../../../../.env') });

import { PrismaClient } from '@prisma/client';

export const API_BASE = process.env.API_BASE ?? 'http://localhost:8080';

export const prisma = new PrismaClient();

/** True if the running API answers its readiness probe. */
export async function apiReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health/live`);
    return res.ok;
  } catch {
    return false;
  }
}

/** True if Postgres is reachable through Prisma. */
export async function dbReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** A short unique suffix for test-scoped tenant/account ids. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}
