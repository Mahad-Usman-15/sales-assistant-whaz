import { z } from 'zod';

/**
 * The single source of validation truth, shared by the client form and the API route
 * (research.md R6). The server re-validates independently — the client is not a trust boundary.
 *
 * The document's structure and prose are fixed (see lib/copy.ts); only the recipient block and
 * the selected services vary, so the form is deliberately small.
 */

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .default('');

export const proposalInputSchema = z.object({
  recipientName: requiredText('Recipient name', 120),
  /** Rendered bold beneath the name, e.g. "Senior Advisor, The Omidyar Group". */
  recipientRoleLine1: requiredText('Recipient role', 160),
  /** Optional second role line, e.g. "Founding President & CEO, Humanity United". */
  recipientRoleLine2: optionalText('Second recipient role', 160),
  /**
   * Not rendered on the page — the reference document shows no company line. Retained because
   * it is the download filename's slug (lib/filename.ts).
   */
  clientCompany: requiredText('Client company', 160),
  /**
   * Not rendered on the page. Retained because lib/pdf.ts pins the PDF's /CreationDate and
   * /ModDate to it, which is what makes identical input produce byte-identical output (FR-007).
   */
  proposalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Enter a valid date.'),
  selectedServiceIds: z.array(z.string()).default([]),
});

export type ProposalInput = z.infer<typeof proposalInputSchema>;

/** Field-keyed error messages, with every failing field reported at once (FR-009). */
export type FieldErrors = Record<string, string>;

export function collectFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    // Keep the first message per field: later issues on the same field are usually
    // consequences of the first and would only add noise for the rep.
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
