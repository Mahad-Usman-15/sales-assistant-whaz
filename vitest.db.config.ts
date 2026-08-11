import { defineConfig } from 'vitest/config';

// Database concurrency tests. Separate from vitest.config.ts because they need a real Postgres and
// take seconds rather than milliseconds — `npm run test:unit` must stay fast and dependency-free.
//
// ⚠️ `fileParallelism: false` and single-threaded: these tests deliberately contend on a global
// advisory lock, and running files in parallel would have them interfere with each other rather
// than with the two connections each test creates on purpose.
export default defineConfig({
  test: {
    include: ['tests/integration/db/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
