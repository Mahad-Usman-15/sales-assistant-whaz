import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  // tests/integration/db/ holds vitest database-concurrency tests, which Playwright's default
  // testMatch would otherwise pick up (it matches *.test.ts). They run via `npm run test:db`.
  testIgnore: '**/db/**',
  // Covers a Chromium cold start plus a multi-page render, with headroom.
  timeout: 90_000,
  fullyParallel: false,
  // ⚠️ One worker, not just fullyParallel:false — that only serialises tests WITHIN a file, while
  // workers run different files concurrently. Since auth landed, the database is shared mutable
  // state across specs: deactivation.spec.ts flips the seeded member to INACTIVE, and anything
  // running beside it gets 401s that look like unrelated failures. Observed 2026-08-02, where it
  // failed three form tests and one login test that had nothing to do with the change.
  workers: 1,
  retries: 1,
  reporter: 'list',
  // Signs a seeded member in and writes storageState. Every surface is gated (FR-001), so without
  // this the whole suite 401s.
  globalSetup: './tests/integration/auth.setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    // Tests run as a signed-in SALES member by default. Specs that need to be anonymous opt out
    // with `test.use({ storageState: { cookies: [], origins: [] } })`.
    storageState: './tests/integration/.auth/member.json',
  },
  webServer: {
    // Deliberately a production build, not `next dev`. The dev server compiles routes lazily
    // and became unresponsive to page requests after a run of heavy PDF renders, which failed
    // tests for reasons that had nothing to do with the product. This also means the timings
    // observed here reflect what actually ships.
    command: 'npm run build && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
