/**
 * Writes a sample proposal document to tmp/ so scripts/preview-chrome.mjs can screenshot it
 * for the T034 fidelity review. Not an assertion-bearing test — it exists because vitest is
 * the most convenient way to execute the TypeScript template outside Next.js.
 *
 * Run with: npx vitest run tests/unit/_dump-preview.test.ts
 */
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildProposalHtml } from '../../lib/template';
import { toViewModel } from '../../lib/view-model';

it('writes a preview document', () => {
  const html = buildProposalHtml(
    toViewModel({
      recipientName: 'Ayesha Khan',
      clientCompany: 'Northwind Consulting',
      proposalTitle: 'Growth Partnership Proposal',
      preparedBy: 'Mahad Usman',
      proposalDate: '2026-07-20',
      selectedServiceIds: ['clarity-map', 'growth-engine', 'deal-room'],
      notes:
        'Following our call on Tuesday, this proposal covers the scope we discussed.\n\nWe can begin onboarding next month.',
    })
  );

  mkdirSync('tmp', { recursive: true });
  writeFileSync('tmp/preview.html', html, 'utf8');
});
