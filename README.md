# Event Analytics Platform — runnable POC

A working vertical slice of the Event Analytics Platform: a multi-tenant,
Google-Analytics-style tool where producer applications emit **events over NATS**
(no HTTP ingestion), the backend strips raw PII and stores pseudonymous daily
aggregates, and a web dashboard shows aggregate-only analytics per application.

This POC is built from the project's design artifacts (`docs/`,
`.worktrees/design/docs/design/`) but deliberately scopes down to what makes a
runnable end-to-end demo. See [Scope](#scope--whats-in-this-poc) below.

## Architecture

```
producer app ──(NATS: ingest.<tenant>.<cred>)──▶ ingestion worker ──▶ Postgres
   (@ea/producer-client)                          (validate, drop PII,     │
                                                    dedup, roll up)         │
                                                                           ▼
                                   web dashboard ◀──(REST, cookie auth)── NestJS API
                                     (@ea/web)                            (@ea/api)
```

Workspaces (npm):

| Package                  | What it is                                                              |
| ------------------------ | ----------------------------------------------------------------------- |
| `packages/contracts`     | Shared TypeScript types: event envelope v1 + API shapes                 |
| `packages/producer-client` | Reusable NATS producer kit + a demo traffic generator                 |
| `apps/api`               | NestJS REST API (auth, dashboard, admin, health) + the ingestion worker |
| `apps/web`               | React + Vite dashboard and admin UI                                     |

Infrastructure (Docker): **PostgreSQL 16** (one database, two schemas
`control` + `analytics`) and **NATS 2.10** with JetStream.

## Prerequisites

- Node.js 22+ and npm
- Docker Desktop (running)

## Quick start

```bash
# 1. Environment
cp .env.example .env

# 2. Install dependencies
npm install
```

> **Note on install scripts:** this environment gates package install scripts.
> If install warns that scripts were not run, approve the ones that need native
> or postinstall steps:
>
> ```bash
> npm approve-scripts argon2 prisma @prisma/client @prisma/engines esbuild
> ```

```bash
# 3. Start Postgres + NATS
npm run infra:up

# 4. Generate the Prisma client, create the schema, seed demo data
npm run prisma:generate
npm run db:migrate
npm run db:seed

# 5. Build the shared packages (api/web resolve them from dist)
npm run build -w @ea/contracts
npm run build -w @ea/producer-client
```

Then run the three processes, each in its own terminal:

```bash
npm run dev:api     # http://localhost:8080
npm run ingest      # NATS ingestion worker
npm run dev:web     # http://localhost:5173
```

Open **http://localhost:5173** and sign in.

### Demo accounts

| Username  | Password       | Role  | Access                   |
| --------- | -------------- | ----- | ------------------------ |
| `admin`   | `admin12345`   | admin | web-portal + mobile-app  |
| `analyst` | `analyst12345` | user  | web-portal only          |

### Generate demo traffic

```bash
npm run demo:emit            # 400 events by default
COUNT=600 npm run demo:emit  # custom volume
```

Events spread across the last 6 UTC days and both tenants. Re-run anytime; the
dashboard updates within a second or two. Watch the **Overview** screen (pick an
application) and the admin **Ingestion health** screen.

## What to look for

- **Application list** — a `user` sees only entitled applications; `analyst`
  cannot see `mobile-app`.
- **Overview** — totals, unique users, a daily bar chart, top event types, and
  breakdowns by country / browser / OS. Toggle **Compare with previous period**.
- **k=5 suppression** — any cell with 1–4 identified users shows `—` instead of
  a number (privacy). Visible rows can sum to less than the total by design.
- **Today so far (partial)** — the current UTC day is reported separately from
  complete days.
- **PII handling** — the producer sends a user id, IP, user agent, and a
  non-allow-listed `secret_note` property. None of these are stored: only a
  pseudonymous id, derived country, browser/OS family, and the allow-listed
  `plan` property persist. Verify in Postgres: the `event.properties` column
  never contains `secret_note`.
- **Dead letters** — events older than 7 days are dead-lettered as
  `timestamp_out_of_bounds`; see the count on Ingestion health.

## Useful commands

| Command                   | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `npm run infra:up`        | Start Postgres + NATS                              |
| `npm run infra:down`      | Stop them                                          |
| `npm run db:migrate`      | Apply the Prisma schema                            |
| `npm run db:seed`         | Seed accounts, tenants, credentials, allow-list    |
| `npm run build`           | Build every workspace                              |
| `npm run typecheck`       | Type-check every workspace                         |
| `npm test`                | Run all tests                                      |
| `npm run test:cov`        | Run all tests with coverage                        |
| `npm run demo:emit`       | Emit demo events over NATS                         |

## Testing & coverage

Tests use [Vitest](https://vitest.dev) with the v8 coverage provider.

```bash
npm test          # run every workspace's tests
npm run test:cov  # run with coverage reports
npm run test:api  # API tests only
npm run test:web  # web tests only
```

What's covered:

- **API unit tests** (`apps/api/test/unit`) — run in-process, no infrastructure:
  - ingestion derivation (pseudonymisation determinism and per-tenant isolation,
    country / browser / OS derivation, UTC-day truncation)
  - envelope parsing (every dead-letter reason plus the happy path)
  - dashboard aggregation (k=5 suppression including the 4-vs-5 boundary and
    anonymous cells, date-range validation, series zero-fill, top-10 ranking,
    period-comparison maths)
  - `AuthService` (argon2 verify, session create/resolve/expire/destroy),
    `EntitlementService` (404 no-existence-disclosure), and the problem+json
    error filter — all with in-memory Prisma doubles.
- **API integration tests** (`apps/api/test/integration`) — require the running
  stack:
  - `intake.int.spec.ts` runs the real intake against **Docker Postgres**
    (stores, dedups, drops non-allow-listed keys, dead-letters wrong-tenant and
    out-of-bounds timestamps, handles anonymous events).
  - `api.int.spec.ts` drives the **running API over HTTP** with Supertest
    (auth, CSRF rejection, entitlement scoping 404-vs-403, overview shape,
    date-range validation). Start the API first with `npm run dev:api`.
  - These suites skip themselves with a clear message if Postgres / the API
    aren't reachable, so `npm test` never fails just because infra is down.
- **Web tests** (`apps/web/test`) — jsdom + Testing Library:
  - the `Cell` suppression component and presentational helpers
  - the typed API client (CSRF header on unsafe methods only, `credentials:
    include`, `ApiError` on non-ok, query-string building, 204 handling).

### Coverage scope and the SWC note

Coverage thresholds are enforced and scoped to the code that runs **inside the
Vitest process** — the pure business logic and the plain service classes. On the
measured API set that is ~98% statements / ~95% branches.

The HTTP layer (NestJS controllers, the auth guard, bootstrap) is verified by the
integration tests, but those hit a **separately-running** server process, so the
coverage instrumenter can't see that code and it is excluded from the coverage
set rather than counted as zero. The usual way to instrument it in-process
(`unplugin-swc`, for NestJS decorator metadata) could not be used here because
the SWC native binary does not load in this environment. The controllers are
therefore covered behaviourally (not by line count). If you later run on a host
where SWC's binary works, the in-process Nest bootstrap can be re-enabled to fold
that code into the coverage number.

## Automation scripts

Three PowerShell scripts under `scripts/` wrap the common multi-step flows. Each
is also exposed as an npm script.

| Command           | Script                   | What it does                                                                                 |
| ----------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `npm run start:api` | `scripts/start-api.ps1` | Ensure `.env`, bring up Docker infra and wait for health, Prisma generate/migrate/seed, launch the API + ingestion worker (each in its own window), wait for `/health/ready`. |
| `npm run start:web` | `scripts/start-web.ps1` | Ensure `@ea/contracts` is built, check API reachability (warns if down), start the Vite dev server. |
| `npm run qa`        | `scripts/qa.ps1`        | Typecheck, build, then run all tests with coverage. |

You can also run the scripts directly for their options:

```powershell
./scripts/start-api.ps1 -SkipInfra -SkipSeed   # servers only, DB already prepared
./scripts/start-api.ps1 -NoWorker              # API without the ingestion worker
./scripts/start-web.ps1 -Build                 # build + preview instead of dev server
./scripts/qa.ps1 -NoCoverage                   # faster test run, no coverage
./scripts/qa.ps1 -SkipBuild                    # tests only
```

**QA and integration tests are skip-if-unavailable.** `qa.ps1` detects whether
Postgres and the API are reachable and reports it, but if they are not, the
integration suites self-skip and the run still passes on the unit + coverage
gate. It fails only on real check failures, never merely because infrastructure
is down. For the full integration run, start the stack first
(`npm run start:api`) and then run `npm run qa`.

### Continuous integration

`.github/workflows/ci.yml` runs the same gate on every push and pull request,
using **Postgres 16 and NATS 2.10 service containers** so the integration tests
execute for real in CI (rather than self-skipping). The job installs, runs Prisma
`migrate deploy` + seed, typechecks, builds, starts the API + ingestion worker,
runs the tests with coverage, and uploads the coverage reports as an artifact.

## Ports

| Service        | Port    |
| -------------- | ------- |
| Web (Vite)     | 5173    |
| API (NestJS)   | 8080    |
| PostgreSQL     | 15432   | (host; container is 5432. 15432 avoids a local Postgres on 5432) |
| NATS           | 4222    |
| NATS monitoring| 8222    |

## Scope — what's in this POC

**In:** messaging-only ingestion over NATS, PII stripping + pseudonymisation,
deduplication, daily aggregate rollups, the aggregate-only dashboard with k=5
suppression and period comparison, entitlement-scoped multi-tenant access,
password sessions with CSRF, and admin screens for tenants, entitlements,
producer credentials, and ingestion health.

**Deliberately deferred** (designed, but out of this slice): TOTP MFA and
step-up re-authentication (POC is **password-only**), the full GDPR
subject-access / erasure / objection / restriction machinery, the hash-chained
audit log, PostgreSQL row-level security, table partitioning, the two separate
physical databases (here it's one database with two schemas), and the pseudonym
key-versioning/rotation scheme. Where the design uses `__Host-ea_sid` over HTTPS
this POC uses a plain cookie over local HTTP.

This is a proof of concept for local and demo use. It is not production-ready
and does not implement the platform's full security and privacy controls.
```
