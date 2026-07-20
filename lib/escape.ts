/**
 * The single HTML-escaping boundary for the PDF template (FR-008).
 *
 * Escaping happens at interpolation, never at input: that keeps exactly one place to audit
 * and makes double-encoding impossible. See research.md R6.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes every character that could alter document structure. Order-safe: `&` is handled by the same pass. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Escapes, then converts newlines to `<br>`.
 *
 * The order is load-bearing and is why this exists as its own function rather than being left to
 * callers: escaping first means a literal `<br>` typed by a rep stays literal text, while doing it
 * the other way round would let injected markup survive next to a generated break.
 */
export function escapeHtmlWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>');
}
