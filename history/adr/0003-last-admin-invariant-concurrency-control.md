# ADR-0003: Last-Admin Invariant and Concurrency Control

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted *(plan approved; implementation not yet started)*
- **Date:** 2026-08-01
- **Feature:** 002-rbac-dashboard
- **Context:** How the "at least one active Admin must always exist" rule is enforced, and how every
  administrative mutation is therefore structured.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Context

`dashboard.txt` states the rule in five words: *"must have one active admin."* FR-033 makes it
binding, and Constitution Principle VI generalises it: *"Invariants that span rows … MUST be enforced
under an explicit lock or a serializable transaction."*

**This ADR exists because the obvious implementation is wrong in a way that no ordinary test
detects.** The natural code is:

```
if (countActiveAdmins() > 1) { deactivate(target) }
```

Under Postgres' default **READ COMMITTED** isolation, two Admins acting simultaneously produce:

```
T1: SELECT count(*) WHERE role=ADMIN AND status=ACTIVE  -> 2  ✔ passes
T2: SELECT count(*) WHERE role=ADMIN AND status=ACTIVE  -> 2  ✔ passes
T1: UPDATE a2 SET status=INACTIVE     T2: UPDATE a1 SET status=INACTIVE
T1: COMMIT                            T2: COMMIT
→ 0 active admins. Nobody can ever administer the organisation again.
```

This is **write skew**. It is not fixable with row locks: the two transactions never touch the same
row, so there is no lock conflict to detect, and `SELECT ... FOR UPDATE` on the target row changes
nothing. The thing being violated is a *predicate*, and predicates are not lockable objects at this
isolation level.

The failure mode is severe and unrecoverable from inside the product: recovery is a manual SQL
`UPDATE` requiring Supabase console credentials (FR-036 deliberately provides no in-app break-glass).
And it is silent — **the broken implementation passes every single-threaded test that can be
written.** That combination is what makes this worth a permanent record rather than a code comment.

## Decision

Adopt **transaction-scoped advisory locking with a re-count inside the lock, through a single
mutation path**. These parts are one cluster; changing any of them changes the others:

- **Lock**: `pg_advisory_xact_lock(hashtext('app_user:admin_invariant'))`, taken as the first
  statement of a Prisma interactive transaction, before the count.
- **⚠️ Transaction-scoped, never session-scoped.** `pg_advisory_lock` (session variant) would leak
  onto a Supavisor-pooled connection and be inherited by an unrelated later request — a permanent
  deadlock that appears only in production. This is the single most dangerous mistake available in
  this design, and the migration and repository must both carry the warning in a comment.
- **Constant lock key.** The invariant is global, so the lock is global: all admin mutations
  serialise against each other. At single-digit admin changes per month, contention is nil.
- **Re-count inside the lock**, excluding the target row, then mutate.
- **One operation, not two**: `updateMember(actor, targetId, { role?, status? })` handles role change,
  removal, **and restore-with-role** (FR-032). There is deliberately no separate `deactivate` or
  `changeRole` path — two paths means two places to get the lock right, and the second gets added
  later by someone who did not read this.
- **Timeout raised to ~10 s** from Prisma's 5 s default, so lock contention does not surface as
  `P2028`. `P2028` maps to `503`, retryable.
- **Typed failure**: `LastAdminError` → **HTTP 409 Conflict** — a state conflict, not bad input (400)
  and not a server fault (500).
- **Statement-level trigger as a documented backstop**, explicitly *not* the primary mechanism.
- **Verification is part of the decision**: `tests/integration/db/last-admin.test.ts` must issue
  overlapping transactions on **two genuinely separate connections** against real Postgres, asserting
  exactly one succeeds and one raises. SC-004 makes this a spec-level criterion. Without it the
  invariant is *asserted, not verified*.

## Consequences

### Positive

- **The invariant actually holds under concurrency**, which is the only condition under which it was
  ever at risk.
- **No retry loop to write, test, or explain.** The lock serialises; callers never see a spurious
  failure they must handle.
- **One auditable code path** for every role and status change. Reviewing "can this break the
  invariant?" means reading one function.
