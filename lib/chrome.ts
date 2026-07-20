import { BAND, BODY_PADDING, PAGE } from './geometry';

/**
 * The Whaz letterhead chrome, built in HTML/CSS/SVG.
 *
 * Constitution v2.0.0 Principle II: the letterhead was AI-generated and has no vector source,
 * so the reference rasters (docs/header.png, docs/footer.png) cannot be re-exported and must
 * never be bundled. Building the chrome in code makes it resolution-independent and keeps the
 * contact details as real selectable text. See research.md R1.
 *
 * Fidelity against docs/header.png and docs/footer.png is a required review step (T034) — the
 * geometry constants below are derived from measurements of those files.
 */

/* ------------------------------------------------------------------ *
 * Geometry measured from the reference artwork
 *
 * header.png: artwork rows 607-883 of 1492 (276px tall, 1054px wide)
 *   bottom edge sits at 91% of band height until x=20.4%, cuts diagonally
 *   down to 99% by x=25.1%, then runs straight to the right edge.
 * footer.png: artwork rows 664-827 (163px tall)
 *   top edge sits flush until x=48.4%, cuts down to 16% by x=52.7%.
 * ------------------------------------------------------------------ */
const HEADER_CLIP = 'polygon(0% 0%, 100% 0%, 100% 99%, 25.1% 99%, 20.4% 91%, 0% 91%)';
const FOOTER_CLIP = 'polygon(0% 0%, 48.4% 0%, 52.7% 16%, 100% 16%, 100% 100%, 0% 100%)';

const BAND_GRADIENT = 'linear-gradient(105deg, #111111 0%, #0a0436 100%)';
/** Thin lighter rule that traces the diagonal cut in the reference art. */
const EDGE_SHEEN = 'linear-gradient(105deg, #3b3570 0%, #4a4090 100%)';

