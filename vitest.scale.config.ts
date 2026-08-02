import { defineConfig } from 'vitest/config';

// Separate from vitest.config.ts so the sustained-render probe (minutes) never runs as part of
// `npm run test:unit` (seconds). See tests/scale/render-scale.test.ts.
export default defineConfig({
  test: {
    include: ['tests/scale/**/*.test.ts'],
    environment: 'node',
    testTimeout: 3_600_000,
    hookTimeout: 3_600_000,
  },
});
