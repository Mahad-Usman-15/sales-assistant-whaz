import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVICE_CATALOG, FREE_SERVICES, PAID_SERVICES, CATALOG_IDS } from '../../lib/catalog';

/**
 * tools.md is the single source of truth for the catalog (FR-013). These tests are what stop
 * lib/catalog.ts from drifting when someone edits tools.md — the failure message points at
 * the constant that needs updating.
 */

/** Parses tools.md into { name, description, tier } entries. */
function parseToolsMd() {
  const raw = readFileSync('tools.md', 'utf8');
  const entries: { name: string; description: string; tier: 'free' | 'paid' }[] = [];

  let tier: 'free' | 'paid' | null = null;
  let pendingName: string | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;

    if (/^##\s+Free Tools/i.test(text)) {
      tier = 'free';
      continue;
    }
    if (/^##\s+Paid Tools/i.test(text)) {
      tier = 'paid';
      continue;
    }
    if (text.startsWith('#') || !tier) continue;

    // Entries are "- Name" followed by a description line. "Build OS" is missing its
    // leading "- " in tools.md, so a bare non-description line also starts an entry
    // (research.md R8).
    const bulletName = text.startsWith('- ') ? text.slice(2).trim() : null;

    if (bulletName !== null) {
      pendingName = bulletName;
    } else if (pendingName !== null) {
      entries.push({ name: pendingName, description: text, tier });
      pendingName = null;
    } else {
      pendingName = text;
    }
  }

  return entries;
}

const parsed = parseToolsMd();

describe('SERVICE_CATALOG matches tools.md', () => {
  it('has the same number of services', () => {
    expect(SERVICE_CATALOG.length).toBe(parsed.length);
  });

  it('contains 9 free and 8 paid services (17 total)', () => {
    // projectplan.md and CLAUDE.md say "7 paid" — a known off-by-one in those docs.
    // tools.md is authoritative (research.md R8).
    expect(FREE_SERVICES.length).toBe(9);
    expect(PAID_SERVICES.length).toBe(8);
    expect(SERVICE_CATALOG.length).toBe(17);
  });

  it.each(parsed)('matches "$name" verbatim', ({ name, description, tier }) => {
    const found = SERVICE_CATALOG.find((service) => service.name === name);
    expect(found, `"${name}" is in tools.md but missing from lib/catalog.ts`).toBeDefined();
    expect(found!.description).toBe(description);
    expect(found!.tier).toBe(tier);
  });

  it('has no service absent from tools.md', () => {
    const names = new Set(parsed.map((entry) => entry.name));
    const extra = SERVICE_CATALOG.filter((service) => !names.has(service.name));
    expect(extra.map((s) => s.name)).toEqual([]);
  });
});

describe('SERVICE_CATALOG invariants', () => {
  it('has unique ids', () => {
    expect(CATALOG_IDS.size).toBe(SERVICE_CATALOG.length);
  });

  it('uses slug-safe ids', () => {
    for (const service of SERVICE_CATALOG) {
      expect(service.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('carries no pricing field (FR-015)', () => {
    for (const service of SERVICE_CATALOG) {
      expect(Object.keys(service).sort()).toEqual([
        'benefit',
        'challenge',
        'description',
        'id',
        'name',
        'tier',
      ]);
    }
  });

  it('gives every service a non-empty challenge and benefit for the proposal table', () => {
    for (const service of SERVICE_CATALOG) {
      expect(service.challenge.trim().length).toBeGreaterThan(0);
      expect(service.benefit.trim().length).toBeGreaterThan(0);
    }
  });

  it('lists all free services before all paid ones, for deterministic rendering', () => {
    const tiers = SERVICE_CATALOG.map((s) => s.tier);
    expect(tiers.indexOf('paid')).toBe(tiers.lastIndexOf('free') + 1);
  });
});
