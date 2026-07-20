import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeHtmlWithBreaks } from '../../lib/escape';

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

describe('escapeHtmlWithBreaks', () => {
  it('converts newlines to <br> after escaping', () => {
    expect(escapeHtmlWithBreaks('line one\nline two')).toBe('line one<br>line two');
  });

  it('normalises CRLF and CR line endings', () => {
    expect(escapeHtmlWithBreaks('a\r\nb\rc')).toBe('a<br>b<br>c');
  });

  it('keeps a rep-typed <br> literal — escaping must run first', () => {
    // If breaks were inserted before escaping, this would become a real line break.
    expect(escapeHtmlWithBreaks('<br>')).toBe('&lt;br&gt;');
  });

  it('escapes markup that spans a newline', () => {
    expect(escapeHtmlWithBreaks('<b>\nbold')).toBe('&lt;b&gt;<br>bold');
  });

  it('preserves blank lines between paragraphs', () => {
    expect(escapeHtmlWithBreaks('para one\n\npara two')).toBe('para one<br><br>para two');
  });
});
