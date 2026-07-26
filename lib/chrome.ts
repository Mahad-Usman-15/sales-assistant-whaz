import { getLetterheadDataUri } from './brand';
import { BODY_PADDING, PAGE, TABLE } from './geometry';

/**
 * Page chrome and document typography.
 *
 * The letterhead is the approved artwork painted as a full-bleed background layer, not a CSS
 * reconstruction. It carries the header band, the body watermark, and the footer band as one
 * image, so there is a single chrome element rather than separate header/footer nodes.
 *
 * Type sizes, colours, and the table metrics below are measured from the decoded content stream
 * of docs/reference-letter-head.pdf. Where the reference is internally inconsistent it is
 * reproduced as-is rather than tidied: "Why Whaz" is 14pt but "Next Step" is 10pt, and that
 * difference is intentional here because the reference is the acceptance criterion.
 */

const [COL_CHALLENGE, COL_SOLUTION, COL_BENEFIT] = TABLE.colMm;

export const CHROME_CSS = `
/* margin:0 so the letterhead can bleed to the sheet edges. Space for the bands is reserved by
   the thead/tfoot of .wz-doc instead — see .wz-doc below. */
@page {
  size: A4;
  margin: 0;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Arimo', Helvetica, Arial, sans-serif;
  color: #000000;
  background: #ffffff;
  font-size: 10pt;
  line-height: 1.2;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* The letterhead artwork, repeated on every printed page.
   position:fixed is what makes Chromium repeat it per page; it does NOT reserve any space. */
.wz-letterhead {
  position: fixed;
  top: 0;
  left: 0;
  width: ${PAGE.widthMm}mm;
  height: ${PAGE.heightMm}mm;
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: ${PAGE.widthMm}mm ${PAGE.heightMm}mm;
  z-index: 0;
}

/* Space reservation for the bands.
   Two mechanisms are needed and they do different jobs:
     - .wz-letterhead (above) PAINTS the artwork, repeating it on every page, full bleed.
     - this table RESERVES the vertical space on every page.
   Body padding cannot do the reserving: padding applies only to the first page, so content
   flowing onto page 2+ would start at the sheet top and be hidden under the header band.
   Chromium repeats thead/tfoot on every page and pushes content clear of them (FR-012). */
.wz-doc {
  position: relative;
  z-index: 1;
  width: 100%;
  border-collapse: collapse;
}

.wz-doc > thead > tr > td {
  height: ${BODY_PADDING.topMm}mm;
  border: 0;
  padding: 0;
}

.wz-doc > tfoot > tr > td {
  height: ${BODY_PADDING.bottomMm}mm;
  border: 0;
  padding: 0;
}

.wz-doc > tbody > tr > td {
  padding: 0 ${BODY_PADDING.sideMm}mm;
  border: 0;
  vertical-align: top;
}

/* ---------------- Document body ---------------- */

/* Centred on the page, not on the text column — matches the reference. */
.wz-title {
  font-size: 20pt;
  font-weight: 700;
  text-align: center;
  margin: 2mm 0 0;
  line-height: 1.1;
}

/* Every vertical gap below is a CSS margin tuned so the rendered *baselines* land on the
   reference's, measured from tmp/preview.pdf against docs/reference-letter-head.pdf. They are
   not the reference's baseline deltas directly: a margin runs between box edges, and the
   half-leading plus descent of a 10pt/1.2 line accounts for the ~1.1mm difference. */
.wz-prepared {
  margin: 1.3mm 0 0;
}

/* The reference sets the label bold and the recipient's name regular, then both title lines
   bold. Reproduced rather than normalised. */
.wz-prepared__label {
  font-weight: 700;
}

.wz-prepared__name {
  font-weight: 400;
}

.wz-prepared__role {
  font-weight: 700;
}

.wz-intro {
  margin: 6.9mm 0 0;
}

.wz-section {
  margin: 5.8mm 0 0;
}

/* font-size is set explicitly: these are <h2> elements, and the UA stylesheet would otherwise
   make them 1.5em. "Next Step" is 10pt in the reference — the same size as its body text. */
.wz-section__heading {
  font-size: 10pt;
  font-weight: 700;
  margin: 0;
}

/* "Why Whaz" is 14pt in the reference and sits well clear of the table; "Next Step" is 10pt,
   inherits the body size, and sits tight against its paragraph. Reproduced, not normalised. */
.wz-section--why {
  margin-top: 9.4mm;
}

.wz-section--why .wz-section__heading {
  font-size: 14pt;
  margin-bottom: 2.5mm;
}

.wz-section__body {
  margin: 0;
}

/* ---------------- Services table ---------------- */

.wz-table {
  width: ${TABLE.widthMm}mm;
  margin: 4.93mm auto 0;
  border-collapse: collapse;
  table-layout: fixed;
}

/* border-box so the row heights below are the reference's *total* row heights. With the default
   content-box a cell would be its stated height plus 2.2mm of padding on every row. The heights
   stay minimums, so a cell whose text wraps still grows instead of clipping. */
.wz-table th,
.wz-table td {
  box-sizing: border-box;
  border: ${TABLE.ruleWidthPt}pt solid ${TABLE.ruleColor};
  padding: 0.86mm 2.1mm;
  text-align: left;
  vertical-align: top;
  font-size: 10pt;
  line-height: 1.2;
}

.wz-table thead th {
  background: ${TABLE.headerFill};
  color: #ffffff;
  font-weight: 700;
  height: 8.1mm;
}

.wz-table tbody td {
  background: ${TABLE.bodyFill};
  color: #000000;
  font-weight: 400;
  height: 6.35mm;
}

.wz-table col.wz-col--challenge { width: ${COL_CHALLENGE}mm; }
.wz-table col.wz-col--solution  { width: ${COL_SOLUTION}mm; }
.wz-table col.wz-col--benefit   { width: ${COL_BENEFIT}mm; }

/* A row splitting across a page break would orphan its rules; keep each row whole. */
.wz-table tr {
  break-inside: avoid;
}
`.trim();

/** The full-bleed letterhead layer. Returns the artwork inlined, so the page fetches nothing. */
export function renderLetterhead(): string {
  return `<div class="wz-letterhead" style="background-image:url('${getLetterheadDataUri()}')"></div>`;
}
