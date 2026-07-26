import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The letterhead artwork, inlined as a base64 data URI.
 *
 * assets/brand/letterhead.png is the full-page composite extracted losslessly from
 * docs/reference-letter-head.pdf (object `3 0 obj`, ASCII85 + Flate, 1054x1492 RGB). It is the
 * artwork the client approved, so rendering it directly makes brand fidelity exact by
 * construction rather than a review judgement.
 *
 * It carries both bands *and* the body watermark in one image, which is why the page needs a
 * single full-bleed background layer rather than separate header/footer elements.
 *
 * At A4 width the artwork is ~127 DPI. That is the resolution of the approved reference; it is
 * not a defect introduced here, and it cannot be improved without a vector rebuild — the source
 * is AI-generated and has no editable original. See the Principle II amendment.
 */

const BRAND_DIR = join(process.cwd(), 'assets', 'brand');

let cachedUri: string | null = null;

/** Memoised so the base64 encode is paid once per warm container, not per request. */
export function getLetterheadDataUri(): string {
  if (cachedUri !== null) return cachedUri;

  const buffer = readFileSync(join(BRAND_DIR, 'letterhead.png'));
  cachedUri = `data:image/png;base64,${buffer.toString('base64')}`;

  return cachedUri;
}
