import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    // Integration tests touch a shared Postgres and the running API; run files
    // sequentially to avoid cross-test interference on the same database.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Coverage is measured for code that runs IN the Vitest process: the
      // pure business logic and the plain service classes. The HTTP layer
      // (controllers, guard, bootstrap, the standalone ingest worker) is
      // verified by the out-of-process integration tests in test/integration,
      // which exercise the real server but are not instrumented here. Those
      // files are excluded from the coverage set so the percentage reflects
      // what is actually measured rather than being diluted by untracked code.
      include: [
        'src/config.ts',
        'src/problem.filter.ts',
        'src/logger.ts',
        'src/auth/session-cookie.ts',
        'src/ingestion/derive.ts',
        'src/ingestion/intake.ts',
        'src/dashboard/dashboard.aggregate.ts',
        'src/dashboard/entitlement.service.ts',
        'src/auth/auth.service.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
