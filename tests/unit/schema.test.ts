import { describe, it, expect } from 'vitest';
import { proposalInputSchema, collectFieldErrors } from '../../lib/schema';

const valid = {
  recipientName: 'Randy Newcomb',
  recipientRoleLine1: 'Senior Advisor, The Omidyar Group',
  recipientRoleLine2: 'Founding President & CEO, Humanity United',
  clientCompany: 'Humanity United',
  proposalDate: '2026-07-20',
  selectedServiceIds: ['clarity-map'],
};

const parse = (overrides: Record<string, unknown> = {}) =>
  proposalInputSchema.safeParse({ ...valid, ...overrides });

describe('proposalInputSchema — happy path', () => {
  it('accepts a complete payload', () => {
    expect(parse().success).toBe(true);
  });

  it('defaults optional fields when omitted', () => {
    const { selectedServiceIds: _s, recipientRoleLine2: _r, ...minimal } = valid;
    const result = proposalInputSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectedServiceIds).toEqual([]);
      expect(result.data.recipientRoleLine2).toBe('');
    }
  });

  it('trims surrounding whitespace from text fields', () => {
    const result = parse({ recipientName: '  Randy Newcomb  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.recipientName).toBe('Randy Newcomb');
  });
});

describe('proposalInputSchema — required fields (FR-009)', () => {
  const required = ['recipientName', 'recipientRoleLine1', 'clientCompany'] as const;

  it.each(required)('rejects an empty %s', (field) => {
    const result = parse({ [field]: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(collectFieldErrors(result.error)[field]).toBeTruthy();
  });

  it.each(required)('rejects a whitespace-only %s', (field) => {
    expect(parse({ [field]: '    ' }).success).toBe(false);
  });

  it('accepts a whitespace-only second role line, which is optional', () => {
    const result = parse({ recipientRoleLine2: '   ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.recipientRoleLine2).toBe('');
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
    ['recipientRoleLine1', 160],
    ['recipientRoleLine2', 160],
    ['clientCompany', 160],
  ] as const)('accepts %s at exactly %i characters', (field, max) => {
    expect(parse({ [field]: 'a'.repeat(max) }).success).toBe(true);
  });

  it.each([
    ['recipientName', 121],
    ['recipientRoleLine1', 161],
    ['recipientRoleLine2', 161],
    ['clientCompany', 161],
  ] as const)('rejects %s at %i characters', (field, over) => {
    expect(parse({ [field]: 'a'.repeat(over) }).success).toBe(false);
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
