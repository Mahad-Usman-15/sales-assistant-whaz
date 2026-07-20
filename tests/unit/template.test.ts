import { describe, it, expect } from 'vitest';
import { buildProposalHtml } from '../../lib/template';
import { toViewModel } from '../../lib/view-model';
import type { ProposalInput } from '../../lib/schema';

const baseInput: ProposalInput = {
  recipientName: 'Ayesha Khan',
  clientCompany: 'Northwind Consulting',
  proposalTitle: 'Growth Partnership Proposal',
  preparedBy: 'Mahad Usman',
  proposalDate: '2026-07-19',
  selectedServiceIds: [],
  notes: '',
};

const html = (overrides: Partial<ProposalInput> = {}) =>
  buildProposalHtml(toViewModel({ ...baseInput, ...overrides }));

describe('buildProposalHtml — letter structure (FR-014)', () => {
  it('always includes salutation, closing and signature block', () => {
    const out = html();
    expect(out).toContain('Dear Ayesha Khan');
    expect(out).toContain('Northwind Consulting');
    expect(out).toContain('Growth Partnership Proposal');
    expect(out).toContain('Mahad Usman');
  });

  it('orders the fixed sections correctly', () => {
    const out = html({ notes: 'Some notes here' });
    const salutation = out.indexOf('Dear Ayesha Khan');
    const notes = out.indexOf('Some notes here');
    const signature = out.lastIndexOf('Mahad Usman');

    expect(salutation).toBeGreaterThan(-1);
    expect(notes).toBeGreaterThan(salutation);
    expect(signature).toBeGreaterThan(notes);
  });

  it('omits the notes section entirely when notes are empty', () => {
    expect(html()).not.toContain('data-section="notes"');
    expect(html({ notes: 'Present' })).toContain('data-section="notes"');
  });

  it('omits the services section entirely when none are selected', () => {
    expect(html()).not.toContain('data-section="services"');
  });

  it('renders a complete standalone HTML document', () => {
    const out = html();
    expect(out).toContain('<!DOCTYPE html>');
    expect(out).toContain('@page');
    expect(out).toContain('</html>');
  });
});

describe('buildProposalHtml — escaping (FR-008)', () => {
  it('renders injected markup as literal text', () => {
    const out = html({ notes: '<script>alert(1)</script>' });
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes markup in every rep-supplied field', () => {
    const out = html({ recipientName: '<b>Ayesha</b>', clientCompany: '"Northwind"' });
    expect(out).not.toContain('<b>Ayesha</b>');
    expect(out).toContain('&lt;b&gt;Ayesha&lt;/b&gt;');
    expect(out).toContain('&quot;Northwind&quot;');
  });

  it('converts newlines in notes to line breaks', () => {
    expect(html({ notes: 'one\ntwo' })).toContain('one<br>two');
  });
});

describe('buildProposalHtml — no pricing in v1 (FR-015)', () => {
  it('contains no currency symbols or price wording', () => {
    const out = html({ notes: 'Looking forward to it' });
    expect(out).not.toMatch(/[$£€]/);
    expect(out.toLowerCase()).not.toContain('price');
    expect(out.toLowerCase()).not.toContain('total:');
  });
});

describe('buildProposalHtml — determinism (FR-007)', () => {
  it('produces identical output for identical input', () => {
    expect(html({ notes: 'Same' })).toBe(html({ notes: 'Same' }));
  });

  it('formats the date locale-independently', () => {
    expect(html()).toContain('19 July 2026');
  });
});
