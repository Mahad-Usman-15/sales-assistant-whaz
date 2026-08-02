import { z } from 'zod';

/**
 * Validation shared by the dashboard's client components and the Server Actions behind them,
 * following the same posture as lib/schema.ts: one definition, re-validated independently on the
 * server, with the client copy treated as UX rather than a trust boundary.
 *
 * ⚠️ This module MUST NOT import the generated Prisma `Role` enum. It is imported by client
 * components, and pulling `generated/prisma` into that graph drags the Prisma client into the
 * browser bundle. The tuple below is the client-safe source of truth; tests/unit/role-enum-parity
 * asserts it stays set-equal to the Prisma enum, so drift fails a test rather than production.
 */

export const ROLES = ['ADMIN', 'SALES'] as const;
export const USER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type Role = (typeof ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export const roleSchema = z.enum(ROLES, { message: 'Choose a role.' });
export const userStatusSchema = z.enum(USER_STATUSES, { message: 'Choose a status.' });

/**
 * Addresses differing only in case or surrounding whitespace are the same person (FR-028).
 * Normalising here rather than at the call site means every path — form, Server Action, bootstrap
 * script — agrees, and matches the `citext` column that enforces it in the database.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email address is required.')
  .max(254, 'Email address must be 254 characters or fewer.')
  .pipe(z.email('Enter a valid email address.'));

export const inviteInputSchema = z.object({
  email: emailSchema,
  role: roleSchema,
});

/**
 * One shape for role change, removal, and restore — deliberately not three (ADR-0003). Both
 * fields are optional, but at least one must be present, or the caller has asked for nothing.
 */
export const updateMemberInputSchema = z
  .object({
    userId: z.uuid('Select a member.'),
    role: roleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: 'Nothing to change.',
    path: ['_form'],
  });

export const revokeInvitationInputSchema = z.object({
  invitationId: z.uuid('Select an invitation.'),
});

export type InviteInput = z.infer<typeof inviteInputSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberInputSchema>;
export type RevokeInvitationInput = z.infer<typeof revokeInvitationInputSchema>;
