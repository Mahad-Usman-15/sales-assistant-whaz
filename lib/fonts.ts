import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Self-hosted fonts, inlined as base64 data URIs (research.md R5).
 *
 * Inlining is not an optimisation: the constitution forbids the render pipeline from fetching
 * remote content, and it removes the font-load race entirely — there is no request that can
 * lose to page.pdf().
 *
 * The reference document (docs/reference-letter-head.pdf) sets everything in Helvetica and
 * Helvetica-Bold, which are PDF base-14 fonts it does not embed — it relies on the reader
 * substituting locally. We cannot rely on that: headless Chromium ships no system fonts under
 * @sparticuz/chromium, so "Helvetica" would resolve to nothing. Arimo is metrically identical
 * to Helvetica/Arial and Apache-2.0 licensed, so line breaks land where the reference's do.
 *
 * Arimo is the only face shipped. Montserrat and Inter were removed once constitution v3.0.0
 * landed: the WHAZ wordmark is part of the letterhead artwork now rather than being set in type,
 * and the body copy is Helvetica-metric throughout.
 */

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');

function dataUri(filename: string): string {
  const buffer = readFileSync(join(FONT_DIR, filename));
  return `data:font/woff2;base64,${buffer.toString('base64')}`;
}

let cachedCss: string | null = null;

/**
 * Returns the @font-face CSS with both faces inlined.
 * Memoised in module scope so the base64 encode is paid once per warm container, not per request.
 */
export function getFontFaceCss(): string {
  if (cachedCss !== null) return cachedCss;

  // Static instances, deliberately not the variable font: Chromium converts variable fonts to
  // Type3 in PDF output, which loses the ToUnicode map and breaks text selection/search on some
  // pages. Google Fonts serves Arimo as variable-only, so these come from @fontsource/arimo,
  // which publishes true static per-weight subsets (FR-005).
  const regular = dataUri('Arimo-Regular.woff2');
  const bold = dataUri('Arimo-Bold.woff2');

  cachedCss = `
@font-face {
  font-family: 'Arimo';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url('${regular}') format('woff2');
}
@font-face {
  font-family: 'Arimo';
  font-style: normal;
  font-weight: 700;
  font-display: block;
  src: url('${bold}') format('woff2');
}
`.trim();

  return cachedCss;
}
