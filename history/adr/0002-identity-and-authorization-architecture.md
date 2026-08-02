# ADR-0002: Identity and Authorization Architecture

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted *(plan approved; constitution amended to permit it; implementation not yet started)*
- **Date:** 2026-08-01
- **Feature:** 002-rbac-dashboard
- **Context:** How members are identified, where authorization is enforced, and how identity data is
  stored — for a tool that until now had no users, no sessions, and no database at all.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Context

The proposal generator has been anonymous by design. `dashboard.txt` requires two roles, per-member
and organisation-wide generation counts, and member administration — every one of which needs
identity, and identity needs persistence.

This was **forbidden** until 2026-08-01. Constitution v3.0.0 Principle III required the pipeline to
remain "stateless, with no required database, authentication, or persistent storage," and Technology
Constraints said flatly "**Data**: No database in v1." The amendment to **v4.0.0** redefined
Principle III as *Additive Extension* and added **Principle VI** (*Authorization Is Server-Enforced,
on Every Request, from Live State*) specifically to govern this work. It landed **before any code was
written** — the ordering Governance demands, and the first time in this project that ordering was
achieved rather than recovered from.

Constraints in force: $0 recurring cost (Principle V); the render path must touch no datastore or
network during a render (Principle III); the PDF must remain byte-identical (FR-013); Node runtime
only, never Edge.

Two facts discovered during Phase 0 research changed the shape of this decision and are the main
reason this ADR is worth reading later:

1. **Supabase's session controls — time-box and inactivity timeout — are Pro Plan and above**, and
   free-tier sessions last **indefinitely**. FR-041's 30-day window could not be bought at $0.
2. **`shouldCreateUser: false` leaks membership.** The intuitive way to honour "no self-service
   registration" makes the provider error on unknown addresses, turning the sign-in form into a staff
   enumerator (FR-043).

## Decision

Adopt a **single-vendor identity-and-data platform with authorization in application code**. These
components are integrated and would change together:

- **Authentication**: Supabase Auth, passwordless emailed magic link (`signInWithOtp`) via
  `@supabase/ssr` cookie sessions. No passwords are ever stored, hashed, reset, or transmitted.
- **Sign-in behaviour**: `shouldCreateUser: **true**`. Required by FR-043, not chosen for
  convenience — see Context. Every address receives an identical response; access is disclosed only
  after following a link.
- **Datastore**: Supabase Postgres, reached by Prisma 7 (driver adapters, `prisma-client` generator)
  through the Supavisor **transaction** pooler `:6543`. Migrations use the **session pooler** `:5432`
  — never `db.<ref>.supabase.co`, which is IPv6-only and unreachable from Vercel's IPv4 builders.
- **Identity records**: `auth.users` stays owned by Supabase and is never touched by application
  migrations. A `SECURITY DEFINER` trigger (`handle_new_auth_user`) mirrors it into `public.app_user`
  by UUID. **No matching invitation → the member is created `INACTIVE`, never "no row"** — deny by
  default *plus* an audit trail of who tried to get in.
- **Role carrier**: `public.invitation`. The role an Admin chose is server-owned and immutable by the
  invitee. Supabase's `user_metadata` / `raw_user_meta_data` is **never** read for authorization —
  it is writable by the subject via `updateUser()`, i.e. a privilege-escalation primitive.
- **Authorization boundary**: `server/auth/guard.ts`. `requireUser()` / `requireAdmin()` re-read role
  and status from `app_user` on **every** protected request, `cache()`-deduped per request. Route
  middleware (`proxy.ts`) performs redirects only and is explicitly **not** a security boundary.
- **Compile-time enforcement**: repository functions take the actor as their first parameter, typed
  as a branded `AdminActor` that only `requireAdmin()` can produce. A missing authorization check is
  a **build failure**, not a review miss.
- **Session lifetime**: enforced in application code via an `app_user.lastSeenAt` column checked by
  the guard (30-day sliding, coarse writes). Not by provider configuration — see Context fact 1.
- **RLS**: enabled with **zero policies** on all three tables, plus `REVOKE` and `ALTER DEFAULT
  PRIVILEGES`, and `public` removed from Exposed Schemas. Stated honestly as a blast-radius limiter
  for a leaked publishable key — **not** the authorization model.
- **Removal semantics**: reversible deactivation, never row deletion. `ON DELETE RESTRICT` on usage
  records is what makes "history survives removal" structural rather than conventional.
- **Email**: custom SMTP from day one, not Supabase's built-in sender (2/hour project-wide, and
  documented by Supabase as non-production). **Gmail SMTP** — `smtp.gmail.com:587`, authenticating
  as `whazpk@gmail.com` with a Google App Password. Chosen 2026-08-02 over an ESP because Whaz owns
  no domain and every transactional provider requires DNS verification to send from an address;
  `gmail.com` cannot be verified by us. Side benefit: the sender is the address already printed on
  the letterhead, which makes sign-in links recognisable to a non-technical audience.

## Consequences

### Positive

- **One enforcement point, and the compiler defends it.** Every authorization decision passes through
  the guard, and the type system makes bypassing it a build error rather than something a reviewer
  must notice.
- **Revocation is genuinely immediate.** Because status is re-read per request, a removed member is
  refused on their *next* action — no waiting for a token to expire. This also decouples session
  length from security, which is what makes a long, low-friction session safe.
