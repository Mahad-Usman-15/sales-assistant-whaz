import { z } from 'zod';

/**
 * The single source of validation truth, shared by the client form and the API route
 * (research.md R6). The server re-validates independently — the client is not a trust boundary.
 */

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const proposalInputSchema = z.object({
  recipientName: requiredText('Recipient name', 120),
  clientCompany: requiredText('Client company', 160),
  proposalTitle: requiredText('Proposal title', 200),
  preparedBy: requiredText('Prepared by', 120),
  proposalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Enter a valid date.'),
  selectedServiceIds: z.array(z.string()).default([]),
  notes: z.string().max(5000, 'Notes must be 5000 characters or fewer.').default(''),
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
