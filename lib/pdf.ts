import { chromium as playwrightChromium, type Browser, type Page } from 'playwright-core';

/**
 * HTML -> PDF rendering via headless  Chromium (research.md R3).
 *
 * @sparticuz/chromium is a Linux/Lambda build and will not launch on a Windows or macOS dev
 * machine, so the executable is resolved per environment. This is the only intentional
 * dev/prod divergence in the codebase.
 *
 * ⚠️ The browser is launched ONCE per instance and reused. Do not "restore" a per-request
 * launch/close — it was the cause of a production defect where every 8th sequential render
 * failed and stayed failed. See the block comment on getBrowser().
 */

const isServerless = Boolean(process.env.VERCEL);

async function launchBrowser(): Promise<Browser> {
  if (isServerless) {
    const sparticuz = (await import('@sparticuz/chromium')).default;
    return playwrightChromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }

  // Local development: use the Chromium installed by the dev-only `playwright` package.
  const { chromium: devChromium } = await import('playwright');
  return devChromium.launch({ headless: true });
}

/**
 * Renders are serialised per instance — ONE at a time.
 *
 * Not a memory tuning: the instance keeps a single long-lived page (see getPage), and one page
 * cannot serve two renders at once without them clobbering each other's document. Concurrency
 * comes from Vercel running more instances, not from more pages per instance, which is the right
 * axis anyway — each instance holds its own Chromium.
 *
 * At ~700ms per warm render and 10–50 proposals/day, queueing costs nothing observable.
 */
const MAX_CONCURRENT_RENDERS = 1;

let browserPromise: Promise<Browser> | null = null;
let pagePromise: Promise<Page> | null = null;
let activeRenders = 0;
const slotQueue: Array<() => void> = [];

/**
 * Per-process identity and counters, exposed as response headers by the generate route.
 *
 * SC-009 asserts "N sequential renders on the SAME WARM INSTANCE", and that is not observable from
 * outside without this: `x-vercel-id`'s trailing segment is a per-REQUEST id, so counting distinct
 * values measures nothing. A run spread across N cold instances — each with an empty /tmp — would
 * otherwise be indistinguishable from a genuine sustained-use run, and would pass for the wrong
 * reason. `browserLaunches` is the sharper signal: on a healthy instance it stays at 1 forever,
 * and any growth means the browser is dying and being relaunched.
 *
 * Module scope, so these reset exactly when the process does.
 */
const INSTANCE_ID = Math.random().toString(36).slice(2, 10);
let rendersServed = 0;
let browserLaunches = 0;

export function getRenderStats(): {
  instanceId: string;
  rendersServed: number;
  browserLaunches: number;
} {
  return { instanceId: INSTANCE_ID, rendersServed, browserLaunches };
}

async function acquireRenderSlot(): Promise<void> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders += 1;
    return;
  }
  // Wait for a slot. The releaser hands its slot over directly rather than decrementing,
  // so the count can never transiently exceed the cap.
  await new Promise<void>((resolve) => slotQueue.push(resolve));
}

function releaseRenderSlot(): void {
  const next = slotQueue.shift();
  if (next) {
    next();
  } else {
    activeRenders -= 1;
  }
}

/**
 * Returns the instance-wide Chromium, launching it once and reusing it thereafter.
 *
 * ⚠️ This function is why sustained rendering works. The original implementation launched a
 * browser per request and closed it in a `finally`, which correctly freed *memory* and misled
 * everyone — the leak was *disk*. @sparticuz/chromium inflates ~200 MB into /tmp on first
 * launch (512 MB cap), and every additional launch left ~40 MB of profile, disk cache
 * (`--disk-cache-size=33554432`), code cache and crashpad data behind. ~310 MB remaining over
 * ~40 MB per launch is ~7 renders, which is exactly where production failed — and it stayed
 * failed, because a full disk does not heal until the instance is recycled.
 *
 * A page is just a tab in the running browser process and creates no profile directory, so
 * per-request work now costs no disk at all. (⚠️ A BrowserContext would ALSO cost no disk, and is
 * still wrong here — see the comment in renderPdf: under --single-process, closing one kills the
 * browser and forces a relaunch, which is exactly the leak this function exists to prevent.)
 *
 * ⚠️ Do NOT add a "recycle the browser every N renders" safety valve. It was tried and removed:
 * each relaunch re-incurs the ~40 MB /tmp cost, reintroducing the original defect at 1/N the
 * rate. The tradeoff is asymmetric — running out of memory kills the instance, which restarts
 * with a clean /tmp and self-heals; running out of disk does not self-heal, as production
 * demonstrated with 10 consecutive failures. The browser is only ever replaced when it has
 * actually died (isConnected() below).
 */
