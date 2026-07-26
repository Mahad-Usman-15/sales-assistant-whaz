/**
 * Reports catalog strings that are too wide for their services-table column.
 *
 * The reference document (docs/reference-letter-head.pdf) has a uniform 6.35mm row pitch, which
 * only holds while every cell fits on one line. A string that wraps silently doubles its row and
 * pushes "Why Whaz" and "Next Step" down the page, so this runs as a copy gate whenever a
 * `challenge` or `benefit` line in lib/catalog.ts changes.
 *
 * Measured in a real headless Chromium with the real font, because string length is not a usable
 * proxy — "Whaz Venture Blueprint" is shorter than "Effort spread over weak markets" in
 * characters but not in millimetres.
 *
 *   node scripts/check-table-fit.mjs      # exits non-zero if anything overflows
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { SERVICE_CATALOG } from '../lib/catalog.ts';
import { TABLE } from '../lib/geometry.ts';

const [challengeMm, solutionMm, benefitMm] = TABLE.colMm;
const INSET_MM = 2.1 * 2; // the cell padding, both sides

const font = readFileSync('assets/fonts/Arimo-Regular.woff2').toString('base64');
const page = await (await chromium.launch({ headless: true })).newPage();
await page.setContent(`<style>
@font-face{font-family:Arimo;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:400}
span{font-family:Arimo;font-size:10pt;white-space:nowrap}
</style><body></body>`);
await page.evaluate(() => document.fonts.ready);

const widthMm = (text) =>
  page.evaluate((value) => {
    const span = document.createElement('span');
    span.textContent = value;
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    span.remove();
    return (width / 96) * 25.4;
  }, text);

let overflows = 0;
for (const service of SERVICE_CATALOG) {
  const cells = [
    ['challenge', service.challenge, challengeMm - INSET_MM],
    ['solution', service.name, solutionMm - INSET_MM],
    ['benefit', service.benefit, benefitMm - INSET_MM],
  ];
  for (const [column, text, limit] of cells) {
    const width = await widthMm(text);
    if (width > limit) {
      overflows++;
      console.error(
        `OVERFLOW  ${column.padEnd(9)} ${width.toFixed(1)}mm > ${limit.toFixed(1)}mm  "${text}"`
      );
    }
  }
}

await page.context().browser().close();
console.log(
  overflows === 0
    ? `OK — all ${SERVICE_CATALOG.length} services fit on one table line.`
    : `${overflows} cell(s) would wrap and break the 6.35mm row pitch.`
);
process.exit(overflows === 0 ? 0 : 1);