- **Restore rides the same path for free** (FR-032), even though restoring can only raise the admin
  count and could never trip the invariant — uniformity beats a second, subtly different path.
- **Self-demotion and self-removal need no special case.** "At least one active Admin" already permits
  the sole-Admin handover (promote a successor, then leave) and forbids the dangerous version. A
  separate "you may not remove yourself" rule would have been both more code and *wrong* — it breaks
  the real scenario of an admin leaving the company.
- **The test is the deliverable.** Because the naive version passes everything else, a passing
  two-connection race test is the only meaningful evidence this works.

### Negative

- **Global serialisation of all admin mutations.** Two Admins editing unrelated members block each
  other briefly. Acceptable at this volume; would need a finer key at a much larger scale.
- **Advisory locks are invisible to schema inspection.** Nothing in `\d app_user` reveals the
  invariant — it lives in application code plus a backstop trigger. Discoverability depends on this
  ADR and the code comments.
- **The dangerous variant is one character away.** `pg_advisory_lock` vs `pg_advisory_xact_lock`
  differ by four letters and fail only in production, under pooling, non-deterministically.
- **Requires an interactive transaction**, which pins a pooled connection for its duration. Fine
  through Supavisor transaction mode for an explicit `BEGIN…COMMIT`, but it is a real resource hold.
- **The concurrency test needs real Postgres and cannot be unit-tested**, so it is slower and more
  fragile than the rest of the suite, and depends on `fullyParallel: false` staying set.

## Alternatives Considered

**Alternative A — `count() > 1` under READ COMMITTED.** The obvious implementation. Rejected: permits
write skew (see Context). Documented here rather than merely avoided, because it *looks* correct and
passes every test a developer would naturally write.

**Alternative B — `SELECT ... FOR UPDATE` on the target row.** Rejected: the transactions never
contend on the same row, so the lock is never contested. Solves nothing while appearing to.

**Alternative C — Partial unique index.** Rejected: unique indexes enforce *at most one*. The
invariant is *at least one*, which is not expressible as a uniqueness constraint.

**Alternative D — `CHECK` constraint.** Rejected: row-local. A `CHECK` cannot see other rows.

**Alternative E — Statement-level trigger alone.** Rejected as primary: under READ COMMITTED, T1's
trigger cannot see T2's uncommitted update, so both pass. Retained as a **backstop** for direct SQL
edits that bypass the application.

**Alternative F — `SERIALIZABLE` isolation.** Correct in principle, and the textbook answer to write
skew. Rejected on ergonomics: Prisma does not auto-retry `40001` serialization failures, so we would
own a retry loop, and surfacing "please try again" for an operation that happens twice a month is a
poor trade. Reconsider if admin mutation volume ever rises enough that global serialisation hurts.

**Alternative G — Forbid self-removal / self-demotion outright.** Rejected: it fails the real
scenario (sole admin leaves the company and hands over), and it adds a branch that can disagree with
the count. The invariant already covers every case correctly.

## References

- Feature Spec: [`specs/002-rbac-dashboard/spec.md`](../../specs/002-rbac-dashboard/spec.md) — FR-030…FR-034, SC-004, and the "Last Admin, contested simultaneously" edge case
- Implementation Plan: [`specs/002-rbac-dashboard/plan.md`](../../specs/002-rbac-dashboard/plan.md) — Risk #2
- Research: [`specs/002-rbac-dashboard/research.md`](../../specs/002-rbac-dashboard/research.md) — R7, R12
- Contracts: [`specs/002-rbac-dashboard/contracts/auth-and-admin.md`](../../specs/002-rbac-dashboard/contracts/auth-and-admin.md) — `updateMember`, `409 last_admin`
- Verification: [`specs/002-rbac-dashboard/quickstart.md`](../../specs/002-rbac-dashboard/quickstart.md) — Phase 4 gate
- Governing policy: `.specify/memory/constitution.md` v4.0.1 — Principle VI, cross-row invariants bullet
- Related ADRs: [ADR-0002](./0002-identity-and-authorization-architecture.md) (the architecture this invariant constrains)
- Evaluator Evidence: `history/prompts/002-rbac-dashboard/0003-plan-rbac-dashboard.prompt.md`
