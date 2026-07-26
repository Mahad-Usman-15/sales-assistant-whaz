import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../lib/escape';

describe('escapeHtml', () => {
  it('escapes all five structural characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('renders a script tag as inert literal text (FR-008)', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('does not double-escape an ampersand it just produced', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('handles empty input and leaves ordinary text untouched', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml('Northwind Consulting')).toBe('Northwind Consulting');
  });

  it('escapes an attribute-breaking payload', () => {
    expect(escapeHtml('" onload="evil()')).toBe('&quot; onload=&quot;evil()');
  });
});
