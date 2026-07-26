import { escapeHtml } from './escape';
import { getFontFaceCss } from './fonts';
import { CHROME_CSS, renderLetterhead } from './chrome';
import { DOC_TITLE, INTRO, NEXT_STEP, TABLE_HEADINGS, WHY_WHAZ } from './copy';
import type { ProposalViewModel } from './view-model';

/**
 * Assembles the complete proposal document as an HTML string.
 *
 * Structure mirrors docs/reference-letter-head.pdf: centred title, recipient block, intro,
 * three-column table, "Why Whaz", "Next Step". Everything except the recipient block and the
 * table rows is fixed copy from lib/copy.ts.
 *
 * Every rep-supplied value is escaped here, at the point of interpolation — the single FR-008
 * boundary (research.md R6). Nothing in this file makes a network request: the fonts and the
 * letterhead artwork are both inlined, so the render step is fully self-contained.
 */

function renderRecipient(vm: ProposalViewModel): string {
  const roles = vm.recipientRoles
    .map((role) => `\n    <span class="wz-prepared__role">${escapeHtml(role)}</span>`)
    .join('<br>');

  return `
  <p class="wz-prepared">
    <span class="wz-prepared__label">Prepared for:</span><span class="wz-prepared__name"> ${escapeHtml(vm.recipientName)}</span>${roles ? '<br>' + roles : ''}
  </p>`;
}

function renderServicesTable(vm: ProposalViewModel): string {
  if (!vm.hasServices) return '';

  const rows = vm.services
    .map(
      (service) => `
      <tr>
        <td>${escapeHtml(service.challenge)}</td>
        <td>${escapeHtml(service.name)}</td>
        <td>${escapeHtml(service.benefit)}</td>
      </tr>`
    )
    .join('');

  const headings = TABLE_HEADINGS.map((heading) => `<th>${heading}</th>`).join('');

  return `
  <table class="wz-table">
    <colgroup>
      <col class="wz-col--challenge">
      <col class="wz-col--solution">
      <col class="wz-col--benefit">
    </colgroup>
    <thead><tr>${headings}</tr></thead>
    <tbody>${rows}
    </tbody>
  </table>`;
}

export function buildProposalHtml(vm: ProposalViewModel): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${DOC_TITLE}</title>
<style>
${getFontFaceCss()}
${CHROME_CSS}
</style>
</head>
<body>
${renderLetterhead()}

<!-- The thead/tfoot rows are empty on purpose: they exist only to reserve vertical space for
     the fixed letterhead bands on every page. See .wz-doc in lib/chrome.ts. -->
<table class="wz-doc">
<thead><tr><td></td></tr></thead>
<tfoot><tr><td></td></tr></tfoot>
<tbody><tr><td>

  <h1 class="wz-title">${DOC_TITLE}</h1>
${renderRecipient(vm)}

  <p class="wz-intro">${INTRO}</p>
${renderServicesTable(vm)}

  <section class="wz-section wz-section--why">
    <h2 class="wz-section__heading">${WHY_WHAZ.heading}</h2>
    <p class="wz-section__body">${WHY_WHAZ.body}</p>
  </section>

  <section class="wz-section wz-section--next">
    <h2 class="wz-section__heading">${NEXT_STEP.heading}</h2>
    <p class="wz-section__body">${NEXT_STEP.body}</p>
  </section>

</td></tr></tbody>
</table>
</body>
</html>`;
}