const ICON = {
  envelope: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="#111111" stroke="none"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="#111111"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05 4.02 0 4.76 2.64 4.76 6.08V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21h-4z"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24" fill="#111111"><path d="M22 5.8c-.7.32-1.5.54-2.3.64a4 4 0 0 0 1.76-2.22c-.78.46-1.64.8-2.55.98a4 4 0 0 0-6.83 3.65A11.4 11.4 0 0 1 3.8 4.6a4 4 0 0 0 1.24 5.35c-.65-.02-1.27-.2-1.8-.5v.05a4 4 0 0 0 3.2 3.93c-.6.16-1.23.18-1.83.07a4 4 0 0 0 3.73 2.78A8 8 0 0 1 2 18.0a11.3 11.3 0 0 0 6.13 1.8c7.35 0 11.37-6.1 11.37-11.38l-.01-.52A8 8 0 0 0 22 5.8z"/></svg>`,
  /** Four-point sparkle used beside the wordmark and in the footer. */
  star: (fill: string) =>
    `<svg viewBox="0 0 24 24" fill="${fill}"><path d="M12 0c.6 6.2 5.2 10.8 12 12-6.8 1.2-11.4 5.8-12 12-.6-6.2-5.2-10.8-12-12C6.8 10.8 11.4 6.2 12 0z"/></svg>`,
};

/** Complete document CSS: page box, chrome bands, and body typography. */
export const CHROME_CSS = `
/* margin:0 so the bands can bleed to the sheet edges. Space for them is reserved by the
   thead/tfoot of .wz-doc instead of by body padding — see .wz-doc below. */
@page {
  size: A4;
  margin: 0;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  color: #111111;
  background: #ffffff;
  font-size: 11pt;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Space reservation for the chrome.
   Two mechanisms are needed and they do different jobs:
     - position:fixed (below) PAINTS the bands, repeating them on every page, full bleed.
     - this table RESERVES the vertical space on every page.
   Body padding cannot do the reserving: padding applies only to the first page, so content
   flowing onto page 2+ would start at the sheet top and be hidden under the header band.
   Chromium repeats thead/tfoot on every page and pushes content clear of them (FR-012). */
.wz-doc {
  width: 100%;
  border-collapse: collapse;
}

.wz-doc thead td {
  height: ${BODY_PADDING.topMm}mm;
  border: 0;
  padding: 0;
}

.wz-doc tfoot td {
  height: ${BODY_PADDING.bottomMm}mm;
  border: 0;
  padding: 0;
}

.wz-doc tbody td {
  padding: 0 ${BODY_PADDING.sideMm}mm;
  border: 0;
  vertical-align: top;
}

.wz-band {
  position: fixed;
  left: 0;
  width: ${PAGE.widthMm}mm;
  color: #ffffff;
  overflow: hidden;
}

.wz-band__sheen {
  position: absolute;
  inset: 0;
  background: ${EDGE_SHEEN};
}

.wz-band__fill {
  position: absolute;
  inset: 0;
  background: ${BAND_GRADIENT};
}

/* ---------------- Header ---------------- */

.wz-header {
  top: 0;
  height: ${BAND.headerMm}mm;
}

.wz-header .wz-band__sheen {
  clip-path: ${HEADER_CLIP};
}

.wz-header .wz-band__fill {
  /* Inset by a hair so the sheen layer shows only as a hairline along the cut. */
  bottom: 0.35mm;
  clip-path: ${HEADER_CLIP};
}

.wz-header__inner {
  position: relative;
  display: flex;
  align-items: center;
  height: 43mm;
  padding: 0 11mm 0 11mm;
}

.wz-wordmark {
  position: relative;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 30pt;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
  padding-right: 3mm;
}

.wz-wordmark__star {
  position: absolute;
  top: -1.5mm;
  right: 0.5mm;
  width: 4.2mm;
  height: 4.2mm;
}

.wz-divider {
  width: 0.28mm;
  height: 15mm;
  background: rgba(255, 255, 255, 0.28);
  margin: 0 7mm;
  flex: none;
}

.wz-tagline__primary {
  font-size: 8.6pt;
  letter-spacing: 0.19em;
  text-transform: uppercase;
  white-space: nowrap;
}

.wz-tagline__secondary {
  font-size: 8pt;
  color: #b9b9c6;
  margin-top: 1.6mm;
  white-space: nowrap;
}

/* Pushes the divider + contact block to the right edge, matching the reference layout. */
.wz-divider--contact {
  margin-left: auto;
  height: 18mm;
}

.wz-contact {
  display: flex;
  flex-direction: column;
  gap: 2.4mm;
}

.wz-contact__row {
  display: flex;
  align-items: center;
  gap: 2.6mm;
}

.wz-contact__rule {
  height: 0.22mm;
  background: rgba(255, 255, 255, 0.18);
}

.wz-contact__text {
  font-size: 8.8pt;
  white-space: nowrap;
}

.wz-icon {
  width: 4.6mm;
  height: 4.6mm;
  flex: none;
  display: block;
}

.wz-icon--chip {
  width: 5.4mm;
  height: 5.4mm;
  border-radius: 50%;
  background: #ffffff;
  padding: 1.15mm;
  flex: none;
}

.wz-icon--outline {
  width: 5.4mm;
  height: 5.4mm;
  border-radius: 1.4mm;
  border: 0.25mm solid rgba(255, 255, 255, 0.5);
  padding: 1.1mm;
  flex: none;
}

.wz-social {
  display: flex;
  align-items: center;
  gap: 1.8mm;
}

/* ---------------- Footer ---------------- */

.wz-footer {
  bottom: 0;
  height: ${BAND.footerMm}mm;
}

.wz-footer .wz-band__sheen {
  clip-path: ${FOOTER_CLIP};
}

.wz-footer .wz-band__fill {
  top: 0.35mm;
  clip-path: ${FOOTER_CLIP};
}

.wz-footer__inner {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 5mm 11mm 0;
}

.wz-footer__star {
  width: 6mm;
  height: 6mm;
  flex: none;
}

.wz-footer__divider {
  width: 0.28mm;
  height: 12mm;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 5mm;
  flex: none;
}

.wz-footer__headline {
  font-size: 8.2pt;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
}

.wz-footer__sub {
  font-size: 7.8pt;
  color: #b9b9c6;
  margin-top: 1.3mm;
  line-height: 1.45;
}

/* Dot-grid texture, bottom-right of the footer band. */
.wz-dotgrid {
  margin-left: auto;
  width: 34mm;
  height: 13mm;
  background-image: radial-gradient(rgba(255, 255, 255, 0.42) 0.22mm, transparent 0.22mm);
  background-size: 3.1mm 2.6mm;
  background-position: 0 0;
}

/* ---------------- Letter body ---------------- */

.wz-letter__meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 9.5pt;
  color: #666666;
  margin-bottom: 9mm;
}

.wz-letter__title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 17pt;
  line-height: 1.25;
  margin: 0 0 7mm;
  color: #111111;
}

