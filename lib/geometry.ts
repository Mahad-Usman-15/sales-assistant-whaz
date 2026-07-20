/**
 * Page geometry for the A4 proposal document (research.md R4).
 *
 * Band heights are derived from the reference artwork's proportions: the artwork in
 * docs/header.png occupies rows 607-883 and docs/footer.png rows 664-827 of a 1054x1492
 * canvas, which at A4 width works out to the millimetre values below.
 */

export const PAGE = {
  widthMm: 210,
  heightMm: 297,
} as const;

export const BAND = {
  /** Header band height, full bleed from the top edge. */
  headerMm: 55.2,
  /** Footer band height, full bleed to the bottom edge. */
  footerMm: 32.7,
} as const;

/**
 * Body padding.
 *
 * Deliberately larger than the band heights: the diagonal cuts intrude further into the page
 * than the bands' straight edges do, so text needs clearance beyond the nominal band height or
 * it tucks under the angled edge.
 */
export const BODY_PADDING = {
  topMm: 68,
  bottomMm: 42,
  sideMm: 20,
} as const;
