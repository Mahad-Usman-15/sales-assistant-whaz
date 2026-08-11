'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, requireAdmin } from '@/server/auth/guard';
import { createServerSupabase } from '@/server/auth/supabase';
import { createAdminSupabase } from '@/server/auth/admin';
import { createInvitation, revokeInvitation } from '@/server/repo/invitations';
import { updateMember } from '@/server/repo/users';
import { LastAdminError, NotFoundError } from '@/server/errors';
import {
  inviteInputSchema,
  updateMemberInputSchema,
  revokeInvitationInputSchema,
} from '@/lib/rbac-schema';
import { collectFieldErrors } from '@/lib/schema';

/**
 * ⚠️ SERVER ACTIONS ARE PUBLIC HTTP ENDPOINTS. Next generates a stable id for each one and anyone
 * can POST to it. "It's only rendered inside the admin layout" is NOT authorization — that is the
 * single most common RBAC hole in App Router codebases.
 *
 * Every action below therefore opens with its own `requireAdmin()`. The layout's check is a
 * convenience for rendering, nothing more (constitution Principle VI, FR-008).
 */

export interface ActionState {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
}

/** FR-007. A form POST, not a link: Server Actions are CSRF-safe by construction. */
export async function signOut(): Promise<never> {
  await requireUser();
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}

/** FR-022, FR-023, FR-024, FR-025. */
export async function inviteUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireAdmin();

  const parsed = inviteInputSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { fields: collectFieldErrors(parsed.error) };

  const { email, role } = parsed.data;
  const outcome = await createInvitation(actor, email, role);

  if (!outcome.ok) {
    if (outcome.reason === 'already_member') {
      return {
        fields: {
          email:
            outcome.status === 'ACTIVE'
              ? 'That person is already an active member.'
              : 'That person is already a member, but their access was removed. Restore them from the members list instead.',
        },
      };
    }
    return { fields: { email: 'That address already has an outstanding invitation.' } };
  }

  // Row first, send second. A send failure leaves a PENDING row an Admin can revoke and re-issue,
  // which is strictly better than an email with nothing backing it.
  const { error } = await createAdminSupabase().auth.admin.inviteUserByEmail(email);
  if (error) {
    console.error('[inviteUser] invitation recorded but email failed:', error.message);
    revalidatePath('/dashboard/members');
    return {
      message:
        'Invitation recorded, but the email could not be sent. Revoke and try again, or check email settings.',
    };
  }

  revalidatePath('/dashboard/members');
  return { ok: true, message: `Invitation sent to ${email}.` };
}

/** FR-030, FR-031, FR-032 — one action for role change, removal and restore. */
export async function updateMemberAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireAdmin();

  const role = formData.get('role');
  const status = formData.get('status');
  const parsed = updateMemberInputSchema.safeParse({
    userId: formData.get('userId'),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  });
  if (!parsed.success) return { fields: collectFieldErrors(parsed.error) };

  const { userId, ...changes } = parsed.data;

  try {
    await updateMember(actor, userId, changes);
  } catch (error) {
    // 409-equivalent: a state conflict, not bad input and not a server fault (FR-033).
    if (error instanceof LastAdminError) {
      return {
        fields: {
          _form:
            'There must always be at least one active Admin. Promote someone else first, then try again.',
        },
      };
    }
    if (error instanceof NotFoundError) {
      return { fields: { _form: 'That member no longer exists.' } };
    }
    // P2028 — the advisory lock could not be acquired within the transaction timeout.
    if ((error as { code?: string }).code === 'P2028') {
      return { fields: { _form: 'Another change is in progress. Please try again in a moment.' } };
    }
    throw error;
  }

  revalidatePath('/dashboard/members');
  revalidatePath('/dashboard');
  return { ok: true };
}

/** FR-027. */
export async function revokeInvitationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireAdmin();

  const parsed = revokeInvitationInputSchema.safeParse({
    invitationId: formData.get('invitationId'),
  });
  if (!parsed.success) return { fields: collectFieldErrors(parsed.error) };

  try {
    await revokeInvitation(actor, parsed.data.invitationId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { fields: { _form: 'That invitation no longer exists.' } };
    }
    throw error;
  }

  revalidatePath('/dashboard/members');
  return { ok: true };
}
