# Event Analytics Platform — Project Handbook

Lifecycle: `II Agentic_SDLC_with_Claude_Guide-Draft-v2.md` via `/sdlc-feature`.
Charter: `docs/project-charter.md`. Roles: `docs/governance/role-register.md`.

## Stack

- Node.js 22 LTS (.nvmrc), TypeScript strict + noUncheckedIndexedAccess, npm workspaces
- API: NestJS (apps/api), Prisma + PostgreSQL 16, class-validator DTOs, OpenAPI 3.1 (docs/design/openapi.yaml is the contract for the query/dashboard API)
- Event ingestion: messaging system, NATS preferred — final choice, event contract and analytics store are decided by ADR in Phase 4. No HTTP ingestion API.
- Web: React + TypeScript + Vite (apps/web), types from packages/contracts
- Reusable producer client: packages/ (name decided at Phase 4)
- Tests: Jest + Supertest (API), Vitest + Testing Library (web), Playwright (e2e), k6 (load), StrykerJS (Tier 3)
- CI: GitHub Actions | Observability: Pino, OpenTelemetry, @nestjs/terminus

## Commands (available after the Phase 6 scaffold)

- Install: `npm ci` Dev: `npm run dev -w apps/api` / `npm run dev -w apps/web`
- Lint: `npm run lint` Types: `npm run typecheck` Format: `npm run format`
- Unit: `npm run test:unit` Integration: `npm run test:integration` E2E: `npx playwright test`
- DB: `npx prisma migrate dev` (local only) Generate client: `npx prisma generate`
- Contract lint: `npx @stoplight/spectral-cli lint docs/design/openapi.yaml`

## Module map (for regression selection)

- To be filled in at Phase 5 from the implementation plan.

## Rules

- Never commit secrets; use env vars; only .env.example is committed.
- Events contain PII: Risk Tier 3. Minimise, pseudonymise where possible, never log raw PII; redact in Pino.
- Every endpoint: DTO validation (whitelist + forbidNonWhitelisted), auth guard, tenant/ownership check, tests.
- Every event consumer: schema validation, tenant isolation, idempotency, dead-letter handling, tests.
- All DB changes via Prisma migrations with a documented rollback; destructive changes use expand/contract.
- No `any`, no `@ts-ignore` without a linked justification comment.
- Conventional commits referencing task IDs (T-n); small PRs; never push to main.
- Agents author as @alextthomasagent; humans approve; agents never approve.
- Approved artifacts (docs/requirements/**, docs/ux/**, docs/design/**, docs/plans/**) change only through HG-C.
- Never weaken a test or assertion to make it pass.

## Definition of Done

- Lint, types, tests pass in CI; diff coverage >= 80% lines; contract tests pass; mutation run on changed modules (Tier 3);
- Architect Review and Critical Review: no open blocking findings on the head SHA;
- Docs updated; evidence written to reports/; required gates approved.
