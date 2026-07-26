import { chromium as playwrightChromium, type Browser } from 'playwright-core';

/**
 * HTML -> PDF rendering via headless Chromium (research.md R3).
 *
 * @sparticuz/chromium is a Linux/Lambda build and will not launch on a Windows or macOS dev
 * machine, so the executable is resolved per environment. This is the only intentional
 * dev/prod divergence in the codebase.
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
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

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
    // Always dispose: a leaked browser in a warm serverless container exhausts memory
    // across subsequent invocations.
    await browser?.close();
  }
}
