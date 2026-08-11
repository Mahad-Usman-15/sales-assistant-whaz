---
id: 0009
title: Auth Layer And First Admin
stage: green
date: 2026-08-02
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: null
labels: [auth, guard, prisma, bootstrap, smtp, branded-types, T030-T038]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: history/adr/0002-identity-and-authorization-architecture.md
  pr: null
files:
 - server/db/client.ts
 - server/auth/supabase.ts
 - server/auth/admin.ts
 - server/auth/guard.ts
 - scripts/bootstrap-admin.ts
 - scripts/check-email.mjs
 - prisma/schema.prisma
 - prisma/migrations/20260802112000_invitation_inviter_nullable/migration.sql
 - specs/002-rbac-dashboard/quickstart.md
 - specs/002-rbac-dashboard/tasks.md
 - package.json
tests:
 - bootstrap creates first ACTIVE ADMIN — verified in the live database
 - bootstrap refuses on second run (FR-036) — verified
 - npx tsc --noEmit / npm run lint / npm run build — all clean
 - npm run test:unit — 94/94
 - migration applied to live database
---

## Prompt

I have tested the email has successfull sent,✓ Supabase accepted the send for mahadusmn07@gmail.com.The issue was that I have added the password for mahadusmn07 and I was adding the sender email as whazpk.The issue is found.Go with mahadusmn07. I will change the sender latyer

## Response snapshot

Email root cause was the user's find, and it was a failure mode I had **not** predicted. I had
diagnosed the unverified-domain refusal (Resend will not send as `gmail.com`), which was correct as
far as it went. The actual blocker after switching to Gmail was different: **Gmail SMTP sends as the
authenticated account and will not relay an arbitrary From address.** The App Password belonged to
`mahadusmn07@gmail.com` while `smtp_admin_email` was set to `whazpk@gmail.com`.

Both failures present identically to the application — Supabase returns a bare 500 with an empty
body either way — so the distinguishing rule is now recorded in `quickstart.md`:
**`smtp_admin_email` must match `smtp_user`**, with the two remedies for changing the sender later
(an App Password on that account, or a verified "Send mail as" alias).

**T012 done**, sending as `mahadusmn07@gmail.com`; sender change deferred, with a note that it is
worth doing before rollout since the address is visible on every sign-in link.

### Built: T030–T038 (33/103 complete)

- `server/db/client.ts` — Prisma singleton over `PrismaPg`, `import 'server-only'` first line,
  `max: 3` (not the usual serverless `connection_limit=1`, which would serialise requests behind one
  socket for no benefit when Supavisor is already the pool).
- `server/auth/supabase.ts` — request-scoped client. Verified against the **installed**
  `@supabase/ssr` types that `setAll` really does take `(cookies, headers)`; the library's own doc
  comment states the consequence of dropping the second argument: *"one user's session token can be
  served to a different user."* That claim of mine held up, unlike two earlier ones.
- `server/auth/admin.ts` — the sole reader of `SUPABASE_SECRET_KEY`.
- `server/auth/guard.ts` — the authorization boundary. Per-request re-read of role and status
  (FR-006 kill switch), 30-day sliding window checked **before** the coarse `lastSeenAt` refresh
  (checking after would slide the window on the very request that should end it), fail-closed
  `StoreUnavailableError` on a curated set of connection-level error codes only — a query bug must
  surface as a bug, not be disguised as a transient outage.
- **Branded `AdminActor`** via a non-exported `unique symbol`, so `requireAdmin()` is the only
  construction site in the codebase and calling an admin repository function without the guard is a
  compile error.
- `scripts/bootstrap-admin.ts` — refuses once any active Admin exists (FR-036), never referenced
  from build/postinstall.

### Two defects found by trying to run things

**Schema bug — `invitation.invited_by_id` was NOT NULL.** The first Admin's invitation has no
inviter by definition, so bootstrap was impossible without inventing a synthetic "system" user,
which would be a fiction in the FR-029 audit trail. Made nullable with `ON DELETE SET NULL`; NULL
now honestly means "self-bootstrapped" and occurs at most once per organisation. Migration applied.

**Workflow gap — testing email blocked bootstrap.** Running `check:email` created an auth user,
which the trigger correctly recorded as `INACTIVE/SALES` (FR-005, no matching invitation). Bootstrap
then refused, because it only knew how to invite someone who did not exist. But reaching that branch
already guarantees zero active Admins — which *is* the bootstrap case — and the invitation path is
gone, since the trigger fires only on `auth.users` INSERT and that has happened. Bootstrap now
promotes the existing member directly, guarded by the same zero-active-Admins precondition.

### Verified against the live database

`mahadusmn07@gmail.com` is now `ADMIN / ACTIVE`, `invited_by: null` (self-bootstrapped), zero
invitation rows. A second bootstrap run refuses with the active-Admin message. Typecheck, lint,
build, and 94/94 unit tests all clean.

Also added: `tsx` devDependency (T037 already assumed `npx tsx`), and `scripts/check-email.mjs` +
`npm run check:email` as the repeatable verification for T012 — email is the one dependency the
application cannot diagnose for itself.

## Outcome

- ✅ Impact: Phase 2's foundational layer is complete and the organisation has its first Admin. The
  authorization boundary exists with compile-time enforcement; sign-in email works end to end.
- 🧪 Tests: bootstrap create PASS · bootstrap refusal PASS · migration applied PASS · tsc/lint/build
  PASS · unit 94/94 PASS. Run against the live Supabase project and a local production build.
- 📁 Files: four new `server/` modules, `scripts/bootstrap-admin.ts`, `scripts/check-email.mjs`, one
  migration, `prisma/schema.prisma`, `quickstart.md`, `tasks.md`, `package.json`.
- 🔁 Next: T043–T052 (US1) — `proxy.ts`, `/login`, `/auth/callback`, `requireUser()` + 401/503 on
  `/api/generate`, and the `ProposalForm` 401 branch. That is the MVP slice and it is shippable on
  its own. Still outstanding and unchanged: **T005**, the Vercel preview check for the `/tmp` fix.
- 🧠 Reflection: three of the four defects this session came from *running* things rather than
  reading them — the CJS/top-level-await failure, the NOT NULL column, and the bootstrap/test-state
  collision. The last one is the interesting one: it was created by my own verification step, which
  is a category I should expect more of. Test actions that write to a shared database leave state
  that later steps must tolerate.

## Evaluation notes (flywheel)

- Failure modes observed: (a) I predicted the wrong email failure — the domain-verification issue
  was real but the operative one was Gmail's sender/auth match, which I had not documented at all;
  (b) a schema constraint that was correct for the steady state and impossible for the initial
  state; (c) verification state blocking a subsequent step.
- Graders run and results (PASS/FAIL): bootstrap-creates-admin PASS · bootstrap-refuses-second-run
  PASS (FR-036) · database state PASS (1 ADMIN/ACTIVE, 0 invitations) · `setAll` two-arg signature
  PASS (verified against installed types) · typecheck PASS · lint PASS (after removing a stale
  eslint-disable) · build PASS · unit 94/94 PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when `/auth/callback` lands, sign in as the bootstrapped
  Admin and confirm `requireAdmin()` returns rather than throwing. That exercises the whole chain —
  cookie, JWKS verification, member lookup, status check, `lastSeenAt` — for the first time; every
  piece so far has only been verified in isolation.
