import { chromium as playwrightChromium, type Browser } from 'playwright-core';

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
 * Cap on renders sharing one instance at the same moment.
 *
 * Contexts are isolated from each other but their memory is not: a burst of concurrent renders
 * is N live page trees in one 1 GB function. Two keeps peak memory well inside the limit while
 * still overlapping Chromium's I/O waits. Raise only with a measured concurrent-burst test.
 */
const MAX_CONCURRENT_RENDERS = 2;

let browserPromise: Promise<Browser> | null = null;
let activeRenders = 0;
const slotQueue: Array<() => void> = [];

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
 * A BrowserContext lives inside the running browser process and creates no profile directory,
 * so per-request isolation now costs no disk at all.
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

  browserPromise = launchBrowser();
  return browserPromise;
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

  let context: Awaited<ReturnType<Browser['newContext']>> | null = null;

  try {
    const browser = await getBrowser();

    // Per-request isolation is a CONTEXT, never a browser. Contexts share the running Chromium
    // process, so they cost no /tmp — which is the whole fix. See getBrowser().
    context = await browser.newContext();
    const page = await context.newPage();

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
    // Close the CONTEXT only. Closing the browser here is what caused the /tmp exhaustion
    // defect; the browser is instance-scoped and outlives every individual request.
    await context?.close().catch(() => undefined);
    releaseRenderSlot();
  }
}