async function getBrowser(): Promise<Browser> {
  const pending = browserPromise;

  if (pending) {
    const existing = await pending.catch(() => null);
    if (existing?.isConnected()) return existing;

    // Chromium died (crash, OOM kill of the child). Drop it and relaunch — this is a genuine
    // recovery path, not a scheduled recycle.
    browserPromise = null;
    if (existing) await existing.close().catch(() => undefined);
  }

  browserLaunches += 1;
  browserPromise = launchBrowser();
  pagePromise = null; // a new browser invalidates any page from the previous one
  return browserPromise;
}

/**
 * Returns the instance's single long-lived page, creating it only if there isn't a usable one.
 *
 * ⚠️ THE PAGE IS NEVER CLOSED, AND THAT IS THE POINT. @sparticuz/chromium launches with
 * `--no-startup-window` (visible in the launch args in Vercel's logs), so the browser starts with
 * zero windows. The page created here is the ONLY window — closing it drops the count to zero and
 * Chromium exits.
 *
 * This was learned twice, expensively. First attempt: a BrowserContext per request, closed in a
 * `finally`. Second: a Page per request, closed in a `finally`. Both killed the browser after every
 * render, so `getBrowser()` relaunched it on the next one, and every relaunch left another
 * ~40 MB /tmp profile directory behind — reproducing the original disk-exhaustion defect that the
 * browser reuse existed to fix. Measured on Vercel 2026-08-02: one instance served 20 sequential
 * requests and relaunched Chromium 17 times, with 3 successes.
 *
 * `setContent()` replaces the whole document, so reuse needs no cleanup. Determinism across a
 * reused page is asserted by tests/scale/render-scale.test.ts, which requires 100 consecutive
 * renders to be byte-identical AND `browserLaunches` to stay at 1.
 */
async function getPage(): Promise<Page> {
  const browser = await getBrowser();

  if (pagePromise) {
    const existing = await pagePromise.catch(() => null);
    // `context().browser()` guards the case where the browser was replaced underneath us: a page
    // belonging to a dead browser can still report !isClosed().
    if (existing && !existing.isClosed() && existing.context().browser() === browser) {
      return existing;
    }
    pagePromise = null;
  }

  pagePromise = browser.newPage();
  return pagePromise;
}

/**
 * Rewrites the PDF's embedded timestamps to a fixed value derived from the proposal date.
 *
 * Chromium stamps /CreationDate and /ModDate with the wall-clock render time at second
 * resolution, so two renders of identical input differ whenever they straddle a second
 * boundary — breaking FR-007/SC-005. Pinning them to the rep-supplied proposal date makes
 * output a pure function of the input, and is more meaningful metadata besides.
 *
 * The replacement is deliberately the same byte length as the original: PDF cross-reference
 * tables store absolute byte offsets, so changing the length would corrupt the file.
 */
function pinTimestamps(pdf: Buffer, proposalDate: string): Buffer {
  const digits = `${proposalDate.replace(/-/g, '')}000000`; // YYYYMMDD + HHMMSS
  if (digits.length !== 14) return pdf;

  // latin1 is a byte-exact round trip for arbitrary binary data.
  const text = pdf.toString('latin1');
  const pinned = text.replace(
    /(\/(?:CreationDate|ModDate)\s*\(D:)\d{14}/g,
    (_match, prefix: string) => `${prefix}${digits}`
  );

  return Buffer.from(pinned, 'latin1');
}

/**
 * Renders a complete HTML document to an A4 PDF.
 *
 * Waits on document.fonts.ready before printing — with fonts inlined as data URIs this is a
 * correctness gate rather than an optimisation, since the wordmark is type (see lib/fonts.ts).
 *
 * `proposalDate` (YYYY-MM-DD) pins the document timestamps so identical input yields
 * byte-identical output.
 */
export async function renderPdf(html: string, proposalDate?: string): Promise<Buffer> {
  await acquireRenderSlot();

  try {
    const page = await getPage();
    rendersServed += 1;

    // 'load' is sufficient and cheaper than networkidle: the document makes no network
    // requests at all by design (constitution: Security Requirements).
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return proposalDate ? pinTimestamps(pdf, proposalDate) : pdf;
  } finally {
    // ⚠️ Nothing is closed here — not the browser, not a context, not the page. Each of those was
    // tried and each killed Chromium under @sparticuz/chromium's launch flags, forcing a relaunch
    // that leaked ~40 MB of /tmp. See getPage(). The browser and its single page are
    // instance-scoped and outlive every request; they are replaced only when they actually die.
    releaseRenderSlot();
  }
}
