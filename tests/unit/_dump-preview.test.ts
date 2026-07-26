/**
 * Writes sample proposal documents to tmp/ so scripts/preview-chrome.mjs can screenshot them for
 * the fidelity review. Not assertion-bearing tests — they exist because vitest is the most
 * convenient way to execute the TypeScript template outside Next.js.
 *
 * Two documents, because they check different things:
 *   tmp/preview.html  — six services, one page. Diff its baselines against the reference.
 *   tmp/preview-all.html — all 17, the longest document the form can produce. Checks that the
 *                          table paginates and the letterhead repeats on page 2 (FR-012).
 *
 * Run with: npx vitest run tests/unit/_dump-preview.test.ts
 */
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildProposalHtml } from '../../lib/template';
import { toViewModel } from '../../lib/view-model';
import { SERVICE_CATALOG } from '../../lib/catalog';

const RECIPIENT = {
  // Mirrors the recipient block of docs/reference-letter-head.pdf so the screenshot can be
  // diffed against it directly.
  recipientName: 'Randy Newcomb',
  recipientRoleLine1: 'Senior Advisor, The Omidyar Group',
  recipientRoleLine2: 'Founding President & CEO, Humanity United',
  clientCompany: 'Humanity United',
  proposalDate: '2026-07-20',
};

it('writes a preview document', () => {
  const html = buildProposalHtml(
    toViewModel({
      ...RECIPIENT,
      selectedServiceIds: [
        'build-os',
        'growth-engine',
        'whaz-venture-blueprint',
        'whaz-compass',
        'deal-room',
        'launch-system',
      ],
    })
  );

  mkdirSync('tmp', { recursive: true });
  writeFileSync('tmp/preview.html', html, 'utf8');
});

it('writes an all-services preview document', () => {
  const html = buildProposalHtml(
    toViewModel({ ...RECIPIENT, selectedServiceIds: SERVICE_CATALOG.map((s) => s.id) })
  );

  mkdirSync('tmp', { recursive: true });
  writeFileSync('tmp/preview-all.html', html, 'utf8');
});
