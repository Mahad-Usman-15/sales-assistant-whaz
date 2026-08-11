import 'server-only';
import { prisma } from '../db/client';
import { LastAdminError, NotFoundError } from '../errors';
import type { AdminActor } from '../auth/guard';
import type { Role, UserStatus } from '../../lib/rbac-schema';

/**
 * Member queries and mutations.
 *
 * ⚠️ Every function takes an `AdminActor` as its FIRST parameter. That type can only be produced by
 * `requireAdmin()` — its brand is a non-exported symbol — so calling any of these without having
 * passed the guard is a compile error rather than something a reviewer has to notice
 * (constitution Principle VI).
 *
 * The actor is not otherwise used by the read functions. That is deliberate: the parameter exists
 * to make authorization structural, and removing it "because it's unused" would remove the
 * guarantee.
 */

export interface Member {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  deactivatedAt: Date | null;
}

const MEMBER_FIELDS = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  deactivatedAt: true,
} as const;

/** Every member, active first, then oldest first. Unpaginated — see Assumption 13 (small team). */
export async function listMembers(_actor: AdminActor): Promise<Member[]> {
  return prisma.appUser.findMany({
    select: MEMBER_FIELDS,
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });
}

/** FR-019. "Active" means access is currently enabled, not "signed in recently" (Assumption 3). */
export async function countActiveMembers(_actor: AdminActor): Promise<number> {
  return prisma.appUser.count({ where: { status: 'ACTIVE' } });
}

/**
 * Changes a member's role and/or status — the SINGLE path for promotion, demotion, removal, and
 * restore (FR-030, FR-031, FR-032).
 *
 * ⚠️ Read history/adr/0003-last-admin-invariant-concurrency-control.md before editing this.
 *
 * The obvious implementation is wrong:
 *
 *     if (countActiveAdmins() > 1) { deactivate(target) }   // ← permits write skew
 *
 * Under Postgres' default READ COMMITTED, two Admins deactivating each other both read a count of
 * 2, both pass, both commit, and the organisation is left with zero Admins and no way back in.
 * Row locks do not help: the transactions never touch the same row, so there is nothing to
 * contend on. The thing being violated is a predicate, and predicates are not lockable objects at
 * this isolation level.
 *
 * ⚠️ `pg_advisory_xact_lock`, NEVER `pg_advisory_lock`. The session-scoped variant would leak onto
 * a Supavisor-pooled connection and be inherited by an unrelated later request — a permanent
 * deadlock that appears only in production, only under pooling, and only sometimes.
 *
 * The lock key is a constant, so ALL member mutations serialise against each other. That is correct
 * because the invariant is global; at single-digit admin changes per month the cost is nil.
 */
export async function updateMember(
  _actor: AdminActor,
  targetId: string,
  changes: { role?: Role; status?: UserStatus }
): Promise<Member> {
  return prisma.$transaction(
    async (tx) => {
      // FIRST statement. Everything below is now serialised against every other member mutation.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('app_user:admin_invariant'))`;

      const target = await tx.appUser.findUnique({
        where: { id: targetId },
        select: MEMBER_FIELDS,
      });
      if (!target) throw new NotFoundError('That member no longer exists.');

      const nextRole = changes.role ?? target.role;
      const nextStatus = changes.status ?? target.status;

      const wasActiveAdmin = target.role === 'ADMIN' && target.status === 'ACTIVE';
      const willBeActiveAdmin = nextRole === 'ADMIN' && nextStatus === 'ACTIVE';

      // Only a transition OUT of active-admin can break the invariant. Promotions and unrelated
      // edits skip the count entirely.
      if (wasActiveAdmin && !willBeActiveAdmin) {
        const remaining = await tx.appUser.count({
          where: { role: 'ADMIN', status: 'ACTIVE', id: { not: targetId } },
        });
        if (remaining === 0) throw new LastAdminError();
      }

      return tx.appUser.update({
        where: { id: targetId },
        data: {
          role: nextRole,
          status: nextStatus,
          // Audit trail: stamped on removal, cleared on restore.
          deactivatedAt: nextStatus === 'INACTIVE' ? (target.deactivatedAt ?? new Date()) : null,
        },
        select: MEMBER_FIELDS,
      });
    },
    // Raised from Prisma's 5s default: the lock serialises all member mutations, and contention
    // must not surface to an Admin as an opaque P2028 timeout.
    { timeout: 10_000 }
  );
}
