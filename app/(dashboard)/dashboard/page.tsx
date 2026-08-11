import { Suspense } from 'react';
import Link from 'next/link';
import { requireUser, requireAdmin, type Actor, type AdminActor } from '@/server/auth/guard';
import { countOwnGenerations, countOrgGenerations } from '@/server/repo/generations';
import { countActiveMembers } from '@/server/repo/users';
import { StatCard } from '@/components/dashboard/StatCard';
import { LoadingSkeleton } from '@/components/dashboard/States';

/**
 * One route, branched by role — not two parallel dashboards.
 *
 * A Sales member navigating here should see *their* dashboard, not a 403. And the admin figures are
 * never FETCHED on that branch, so nothing sensitive reaches the RSC payload even though nothing
 * renders it (FR-009).
 */
export default async function DashboardPage() {
  const actor = await requireUser();

  return (
    <>
      <h1 className="font-display text-2xl text-foreground">Dashboard</h1>
      <p className="mt-1 text-muted">Signed in as {actor.email}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Each figure gets its own boundary: one slow or failing query must not blank the rest
            (FR-038). */}
        <Suspense fallback={<LoadingSkeleton className="h-28" />}>
          <OwnGenerations actor={actor} />
        </Suspense>

        {actor.role === 'ADMIN' && <AdminFigures />}
      </div>

      <p className="mt-8 text-sm text-muted">
        <Link href="/" className="underline hover:text-foreground">
          Generate a new proposal
        </Link>
      </p>
    </>
  );
}

async function OwnGenerations({ actor }: { actor: Actor }) {
  const count = await countOwnGenerations(actor);
  return (
    <StatCard
      label="Your proposals generated"
      value={count}
      // FR-037: zero is a deliberate state with an explanation, never a bare number.
      subline={count === 0 ? 'None yet — your first one will appear here.' : undefined}
    />
  );
}

/**
 * Admin-only figures. Re-derives an AdminActor rather than trusting the caller's branch — the type
 * system then guarantees the repo calls below cannot be reached by a Sales member, even if someone
 * later renders this component in the wrong place (Principle VI).
 */
async function AdminFigures() {
  const admin = await requireAdmin();
  return (
    <>
      <Suspense fallback={<LoadingSkeleton className="h-28" />}>
        <ActiveMembers actor={admin} />
      </Suspense>
      <Suspense fallback={<LoadingSkeleton className="h-28" />}>
        <OrgGenerations actor={admin} />
      </Suspense>
    </>
  );
}

async function ActiveMembers({ actor }: { actor: AdminActor }) {
  const count = await countActiveMembers(actor);
  return <StatCard label="Active members" value={count} />;
}

async function OrgGenerations({ actor }: { actor: AdminActor }) {
  const count = await countOrgGenerations(actor);
  return (
    <StatCard
      label="Proposals generated (all time)"
      value={count}
      subline={count === 0 ? 'No proposals generated yet.' : 'Includes members who have left.'}
    />
  );
}
