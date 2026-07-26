import { describe, it, expect } from 'vitest';
import { buildProposalHtml } from '../../lib/template';
import { toViewModel } from '../../lib/view-model';
import { DOC_TITLE, INTRO, NEXT_STEP, TABLE_HEADINGS, WHY_WHAZ } from '../../lib/copy';
import { SERVICE_CATALOG } from '../../lib/catalog';
import type { ProposalInput } from '../../lib/schema';

const baseInput: ProposalInput = {
  recipientName: 'Randy Newcomb',
  recipientRoleLine1: 'Senior Advisor, The Omidyar Group',
  recipientRoleLine2: 'Founding President & CEO, Humanity United',
  clientCompany: 'Humanity United',
  proposalDate: '2026-07-19',
  selectedServiceIds: [],
};

const html = (overrides: Partial<ProposalInput> = {}) =>
  buildProposalHtml(toViewModel({ ...baseInput, ...overrides }));

/**
 * The letterhead is inlined as a ~576KB base64 data URI. Content assertions that scan the whole
 * document for a substring would be testing that payload as much as the copy, so strip it first.
 */
const copyOnly = (out: string) => out.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, '');

/**
 * Structural assertions must look at the markup only. The stylesheet in <head> mentions the same
 * class names and quotes the same section headings in comments, so searching the whole document
 * finds CSS before it finds content.
 */
const bodyOf = (out: string) => out.slice(out.indexOf('<body>'));

/** Rows in the services table, excluding its heading row. Returns 0 when the table is absent. */
function serviceRowCount(out: string): number {
  const table = /<table class="wz-table">[\s\S]*?<\/table>/.exec(bodyOf(out))?.[0];
  if (!table) return 0;
  return (table.match(/<tr>/g) ?? []).length - 1;
}

describe('buildProposalHtml — reference document structure', () => {
  it('renders the fixed blocks in the reference’s order', () => {
    const out = bodyOf(html({ selectedServiceIds: ['build-os'] }));

    const positions = [
      out.indexOf(`<h1 class="wz-title">${DOC_TITLE}</h1>`),
      out.indexOf('Prepared for:'),
      out.indexOf(INTRO),
      out.indexOf('<table class="wz-table">'),
      out.indexOf(WHY_WHAZ.heading),
      out.indexOf(NEXT_STEP.heading),
    ];

    for (const position of positions) expect(position).toBeGreaterThan(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('renders the recipient name and both role lines', () => {
    const out = html();
    expect(out).toContain('Randy Newcomb');
    expect(out).toContain('Senior Advisor, The Omidyar Group');
    expect(out).toContain('Founding President &amp; CEO, Humanity United');
  });

  it('omits the second role line when it is blank', () => {
    const out = bodyOf(html({ recipientRoleLine2: '' }));
    expect(out).toContain('Senior Advisor, The Omidyar Group');
    expect((out.match(/wz-prepared__role/g) ?? []).length).toBe(1);
    expect(bodyOf(html()).match(/wz-prepared__role/g)).toHaveLength(2);
  });

  it('carries the fixed prose verbatim from lib/copy.ts', () => {
    const out = html();
    expect(out).toContain(INTRO);
    expect(out).toContain(WHY_WHAZ.body);
    expect(out).toContain(NEXT_STEP.body);
  });

  it('paints the letterhead as a full-bleed layer', () => {
    expect(html()).toContain('class="wz-letterhead"');
    expect(html()).toContain('data:image/png;base64,');
  });

  it('renders a complete standalone HTML document', () => {
    const out = html();
    expect(out).toContain('<!DOCTYPE html>');
    expect(out).toContain('@page');
    expect(out).toContain('</html>');
  });
});

describe('buildProposalHtml — services table', () => {
  it('omits the table entirely when no services are selected', () => {
    expect(bodyOf(html())).not.toContain('<table class="wz-table">');
    expect(serviceRowCount(html())).toBe(0);
  });

  it('renders the three reference column headings', () => {
    const out = html({ selectedServiceIds: ['build-os'] });
    for (const heading of TABLE_HEADINGS) expect(out).toContain(`<th>${heading}</th>`);
  });

  it('renders one row per selected service, challenge/solution/benefit', () => {
    const out = html({ selectedServiceIds: ['build-os', 'growth-engine'] });
    const buildOs = SERVICE_CATALOG.find((s) => s.id === 'build-os')!;

    expect(out).toContain(`<td>${buildOs.challenge}</td>`);
    expect(out).toContain(`<td>${buildOs.name}</td>`);
    expect(out).toContain(`<td>${buildOs.benefit}</td>`);
    expect(serviceRowCount(out)).toBe(2);
  });

  it('orders rows by catalog position, not selection order (FR-007)', () => {
    const out = bodyOf(html({ selectedServiceIds: ['growth-engine', 'clarity-map'] }));
    expect(out.indexOf('Clarity Map')).toBeLessThan(out.indexOf('Growth Engine'));
  });

  it('renders every catalog service without error', () => {
    const out = html({ selectedServiceIds: SERVICE_CATALOG.map((s) => s.id) });
    expect(serviceRowCount(out)).toBe(SERVICE_CATALOG.length);
  });
});

describe('buildProposalHtml — escaping (FR-008)', () => {
  it('renders injected markup as literal text', () => {
    const out = html({ recipientName: '<script>alert(1)</script>' });
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes markup in every rep-supplied field', () => {
    const out = html({ recipientName: '<b>Randy</b>', recipientRoleLine1: '"Advisor"' });
    expect(out).not.toContain('<b>Randy</b>');
    expect(out).toContain('&lt;b&gt;Randy&lt;/b&gt;');
    expect(out).toContain('&quot;Advisor&quot;');
  });
});

describe('buildProposalHtml — no pricing in v1 (FR-015)', () => {
  it('contains no currency symbols or price wording', () => {
    const out = copyOnly(html({ selectedServiceIds: SERVICE_CATALOG.map((s) => s.id) }));
    expect(out).not.toMatch(/[$£€]/);
    expect(out.toLowerCase()).not.toContain('price');
    expect(out.toLowerCase()).not.toContain('total:');
  });
});

describe('buildProposalHtml — determinism (FR-007)', () => {
  it('produces identical output for identical input', () => {
    expect(html({ selectedServiceIds: ['build-os'] })).toBe(
      html({ selectedServiceIds: ['build-os'] })
    );
  });

  it('does not vary with the proposal date, which is not rendered', () => {
    expect(html({ proposalDate: '2026-01-01' })).toBe(html({ proposalDate: '2030-12-31' }));
  });
});
