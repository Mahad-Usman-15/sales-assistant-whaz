import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  // Covers a Chromium cold start plus a multi-page render, with headroom.
  timeout: 90_000,
  fullyParallel: false,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
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
