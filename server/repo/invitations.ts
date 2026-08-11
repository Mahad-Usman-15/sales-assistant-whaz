import 'server-only';
import { prisma } from '../db/client';
import { NotFoundError } from '../errors';
import type { AdminActor } from '../auth/guard';
import type { Role } from '../../lib/rbac-schema';

/**
 * Invitations — the server-owned carrier of an assigned role.
 *
 * ⚠️ This table is why a role cannot be forged. Supabase's `user_metadata` is writable by the
 * subject via `updateUser()`, so sourcing a role from it would let any user make themselves an
 * Admin. The database trigger reads the role from HERE and nowhere else (FR-010, FR-023).
 */

export const INVITATION_TTL_DAYS = 7;

export interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
  createdAt: Date;
  invitedByEmail: string | null;
}

/** Outstanding invitations only — accepted/expired/revoked ones are history, not a to-do list. */
export async function listPendingInvitations(_actor: AdminActor): Promise<PendingInvitation[]> {
  const rows = await prisma.invitation.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(({ invitedBy, ...rest }) => ({
    ...rest,
    invitedByEmail: invitedBy?.email ?? null,
  }));
}

export type InviteOutcome =
  | { ok: true; invitationId: string }
  | { ok: false; reason: 'already_member'; status: 'ACTIVE' | 'INACTIVE' }
  | { ok: false; reason: 'already_invited' };

/**
 * Records an invitation. Does NOT send the email — the action does that afterwards, deliberately,
 * so a send failure leaves a revocable PENDING row rather than an email with nothing behind it.
 *
 * ⚠️ Duplicate prevention is the partial unique index `invitation_email_pending_key`, not the
 * read below. Two Admins inviting the same address simultaneously collide on P2002; a
 * read-then-write check would let both through.
 */
export async function createInvitation(
  actor: AdminActor,
  email: string,
  role: Role
): Promise<InviteOutcome> {
  // FR-025: an existing member is a different situation from a duplicate invitation, and the Admin
  // needs to be told which — including whether that member is currently active, since the useful
  // next step for an inactive one is "restore", not "invite".
  const existing = await prisma.appUser.findUnique({
    where: { email },
    select: { status: true },
  });
  if (existing) return { ok: false, reason: 'already_member', status: existing.status };

  try {
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        invitedById: actor.id,
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    return { ok: true, invitationId: invitation.id };
  } catch (error) {
    // P2002 from the partial unique index: an outstanding invitation already exists (FR-024).
    if ((error as { code?: string }).code === 'P2002') return { ok: false, reason: 'already_invited' };
    throw error;
  }
}

/** FR-027. Idempotent: revoking an already-terminal invitation is not an error. */
export async function revokeInvitation(_actor: AdminActor, invitationId: string): Promise<void> {
  const result = await prisma.invitation.updateMany({
    where: { id: invitationId, status: 'PENDING' },
    data: { status: 'REVOKED' },
  });

  if (result.count === 0) {
    const exists = await prisma.invitation.count({ where: { id: invitationId } });
    if (exists === 0) throw new NotFoundError('That invitation no longer exists.');
    // Already accepted, expired or revoked — the caller's intent is satisfied either way.
  }
}
