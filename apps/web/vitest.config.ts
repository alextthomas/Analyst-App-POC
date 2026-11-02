import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // The React screens and hash router are exercised manually / via the API
      // integration tests; the unit-tested surface here is the api client and
      // the presentational helpers. Coverage is scoped to those.
      include: ['src/api.ts', 'src/ui.tsx'],
      // Lines/branches are high; function coverage is lower because api.ts
      // exposes many thin per-endpoint fetch wrappers that are identical in
      // shape and are exercised end-to-end by the API integration suite rather
      // than mocked one-by-one here.
      thresholds: {
        lines: 80,
        functions: 50,
        branches: 80,
        statements: 80,
      },
    },
  },
});
