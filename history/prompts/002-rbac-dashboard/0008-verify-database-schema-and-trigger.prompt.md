---
id: 0008
title: Verify Database Schema And Trigger
stage: green
date: 2026-08-02
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: null
labels: [database, migrations, trigger, citext, rls, verification, bugfix, privilege-escalation]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: history/adr/0003-last-admin-invariant-concurrency-control.md
  pr: null
files:
 - prisma.config.ts
 - prisma/migrations/20260802095535_init_rbac_schema/migration.sql
 - prisma/migrations/20260802095600_auth_link_trigger_and_rls/migration.sql
 - prisma/migrations/20260802101500_scope_admin_invariant_trigger/migration.sql
 - prisma/migrations/20260802103000_fix_trigger_citext_comparison/migration.sql
 - specs/002-rbac-dashboard/tasks.md
tests:
 - 13 structural checks against the live database — all PASS
 - 9 behavioural checks (trigger, invariant, uniqueness, escalation) — all PASS
 - test data torn down; app_user=0, invitation=0
---

## Prompt

I am doing the smtp settings.Inthe meanwhile you test the Database.I have added all the api keys required

## Response snapshot

Database stood up and verified end-to-end. **Four migrations applied**, 13 structural checks and 9
behavioural checks passing, all test data removed. T011, T014, T020–T026 complete — **23/103**.

Three defects were found, all mine, all before they could ship.

### Bug 1 — Prisma never saw the credentials (my config, not the user's keys)

`prisma migrate status` failed with `PrismaConfigEnvError: Cannot resolve environment variable`.
Diagnosis without reading `.env` (a permission deny rule protects it, correctly): dotenv reported
`injected env (0) from .env`, and a shape-only scan showed **`.env` does not exist** while
`.env.local` holds all 5 correctly-named keys.

Cause: `prisma.config.ts` used the stock `import 'dotenv/config'`, which reads `.env` only. This is
a **Next.js** app, where secrets conventionally live in `.env.local`. The keys were in the right
place; my config was reading the wrong file. Fixed by loading `.env.local` then `.env` — dotenv does
not overwrite already-set variables, so this reproduces Next.js's own precedence.

### Bug 2 — the last-Admin backstop trigger would have broken bootstrapping

Written as `AFTER UPDATE OR DELETE ... FOR EACH ROW` with no condition, so it fired on **every**
update to `app_user` — including the `last_seen_at` write on the request path (FR-041).

The serious consequence is not performance. Before the first Admin exists there is *no* active
Admin, so **any** update would have raised `last_admin` — including the first user's very first
sign-in heartbeat. The trigger silently asserted "an Admin must exist before anyone may do
anything" rather than the actual invariant, "you may not remove the last Admin". Bootstrapping
would have been impossible.

Fixed by splitting UPDATE/DELETE and adding
`WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status)`, plus an
early return when `app_user` is empty (an empty org has no Admin to protect — needed for bootstrap
and for test teardown).

### Bug 3 — the citext trap: FR-028 was silently broken

The behavioural suite failed exactly one check: an invitation created as `NAME@EXAMPLE.TEST` did not
match a sign-in as `name@example.test`.

Everything about the schema was correct — `invitation.email` **is** `citext`, the extension **is**
installed in `public`, the trigger's `search_path` **does** include it. The problem:

```
auth.users.email        is VARCHAR   (Supabase owns it; we cannot change it)
public.invitation.email is CITEXT

citext = citext   ->  case-insensitive   ✅
citext = varchar  ->  case-SENSITIVE     ❌   <- what `WHERE email = NEW.email` did
```

Postgres resolves `citext = varchar` by casting the citext side **down** to text, so the
case-insensitive operator never runs. Fixed with an explicit `NEW.email::citext`.

**Scope was then measured rather than assumed.** A parameterised query (`where email = $1` with a
JS string) *is* case-insensitive, because Postgres infers the parameter type from the column — so
Prisma-issued application queries were never affected. Only literals and typed columns like
`NEW.email` need the cast. That distinction is recorded in the migration so nobody "fixes" the
application layer too.

Had this shipped: anyone invited as `Name@Company.com` who typed `name@company.com` at sign-in would
be silently denied, landing INACTIVE with an audit row saying they were never invited, while the
Admin saw a PENDING invitation that "did nothing."

### The check that matters most

Among the 9 behavioural tests, the highest-value one attempts the escalation ADR-0002 names as the
headline risk: create an auth user carrying `user_metadata = { role: 'ADMIN', is_admin: true,
status: 'ACTIVE' }` and confirm they still land **SALES / INACTIVE**. It passes — the role comes
only from the server-owned `invitation` row.

Others: invited role honoured and invitation marked ACCEPTED · uninvited user denied but recorded
(FR-005) · expired invitation grants nothing (FR-026) · duplicate PENDING invitation rejected by the
partial unique index with `23505` (FR-024) · backstop refuses to deactivate the last active Admin
(FR-033) · `last_seen_at` writes do not trip the invariant (the Bug 2 regression guard).

Structural verification separately confirmed RLS enabled with **zero policies** on all three tables,
no `anon`/`authenticated` privileges, both FKs `RESTRICT`, and the trigger `SECURITY DEFINER` with a
pinned `search_path`.

## Outcome

- ✅ Impact: schema, identity trigger, invariant backstop, and RLS lockdown are live and verified
  against the real database. Connection strings confirmed correct — `DATABASE_URL` on 6543 with
  `pgbouncer=true`, `DIRECT_URL` on the 5432 session pooler, so the IPv6 `ENETUNREACH` trap is
  avoided.
- 🧪 Tests: 13 structural PASS · 9 behavioural PASS · teardown verified clean (`app_user=0`,
  `invitation=0`). Run against the live Supabase project via the session pooler.
- 📁 Files: `prisma.config.ts` (env loading fixed); four migrations under `prisma/migrations/`;
  `tasks.md` (T011, T014, T020–T026 marked).
- 🔁 Next: T012/T013 are the user's (SMTP + rate limits). Unblocked for me now: `server/db/client.ts`,
  `server/auth/*`, the guard, and `scripts/bootstrap-admin.ts` — T030–T038.
- 🧠 Reflection: all 13 structural checks passed while FR-028 was broken. Schema-shape verification
  proves the *declaration*, never the *behaviour* — the citext bug is invisible to `information_schema`
  and visible only to a round trip through the trigger. Worth generalising: for anything with a
  trigger or a type-sensitive comparison, the test has to exercise the path, not inspect it.

## Evaluation notes (flywheel)

- Failure modes observed: (a) stock-snippet config (`import 'dotenv/config'`) that is correct for
  Prisma-in-general and wrong for Prisma-in-Next.js; (b) a trigger written to the *summary* of an
  invariant rather than its precise statement, which inverted it during bootstrap; (c) a type-level
  comparison bug fully invisible to structural checks. All three were caught by executing behaviour,
  none by reading the schema.
- Graders run and results (PASS/FAIL): migrations apply PASS (4/4) · structural PASS (13/13) ·
  behavioural PASS (9/9 after two fixes; 8/9 before) · privilege-escalation-via-metadata PASS ·
  teardown PASS · connection-string shape PASS (ports 6543/5432 both correct).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): port the 9 behavioural checks into
  `tests/integration/db/` so they run in CI rather than as a one-off script. The citext regression in
  particular would otherwise be reintroduced by any future edit to the trigger, and it has already
  proven it can hide from every structural check.
