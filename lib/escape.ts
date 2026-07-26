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
