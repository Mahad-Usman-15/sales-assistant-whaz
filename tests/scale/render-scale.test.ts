import { describe, it, expect } from 'vitest';
import { renderPdf, getRenderStats } from '../../lib/pdf';
import { buildProposalHtml } from '../../lib/template';
import { toViewModel } from '../../lib/view-model';

/**
 * Sustained-render probe. Not part of `npm run test:unit` — it takes minutes.
 *
 *   npm run check:render-scale            # 300 renders
 *   RENDER_SCALE_COUNT=1000 npm run check:render-scale
 *
 * Exists because a per-request browser launch leaked ~40 MB of /tmp per render and failed at the
 * 8th render in production, permanently, until the instance was recycled. Re-run this whenever
 * lib/pdf.ts changes.
 *
 * ⚠️ Runs against the LOCAL dev Chromium, so it proves browser reuse, determinism, and memory
 * stability — but NOT the /tmp fix itself, whose mechanism is specific to @sparticuz/chromium on
 * Lambda. That needs a deployed check (specs/002-rbac-dashboard/tasks.md T005).
 */

const COUNT = Number(process.env.RENDER_SCALE_COUNT ?? 300);
const GROWTH_LIMIT = 1.5; // last-quarter mean RSS over first-quarter mean

const input = {
  recipientName: 'Scale Probe',
  recipientRoleLine1: 'Head of Operations',
  recipientRoleLine2: '',
  clientCompany: 'Probe Co',
  proposalDate: '2026-08-01',
  selectedServiceIds: [] as string[],
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe(`${COUNT} sequential renders`, () => {
  it('all succeed, stay byte-identical, and do not grow memory', async () => {
    const html = buildProposalHtml(toViewModel(input));
    const timings: number[] = [];
    const rss: number[] = [];
    let baseline: Buffer | null = null;

    for (let i = 0; i < COUNT; i++) {
      const started = Date.now();
      const pdf = await renderPdf(html, input.proposalDate);
      timings.push(Date.now() - started);
      rss.push(process.memoryUsage().rss / 1048576);

      if (baseline === null) baseline = pdf;
      // Determinism (FR-007) must survive a shared, long-lived browser process.
      else expect(pdf.equals(baseline), `render ${i + 1} differs from render 1`).toBe(true);
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const quarter = Math.floor(COUNT / 4);
    const rssFirst = mean(rss.slice(0, quarter));
    const rssLast = mean(rss.slice(-quarter));
    const stats = getRenderStats();

    console.log(
      `\n  renders  ${timings.length}/${COUNT}` +
        `\n  first    ${timings[0]}ms (includes browser launch)` +
        `\n  median   ${sorted[Math.floor(sorted.length / 2)]}ms` +
        `\n  p95      ${sorted[Math.floor(sorted.length * 0.95)]}ms` +
        `\n  max      ${sorted[sorted.length - 1]}ms` +
        `\n  rss      ${Math.round(rssFirst)}MB -> ${Math.round(rssLast)}MB (x${(rssLast / rssFirst).toFixed(2)})` +
        `\n  launches ${stats.browserLaunches}\n`
    );

    expect(timings).toHaveLength(COUNT);
    expect(rssLast / rssFirst).toBeLessThan(GROWTH_LIMIT);

    /**
     * ⚠️ The assertion that matters most, and the one that was missing.
     *
     * Every /tmp exhaustion incident in this project traces to Chromium being relaunched: the
     * original per-request launch/close, then a per-request BrowserContext, then a per-request
     * Page — each killed the browser under @sparticuz/chromium's flags, and each relaunch leaked
     * ~40 MB of /tmp. Passing renders and flat memory did NOT catch any of them; a relaunch count
     * would have caught all three immediately.
     *
     * One launch for the life of the process. More means the browser is dying.
     */
    expect(
      stats.browserLaunches,
      `Chromium was launched ${stats.browserLaunches}x across ${COUNT} renders — it should launch once. ` +
        'Something is closing the browser, a context, or the only page.'
    ).toBe(1);
  }, 3_600_000);
});
