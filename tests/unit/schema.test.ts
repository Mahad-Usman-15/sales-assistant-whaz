import { describe, it, expect } from 'vitest';
import { proposalInputSchema, collectFieldErrors } from '../../lib/schema';

const valid = {
  recipientName: 'Ayesha Khan',
  clientCompany: 'Northwind Consulting',
  proposalTitle: 'Growth Partnership Proposal',
  preparedBy: 'Mahad Usman',
  proposalDate: '2026-07-20',
  selectedServiceIds: ['clarity-map'],
  notes: 'Some notes',
};

const parse = (overrides: Record<string, unknown> = {}) =>
  proposalInputSchema.safeParse({ ...valid, ...overrides });

describe('proposalInputSchema — happy path', () => {
  it('accepts a complete payload', () => {
    expect(parse().success).toBe(true);
  });

  it('defaults optional fields when omitted', () => {
    const { selectedServiceIds: _s, notes: _n, ...minimal } = valid;
    const result = proposalInputSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectedServiceIds).toEqual([]);
      expect(result.data.notes).toBe('');
    }
  });

  it('trims surrounding whitespace from text fields', () => {
    const result = parse({ recipientName: '  Ayesha Khan  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.recipientName).toBe('Ayesha Khan');
  });
});

describe('proposalInputSchema — required fields (FR-009)', () => {
  const required = ['recipientName', 'clientCompany', 'proposalTitle', 'preparedBy'] as const;

  it.each(required)('rejects an empty %s', (field) => {
    const result = parse({ [field]: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(collectFieldErrors(result.error)[field]).toBeTruthy();
  });

  it.each(required)('rejects a whitespace-only %s', (field) => {
    expect(parse({ [field]: '    ' }).success).toBe(false);
  });

  it('reports every failing field at once, not just the first', () => {
    const result = parse({ recipientName: '', clientCompany: '', proposalDate: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(collectFieldErrors(result.error)).sort()).toEqual([
        'clientCompany',
        'proposalDate',
        'recipientName',
      ]);
    }
  });
});

describe('proposalInputSchema — length boundaries', () => {
  it.each([
    ['recipientName', 120],
    ['clientCompany', 160],
    ['proposalTitle', 200],
    ['preparedBy', 120],
  ] as const)('accepts %s at exactly %i characters', (field, max) => {
    expect(parse({ [field]: 'a'.repeat(max) }).success).toBe(true);
  });

  it.each([
    ['recipientName', 121],
    ['clientCompany', 161],
    ['proposalTitle', 201],
    ['preparedBy', 121],
  ] as const)('rejects %s at %i characters', (field, over) => {
    expect(parse({ [field]: 'a'.repeat(over) }).success).toBe(false);
  });

  it('accepts notes at exactly 5000 characters and rejects 5001', () => {
    expect(parse({ notes: 'a'.repeat(5000) }).success).toBe(true);
    expect(parse({ notes: 'a'.repeat(5001) }).success).toBe(false);
  });
});

describe('proposalInputSchema — date', () => {
  it.each(['2026-07-20', '2026-01-01', '2026-12-31'])('accepts %s', (date) => {
    expect(parse({ proposalDate: date }).success).toBe(true);
  });

  it.each(['20-07-2026', '2026/07/20', '2026-7-20', 'today', '', '2026-13-45'])(
    'rejects %s',
    (date) => {
      expect(parse({ proposalDate: date }).success).toBe(false);
    }
  );
});

describe('proposalInputSchema — services', () => {
  it('accepts an empty selection', () => {
    expect(parse({ selectedServiceIds: [] }).success).toBe(true);
  });

  it('rejects a non-array selection', () => {
    expect(parse({ selectedServiceIds: 'clarity-map' }).success).toBe(false);
  });

  // Unknown-id and duplicate rejection happen in the route, against the live catalog —
  // see tests/integration/generate.spec.ts case 5.
});