.wz-letter__salutation {
  margin: 0 0 4mm;
}

.wz-letter__intro {
  margin: 0 0 7mm;
}

.wz-section {
  margin: 0 0 7mm;
  /* Keep a section heading from being orphaned at a page break. */
  break-inside: avoid;
}

.wz-section__heading {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 10pt;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: #0a0436;
  margin: 0 0 3.5mm;
  padding-bottom: 1.6mm;
  border-bottom: 0.3mm solid #e2e2ea;
}

.wz-services {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wz-service {
  padding: 2.6mm 0;
  border-bottom: 0.2mm solid #eeeef3;
  break-inside: avoid;
}

.wz-service:last-child {
  border-bottom: none;
}

.wz-service__name {
  font-weight: 600;
  font-size: 10.5pt;
}

.wz-service__tier {
  display: inline-block;
  margin-left: 2.4mm;
  padding: 0.5mm 2mm;
  border-radius: 1mm;
  font-size: 7.2pt;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  vertical-align: 0.4mm;
  background: #f0f0f5;
  color: #4a4470;
}

.wz-service__description {
  font-size: 9.6pt;
  color: #666666;
  margin-top: 0.9mm;
}

.wz-notes {
  white-space: normal;
}

.wz-letter__closing {
  margin: 8mm 0 0;
}

.wz-signature {
  margin-top: 9mm;
  break-inside: avoid;
}

.wz-signature__rule {
  width: 46mm;
  height: 0.3mm;
  background: #c9c9d4;
  margin-bottom: 2.2mm;
}

.wz-signature__name {
  font-weight: 600;
}

.wz-signature__org {
  font-size: 9.4pt;
  color: #666666;
}
`.trim();

/** Header band markup. Contact details are real text, never rasterised (Principle II). */
export function renderHeader(): string {
  return `
<header class="wz-band wz-header">
  <div class="wz-band__sheen"></div>
  <div class="wz-band__fill"></div>
  <div class="wz-header__inner">
    <div class="wz-wordmark">WHAZ<span class="wz-wordmark__star">${ICON.star('#ffffff')}</span></div>
    <div class="wz-divider"></div>
    <div>
      <div class="wz-tagline__primary">AI + Human Mind System</div>
      <div class="wz-tagline__secondary">Better Decisions. Real Growth.</div>
    </div>
    <div class="wz-divider wz-divider--contact"></div>
    <div class="wz-contact">
      <div class="wz-contact__row">
        <span class="wz-icon--outline">${ICON.envelope}</span>
        <span class="wz-contact__text">whazpk@gmail.com</span>
      </div>
      <div class="wz-contact__rule"></div>
      <div class="wz-contact__row">
        <span class="wz-social">
          <span class="wz-icon--chip">${ICON.instagram}</span>
          <span class="wz-icon--chip">${ICON.linkedin}</span>
          <span class="wz-icon--chip">${ICON.twitter}</span>
        </span>
        <span class="wz-contact__text">/thewhaz</span>
      </div>
    </div>
  </div>
</header>`.trim();
}

/** Footer band markup. */
export function renderFooter(): string {
  return `
<footer class="wz-band wz-footer">
  <div class="wz-band__sheen"></div>
  <div class="wz-band__fill"></div>
  <div class="wz-footer__inner">
    <span class="wz-footer__star">${ICON.star('#ffffff')}</span>
    <div class="wz-footer__divider"></div>
    <div>
      <div class="wz-footer__headline">Clarity. &nbsp;Strategy. &nbsp;Execution. &nbsp;Results.</div>
      <div class="wz-footer__sub">
        We combine AI insights with human intelligence<br>
        to help you make better decisions and build what matters.
      </div>
    </div>
    <div class="wz-dotgrid"></div>
  </div>
</footer>`.trim();
}
