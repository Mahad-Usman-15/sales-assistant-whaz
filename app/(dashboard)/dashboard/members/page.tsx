import { notFound } from 'next/navigation';
import { requireAdmin } from '@/server/auth/guard';
import { ForbiddenError } from '@/server/errors';
import { listMembers } from '@/server/repo/users';
import { listPendingInvitations } from '@/server/repo/invitations';
import { MembersTable } from '@/components/dashboard/MembersTable';
import { InviteDialog } from '@/components/dashboard/InviteDialog';
import { RoleBadge } from '@/components/dashboard/Badges';
import { EmptyState } from '@/components/dashboard/States';
import { RevokeInvitationButton } from '@/components/dashboard/RevokeInvitationButton';

/**
 * Member administration — Admin only (FR-009).
 *
 * ⚠️ The check is here, not only in the layout. A layout guard is convenience; this page must be
 * independently safe (Principle VI).
 *
 * ⚠️ A Sales member gets notFound(), NOT a 403. FR-011: a refusal must not disclose that the
 * resource exists.
 */
export default async function MembersPage() {
  let actor;
  try {
    actor = await requireAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const [members, invitations] = await Promise.all([
    listMembers(actor),
    listPendingInvitations(actor),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-foreground">Members</h1>
        <InviteDialog />
      </div>

      <section className="mt-6">
        <MembersTable members={members} currentUserId={actor.id} />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg text-foreground">Pending invitations</h2>
        <div className="mt-3">
          {invitations.length === 0 ? (
            <EmptyState
              title="No pending invitations."
              hint="Invited people appear here until they sign in for the first time."
            />
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="text-foreground">{invitation.email}</span>
                  <RoleBadge role={invitation.role} />
                  <span className="text-muted">
                    expires {invitation.expiresAt.toISOString().slice(0, 10)}
                  </span>
                  <span className="ml-auto">
                    <RevokeInvitationButton
                      invitationId={invitation.id}
                      email={invitation.email}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
