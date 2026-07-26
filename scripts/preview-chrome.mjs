/**
 * Renders a proposal HTML file to PNG at A4 size — a quick eyeball of a layout change.
 *
 * Not part of the app or its test suites, and **not** the fidelity check: constitution v3.0.0
 * Principle II requires a numeric comparison of text baselines against
 * docs/reference-letter-head.pdf (see quickstart.md), and explicitly forbids resting a fidelity
 * claim on a visual look. This screenshots the HTML in a browser viewport rather than in print
 * mode, so it will not show pagination or the per-page letterhead at all.
 *
 * Usage: node scripts/preview-chrome.mjs <path-to-html> [outfile]
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const htmlPath = process.argv[2];
const outPath = process.argv[3] ?? 'tmp/preview/page.png';

if (!htmlPath) {
  console.error('Usage: node scripts/preview-chrome.mjs <path-to-html> [outfile]');
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });

const browser = await chromium.launch();
// 794x1123 px is A4 at 96 DPI.
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: outPath });
await browser.close();

console.log(`Wrote ${outPath}`);
