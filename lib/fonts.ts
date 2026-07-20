import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Self-hosted fonts, inlined as base64 data URIs (research.md R5).
 *
 * Inlining is not an optimisation here: the constitution forbids the render pipeline from
 * fetching remote content, and it also removes the font-load race entirely — there is no request
 * that can lose to page.pdf(). Montserrat Black is load-bearing because the WHAZ wordmark is set
 * in type rather than shipped as artwork, so a failed load breaks the logo itself.
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

  const montserrat = dataUri('Montserrat-Black.woff2');
  // Static instances, deliberately not the variable font: Chromium converts variable fonts to
  // Type3 in PDF output, which loses the ToUnicode map and breaks text selection/search on
  // some pages. Static faces embed as Type0 with a working text layer (FR-005, Principle II).
  const interRegular = dataUri('Inter-Regular.woff2');
  const interSemiBold = dataUri('Inter-SemiBold.woff2');

  cachedCss = `
@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 900;
  font-display: block;
  src: url('${montserrat}') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url('${interRegular}') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url('${interSemiBold}') format('woff2');
}
`.trim();

  return cachedCss;
}
