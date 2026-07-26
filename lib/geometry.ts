/**
 * Page geometry for the A4 executive proposal.
 *
 * Every value below is measured from the decoded content stream of
 * docs/reference-letter-head.pdf, which is the approved document rather than a style guide.
 * Source values are PDF points (origin bottom-left); the millimetre figures here are
 * pt * 0.352778, expressed from the top edge.
 */

export const PAGE = {
  widthMm: 210,
  heightMm: 297,
} as const;

/**
 * Letterhead band extents within the composite artwork.
 *
 * The bands are painted by the background image, not by CSS — these values exist so body
 * content can be kept clear of them. Both cuts are diagonal, so the deeper edge is what
 * matters for clearance.
 *
 * ⚠️ Intentionally not imported anywhere. This is the measured record that justifies
 * BODY_PADDING below, kept so the derivation survives; deleting it as "unused" would mean
 * re-measuring the reference PDF's alpha channel to change a padding value. Retained
 * deliberately during the 2026-07-26 dead-code sweep — do not remove without reading
 * BODY_PADDING's comment first.
 */
export const BAND = {
  /** Header: flat to x=41.8mm, then cuts down to its deepest point. */
  headerFlatMm: 48.8,
  headerDeepMm: 54.9,
  /** Footer: flat top edge to x=99.6mm, then cuts down. Deepest intrusion is the flat part. */
  footerTopMm: 264.8,
} as const;

/**
 * Body text margins. Left/right are the reference's 46pt text margin.
 *
 * topMm reserves space for the header band and places the "Executive Proposal" heading at the
 * reference's 77.9mm baseline; bottomMm keeps content clear of the footer band's 264.8mm edge.
 * Both are reserved via the thead/tfoot of .wz-doc, never body padding — see lib/chrome.ts.
 *
 * bottomMm is 37 rather than the 32.2 that would just touch BAND.footerTopMm: a page that breaks
 * at the last possible line otherwise lands text ~1.8mm off the band, which reads as a collision.
 * The reference gives no guidance here — its single page ends well short of the footer.
 */
export const BODY_PADDING = {
  topMm: 70,
  bottomMm: 37,
  sideMm: 16.2,
} as const;

/**
 * The three-column table, measured from the reference.
 *
 * The table is centred on the page (63.6pt each side), deliberately inset from the 16.2mm
 * text margin rather than aligned to it.
 */
export const TABLE = {
  widthMm: 165.1,
  /** Column widths: Mission Challenge / Whaz Solution / Expected Benefit. */
  colMm: [58.4, 50.8, 55.9],
  headerFill: '#111827',
  bodyFill: '#F5F5F5',
  ruleColor: '#808080',
  ruleWidthPt: 0.4,
} as const;
