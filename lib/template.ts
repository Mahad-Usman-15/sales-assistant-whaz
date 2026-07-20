import { escapeHtml } from './escape';
import { getFontFaceCss } from './fonts';
import { CHROME_CSS, renderHeader, renderFooter } from './chrome';
import type { ProposalViewModel } from './view-model';

/**
 * Assembles the complete proposal document as an HTML string.
 *
 * Every rep-supplied value is escaped here, at the point of interpolation — the single
 * FR-008 boundary (research.md R6). Nothing in this file makes a network request: fonts are
 * inlined and the chrome is CSS, so the render step is fully self-contained.
 */

function renderServices(vm: ProposalViewModel): string {
  if (!vm.hasServices) return '';

  const items = vm.services
    .map(
      (service) => `
      <li class="wz-service">
        <div class="wz-service__name">${escapeHtml(service.name)}<span class="wz-service__tier">${service.tier}</span></div>
        <div class="wz-service__description">${escapeHtml(service.description)}</div>
      </li>`
    )
    .join('');

  return `
    <section class="wz-section" data-section="services">
      <h2 class="wz-section__heading">Services Included</h2>
      <ul class="wz-services">${items}
      </ul>
    </section>`;
}

function renderNotes(vm: ProposalViewModel): string {
  if (!vm.hasNotes) return '';

  return `
    <section class="wz-section" data-section="notes">
      <h2 class="wz-section__heading">Additional Notes</h2>
      <div class="wz-notes">${vm.notesHtml}</div>
    </section>`;
}

export function buildProposalHtml(vm: ProposalViewModel): string {
  const recipient = escapeHtml(vm.recipientName);
  const company = escapeHtml(vm.clientCompany);
  const title = escapeHtml(vm.proposalTitle);
  const author = escapeHtml(vm.preparedBy);
  const date = escapeHtml(vm.formattedDate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
${getFontFaceCss()}
${CHROME_CSS}
</style>
</head>
<body>
${renderHeader()}
${renderFooter()}

<!-- The thead/tfoot rows are empty on purpose: they exist only to reserve vertical space for
     the fixed bands on every page. See .wz-doc in lib/chrome.ts. -->
<table class="wz-doc">
<thead><tr><td></td></tr></thead>
<tfoot><tr><td></td></tr></tfoot>
<tbody><tr><td>

  <div class="wz-letter__meta">
    <span>${company}</span>
    <span>${date}</span>
  </div>

  <h1 class="wz-letter__title">${title}</h1>

  <p class="wz-letter__salutation">Dear ${recipient},</p>

  <p class="wz-letter__intro">
    Thank you for considering Whaz. We have prepared the following proposal for ${company},
    outlining how we can support your goals.
  </p>
${renderServices(vm)}
${renderNotes(vm)}
  <p class="wz-letter__closing">
    We would be glad to discuss any part of this proposal in more detail, and we look forward
    to working with you.
  </p>

  <div class="wz-signature">
    <div class="wz-signature__rule"></div>
    <div class="wz-signature__name">${author}</div>
    <div class="wz-signature__org">Whaz &mdash; AI + Human Mind System</div>
  </div>

</td></tr></tbody>
</table>
</body>
</html>`;
}