- **No password surface at all** — no storage, no reset flow, no policy, no credential stuffing.
  Three whole categories of vulnerability that simply do not exist here.
- **The role cannot be forged.** A server-owned invitation row is the only carrier, closing the most
  common RBAC hole in this stack.
- **The render path is untouched.** `lib/` stays framework-free; identity is a precondition before the
  render and a metric after it. FR-013 requires byte-identical output.
- **Single vendor for auth + data** means the `auth.users` → `app_user` link is a database trigger —
  the only sync path that cannot be bypassed by any future auth entry point.
- **$0 preserved**, including the session-lifetime requirement, which would otherwise have cost $25/mo.

### Negative

- **The generator now has a hard runtime dependency it never had.** If Postgres is unreachable, nobody
  produces a proposal (FR-045, fail closed). This is a real regression in availability, accepted
  deliberately: an unreachable store must never read as "permitted."
- **A database round trip on every protected request** (~5–20 ms through the pooler). Mitigated by
  `cache()` and an index, but it is not free.
- **Cold start grows**: Prisma init + TLS on top of Chromium unpacking. Partly offset by Prisma 7's
  adapter path shipping no Rust engine.
- **`lastSeenAt` writes**, kept cheap by updating only when >1 h stale — but it is a write on a read
  path, which is a shape worth remembering.
- **Vendor coupling to Supabase is now structural**, not incidental: the trigger assumes auth and
  application data share a database. Migrating auth away later means replacing that trigger with
  application-level sync, which is strictly weaker.
- **RLS being on will mislead someone.** Prisma connects as table owner and owners bypass RLS. This is
  written down in three places precisely because "RLS is enabled" reads as safety.
- **Free-tier hazards inherited**: idle project suspension, and rate limits that must be configured
  rather than assumed.

## Alternatives Considered

**Alternative A — Role claim in the JWT (Supabase Custom Access Token Hook).** Rejected as
*authoritative*. The role must be re-read from Postgres each request anyway for the status kill-switch
(FR-006), so a JWT claim can only ever save a redirect, never a check — while introducing a value
that is stale for up to the token TTL and a Postgres function whose failure breaks **all** logins. May
be added later as a UX optimisation, explicitly non-authoritative.

**Alternative B — Role in `user_metadata`.** Rejected outright: subject-writable, therefore a
privilege-escalation primitive. Named in Principle VI for this reason.

**Alternative C — RLS as the authorization model** (`FORCE ROW LEVEL SECURITY` + `SET LOCAL ROLE` +
JWT GUC per query). Rejected: requires a *session-capable* connection, which means abandoning the
transaction pooler that serverless requires. Wrong trade for a two-role internal tool, and it would
scatter authorization across policies instead of concentrating it in one auditable module.

**Alternative D — Prisma inside `proxy.ts`** (now possible, since `proxy` runs on Node). Rejected: a
DB round trip on every matched request's TTFB, and it makes routing a hard dependency of database
uptime.

**Alternative E — `shouldCreateUser: false`.** The intuitive reading of "no self-service
registration." Rejected: it discloses membership at request time, violating FR-043.

**Alternative F — Buy Supabase Pro for session controls.** Rejected: breaches Principle V. The
application-level check is also better on the merits — evaluated per request against live state,
which is what Principle VI asks for regardless of price.

**Alternative G — Hard delete of members.** Rejected: destroys historical counts (FR-021) and an
audit trail. Reversible deactivation costs an `INACTIVE` filter on member queries.

**Alternative H — A `Role`→`Permission` join table.** Rejected as a speculative abstraction
(Principle IV). Two fixed roles are the requirement. Adding a third means one tuple, one enum value,
one migration.

**Alternative I — A different auth vendor (Clerk, Auth0) over Supabase Postgres.** Rejected: loses
the trigger-based sync, since the identity records would no longer live in the same database. Adds a
second vendor and a second free-tier ceiling to track.

## References

- Feature Spec: [`specs/002-rbac-dashboard/spec.md`](../../specs/002-rbac-dashboard/spec.md) — FR-001…FR-011, FR-041…FR-045
- Implementation Plan: [`specs/002-rbac-dashboard/plan.md`](../../specs/002-rbac-dashboard/plan.md)
- Research: [`specs/002-rbac-dashboard/research.md`](../../specs/002-rbac-dashboard/research.md) — R2 (session/Pro-plan finding), R3 (`shouldCreateUser`), R4 (SMTP), R8 (Prisma/pooler)
- Data model: [`specs/002-rbac-dashboard/data-model.md`](../../specs/002-rbac-dashboard/data-model.md)
- Contracts: [`specs/002-rbac-dashboard/contracts/auth-and-admin.md`](../../specs/002-rbac-dashboard/contracts/auth-and-admin.md)
- Governing policy: `.specify/memory/constitution.md` v4.0.1 — Principle III, **Principle VI**, Principle V
- Related ADRs: [ADR-0003](./0003-last-admin-invariant-concurrency-control.md) (the invariant this architecture must uphold); [ADR-0001](./0001-letterhead-chrome-strategy.md) (no interaction — the render path is untouched)
- Evaluator Evidence: `history/prompts/002-rbac-dashboard/0003-plan-rbac-dashboard.prompt.md`
