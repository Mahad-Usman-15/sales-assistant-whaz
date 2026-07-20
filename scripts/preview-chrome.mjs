/**
 * Renders a proposal HTML file to PNG at A4 size for the visual fidelity review (T034).
 *
 * Not part of the app or its test suites — a developer tool for comparing the CSS-built chrome
 * against docs/header.png and docs/footer.png, which constitution v2.0.0 Principle II requires
 * before any chrome change is merged.
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
