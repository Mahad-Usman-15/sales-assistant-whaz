---
description: "Task list for 002-rbac-dashboard"
---

# Tasks: RBAC Dashboard

**Input**: Design documents from `/specs/002-rbac-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-and-admin.md, quickstart.md

**Tests**: **Included.** Not as a style preference — the spec makes them load-bearing. SC-004 can only
be demonstrated by two concurrent connections, SC-007 by a byte comparison, SC-014 by an automated
accessibility check. Each test task below cites the criterion it discharges.

**Organization**: Grouped by user story so each can be implemented, tested, and shipped independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: US1 / US2 / US3 — user-story phases only
- Exact file paths in every description

## Path Conventions

Single Next.js application, App Router. `app/` · `components/` · `lib/` (framework-free) ·
`server/` (server-only) · `prisma/` · `tests/`. See `plan.md` → Project Structure.

> ⚠️ **`server/` is deliberately not `lib/`.** `lib/CLAUDE.md` declares `lib/` framework-free and
> unit-testable without booting Next, Chromium, or a database. Prisma and the Supabase SSR client are
> none of those.

---

## Phase 1: Setup — including the blocking prerequisite

**Purpose**: Fix the known defect this feature would otherwise be layered on top of, then install
dependencies.

> ⚠️ **T001–T005 gate the entire feature.** Constitution Workflow Rules: *"A known defect in a
> surface a new feature depends on MUST be fixed before that feature is built on top of it."* The
> generator currently leaks ~72 MB into `/tmp` per render and fails at ~7 renders on one instance.
> Auth makes this **worse** — the same members keep one instance warm — and the Admin's headline
> figure would visibly plateau while reps report 500s.

- [X] T001 Replace the per-request browser launch in `lib/pdf.ts` with a module-scope memoised `getBrowser()`, following the same memoisation pattern already used by `lib/fonts.ts` and `lib/brand.ts`
- [X] T002 Serve every render from a single long-lived `Page` in `lib/pdf.ts` (`getPage()`), and **close nothing** — not the browser, not a context, not the page. `setContent()` replaces the whole document, so a reused page needs no cleanup
  - ⚠️ **This task originally specified `newContext()` → `newPage()` with the context closed in `finally`. That is wrong and was corrected on 2026-08-03 after it shipped twice and failed twice.** `@sparticuz/chromium` launches with `--no-startup-window`, so the browser starts with **zero** windows and the page created here is its only one — closing it drops the window count to zero and Chromium exits. Under `--single-process`, closing a `BrowserContext` does the same. Both variants therefore killed the browser after *every* render, forcing a relaunch that left another ~40 MB `/tmp` profile behind and reproduced the exact disk-exhaustion defect T001 exists to fix. Measured on Vercel 2026-08-02: one instance served 20 sequential requests, relaunched Chromium **17 times**, and returned 3 successes
- [X] T003 Add liveness self-heal in `lib/pdf.ts`: `getBrowser()` relaunches only when the memoised browser reports `!isConnected()`; `getPage()` additionally requires `!isClosed()` **and** `page.context().browser() === browser`, since a page belonging to a replaced browser can still report `!isClosed()`
  - ⚠️ Recovery only. **Do NOT add a "recycle the browser every N renders" safety valve** — it was tried and removed. Each relaunch re-incurs the ~40 MB `/tmp` cost, reintroducing the original defect at 1/N the rate. The trade is asymmetric: exhausting *memory* kills the instance, which restarts with a clean `/tmp` and self-heals; exhausting *disk* does not self-heal, as production showed with 10 consecutive failures
- [X] T004 Serialise renders per instance in `lib/pdf.ts` with `MAX_CONCURRENT_RENDERS = 1` and a slot queue whose releaser hands its slot over directly, so the count can never transiently exceed the cap
  - ⚠️ **Originally specified as "a semaphore, limit 2". Corrected to 1 on 2026-08-03.** This is not memory tuning — the instance keeps one page, and one page cannot serve two renders at once without them clobbering each other's document. Concurrency comes from Vercel running more instances, each with its own Chromium, which is the correct axis. At ~700 ms per warm render and 10–50 proposals/day, queueing costs nothing observable
- [X] T005 Verify SC-009 on a Vercel preview: 20 sequential `POST /api/generate` against the same warm instance all return 200, then 5 concurrent with no OOM, and `/tmp` does not grow monotonically
- [X] T006 [P] Add runtime dependencies to `package.json`: `@supabase/supabase-js`, `@supabase/ssr`, `prisma@^7`, `@prisma/client@^7`, `@prisma/adapter-pg`, `server-only`
- [X] T007 [P] Add UI dependencies to `package.json`: `tailwindcss@^4`, `@tailwindcss/postcss`, `tailwind-variants`, `clsx`, `tailwind-merge`, `@remixicon/react`, `@radix-ui/react-dialog`
- [ ] T008 [P] Add dev dependency `@axe-core/playwright` to `package.json` (SC-014)
- [X] T009 [P] Add `generated/prisma/` to `.gitignore`
- [ ] T010 Add `./generated/prisma/**` to `outputFileTracingIncludes` for `/api/generate` in `next.config.ts`

**Checkpoint**: The generator survives sustained use. Only now is it safe to put a login in front of it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, identity plumbing, and the authorization guard. Everything below is required
by all three stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

> ⚠️ **T011–T014 are Supabase dashboard settings, not code.** They are listed as tasks precisely
> because a file-based checklist makes configuration invisible, and invisible steps are the ones that
> get skipped. Each has an explicit verification.

- [X] T011 Create the Supabase project; record the project ref and both pooler connection strings for `.env`
- [X] T012 Configure **Gmail SMTP** in **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**: host `smtp.gmail.com`, port `587`, user `whazpk@gmail.com`, pass = a Google **App Password** (not the account password), `smtp_admin_email` = `whazpk@gmail.com`, `smtp_sender_name` = `Whaz Proposals`. Prerequisite: enable **2-Step Verification** on that Google account, then generate the App Password. ⚠️ No credential belongs in this app's `.env` — the app never sends email, Supabase does (`signInWithOtp`, `inviteUserByEmail`). ⚠️ **Blocking, not polish**: the built-in Supabase sender is capped at **2 emails/hour project-wide**, and with passwordless sign-in that is the *primary auth path*, not just invites (research R4). ⚠️ `smtp_admin_email` MUST match `smtp_user` — Gmail sends as the authenticated account and will not relay an arbitrary From address (this exact mismatch cost a debugging cycle on 2026-08-02). Verify with `npm run check:email <address>`. Field mapping and rationale: `quickstart.md` → "Email delivery". **Done 2026-08-02, sending as `mahadusmn07@gmail.com`; sender change to a Whaz address deferred to before rollout.**
- [ ] T013 Configure Supabase Auth rate limits — `otp.period` (per-address cooldown) and `otp.requests_per_hour`. **This is where FR-042 is satisfied; do not write a throttle** (research R1). Verify by requesting two links for the same address inside the cooldown and confirming the second is refused
  - Set 2026-08-03: emails sent **60/hour** (project-wide, raised from the 30 default — the built-in sender's 2/hour no longer applies now that custom SMTP is on), token verifications **60 per 5 min per IP** (raised from the 30 default; acceptable because magic-link tokens are high-entropy, unlike a 6-digit OTP)
  - ⚠️ **Still outstanding — neither of the above is FR-042.** FR-042 asks for a *per-address* cooldown, which is `otp.period` ("Send OTPs or magic links / limited by: last request of the user"), **default 60 s, customizable**. Confirm it is still 60 s and has not been zeroed. If untouched, **FR-042 is already satisfied by the default** and nothing needs changing — only the confirmation is owed
- [X] T014 Remove `public` from the project's Exposed Schemas in Supabase API settings — PostgREST is never used here. Verify the publishable key returns nothing for all three tables
- [X] T014a Configure **Authentication → URL Configuration** in Supabase: set **Site URL** to the production URL, and add to **Redirect URLs** both `http://localhost:3000/**` and the Vercel preview wildcard `https://sales-assistant-whaz-*-mahad-usmans-projects.vercel.app/**`. ⚠️ Supabase silently ignores an `emailRedirectTo` that is not on the allow-list and substitutes Site URL, so every sign-in link points at localhost — with nothing logged, because the app asked correctly and the provider overrode it (observed 2026-08-02). ⚠️ Keep the project prefix in the wildcard: `https://*.vercel.app/**` would let any Vercel app receive members' auth codes. Verify by requesting a link from the deployed site and confirming the link host matches. Rationale: `quickstart.md` → "Redirect URLs"
  - **Verified 2026-08-03** by `node scripts/check-redirect-urls.mjs mahadusmn07@gmail.com`, 4/4 — see that script for why this is checked server-side rather than by clicking an emailed link
  - The check probes the allow-list through `auth.admin.generateLink`, which runs the same validation as `signInWithOtp` but returns the link instead of mailing it. A URL echoed back unchanged matched the allow-list; a URL replaced by the Site URL was refused. Results: production alias and `localhost:3000` both echoed; **an invented preview hash that has never been deployed also echoed**, which is the only evidence that a *wildcard* is present rather than one pinned deployment URL; a foreign host was refused, so the wildcard kept its project prefix
  - The negative control also pins the Site URL as a side effect — the refused request fell back to `https://whaz.vercel.app`, confirming Site URL is the stable production alias and not a per-deployment hash. That matters because Vercel mints a new immutable hash every push, so a hash in Site URL would go stale on the next deploy, and Site URL is precisely the fallback the broken path lands on
- [X] T015 Create `prisma.config.ts` — ⚠️ it MUST explicitly load `.env`; Prisma 7 no longer auto-loads it, and `prisma migrate` will otherwise see no connection string. ⚠️ Do **not** put `directUrl` here; its `Datasource` type has no such field
- [X] T016 Create `prisma/schema.prisma` with generator `prisma-client` (not `prisma-client-js`), mandatory `output = "../generated/prisma"`, `directUrl`, and the three enums `Role`, `UserStatus`, `InvitationStatus` per `data-model.md`
- [X] T017 Add the `AppUser` model to `prisma/schema.prisma` (`@@map("app_user")`) with `id`, `email citext` unique, `role`, `status` (default `INACTIVE`), `deactivatedAt`, `lastSeenAt`, `invitedById`, `createdAt`, and `@@index([role, status])`
- [X] T018 Add the `Invitation` and `PdfGeneration` models to `prisma/schema.prisma` with the FKs and indexes specified in `data-model.md` (`PdfGeneration.userId` → `onDelete: Restrict`)
- [X] T019 Create `.env.example` documenting `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL` — ⚠️ `DIRECT_URL` is the **session pooler `:5432`**, never `db.<ref>.supabase.co` (IPv6-only; migrations fail `ENETUNREACH` from Vercel)
- [X] T020 Generate migration 1 in `prisma/migrations/`: `citext` extension, the three enums, and `app_user`
- [X] T021 Generate migration 2 in `prisma/migrations/`: `invitation` plus the **partial unique index on `(email) WHERE status = 'PENDING'`** (this is what makes FR-024 a database guarantee rather than a checked condition)
- [X] T022 Generate migration 3 in `prisma/migrations/`: `pdf_generation`
- [X] T023 Write migration 4 as raw SQL (`--create-only`) in `prisma/migrations/`: cross-schema FK `app_user.id → auth.users(id) ON DELETE RESTRICT`, and the `handle_new_auth_user` trigger (`SECURITY DEFINER`, `SET search_path = public`) implementing the invitation-match logic in `data-model.md` — no invitation → `INACTIVE`, never "no row"
- [X] T024 Add the last-admin statement-level backstop trigger to migration 4, with a comment stating it is a **backstop only** and that the primary mechanism is the advisory lock in `server/repo/users.ts` (see ADR-0003)
- [X] T025 Write migration 5 as raw SQL in `prisma/migrations/`: enable RLS with **zero policies** on all three tables, plus `REVOKE ALL` from `anon`/`authenticated` and matching `ALTER DEFAULT PRIVILEGES`
- [X] T026 Run `npx prisma migrate deploy` against `DIRECT_URL` and confirm all five migrations apply
- [X] T027 [P] Create `lib/rbac-schema.ts` with the `ROLES` const tuple, `roleSchema`, `inviteInputSchema` (email trimmed + lowercased), and `updateMemberInputSchema` — ⚠️ **MUST NOT import the Prisma `Role` enum**; doing so drags the Prisma client into the browser graph
- [X] T028 [P] Create `tests/unit/role-enum-parity.test.ts` asserting the `ROLES` tuple set-equals the generated Prisma `Role` enum — the drift guard that lets T027's rule hold safely
- [X] T029 [P] Create `server/errors.ts` with `UnauthenticatedError`, `ForbiddenError`, `LastAdminError`, and `StoreUnavailableError`
- [X] T030 Create `server/db/client.ts` — Prisma singleton using `@prisma/adapter-pg` with `pool max: 3`, and ⚠️ `import 'server-only'` as the first line so a client-graph import fails at **build** time
- [X] T031 [P] Create `server/auth/supabase.ts` with the server-side `createServerClient` factory over `cookies()` — ⚠️ `setAll` takes **`(cookies, headers)`**; the second argument must be forwarded or a CDN can serve one member's session to another. In Server Components `setAll` must be a no-op wrapped in try/catch
- [X] T032 [P] Create `server/auth/admin.ts` with the `SUPABASE_SECRET_KEY` client (`autoRefreshToken: false`, `persistSession: false`, `detectSessionInUrl: false`) and `import 'server-only'` — ⚠️ this module is the **only** place the secret key is imported, and the key never carries a `NEXT_PUBLIC_` prefix
- [X] T033 Create `server/auth/guard.ts` with `requireUser()` and `requireAdmin()`, React `cache()`-wrapped, re-reading `role`/`status`/`lastSeenAt` from `app_user` on every call — ⚠️ **never** from a token claim and **never** from `user_metadata`, which the subject can write (FR-010, Principle VI)
- [X] T034 Add the branded `Actor` / `AdminActor` types to `server/auth/guard.ts` such that `AdminActor` is constructible only by `requireAdmin()` — this is what makes a missing authorization check a compile error rather than a review miss
- [X] T035 Add the 30-day `lastSeenAt` staleness check to `server/auth/guard.ts`, with a coarse refresh that only writes when the stored value is more than an hour old (FR-041; research R2 — Supabase's own session controls are Pro-only)
- [X] T036 Add `StoreUnavailableError` handling to `server/auth/guard.ts` so an unreachable datastore **fails closed** and is never treated as permission granted (FR-045)
- [X] T037 Create `scripts/bootstrap-admin.ts` — an operator script that reads `.env`, **exits 1 if any active Admin already exists**, inserts an `invitation` with `role=ADMIN`, then calls `inviteUserByEmail`. ⚠️ MUST NOT be referenced from any `package.json` build or postinstall script (FR-036)
- [X] T038 Verify Phase 1 of `quickstart.md`: bootstrap creates exactly one ACTIVE ADMIN **via the trigger**, refuses on a second run, and the publishable key reads nothing from any table

**Checkpoint**: Schema, identity plumbing, and the authorization boundary exist. User stories can begin.

---

## Phase 3: User Story 1 — Only invited staff can produce Whaz-branded proposals (Priority: P1) 🎯 MVP

**Goal**: Sign-in gates every surface including `POST /api/generate`; uninvited people get nothing.

**Independent Test**: Deploy with sign-in enforced and **no dashboard**. An invited member signs in
and generates a proposal identical to pre-change output; an uninvited person and a signed-out visitor
generate nothing by any route, including calling the endpoint directly.

### Tests for User Story 1

- [X] T039 [P] [US1] Create `tests/integration/auth.setup.ts` as a Playwright `globalSetup` that signs a seeded member in and writes `storageState`, and wire `use: { storageState }` into `playwright.config.ts` — ⚠️ **every existing integration test 401s without this**
- [X] T040 [P] [US1] Add `tests/integration/auth-gating.spec.ts`: signed-out visitor is redirected from every page; a direct `POST /api/generate` without a session returns **401** (SC-001)
- [X] T041 [P] [US1] Add `tests/integration/pdf-parity.spec.ts` capturing a PDF for fixed inputs and asserting it is **byte-identical** to a pre-change fixture (SC-007, FR-013)
- [X] T042 [P] [US1] Add `tests/integration/deactivation.spec.ts`: a member deactivated mid-session is refused on their **very next** request, with no waiting period (SC-005, FR-006)

### Implementation for User Story 1

- [X] T043 [US1] Create `proxy.ts` at repo root exporting `proxy` — ⚠️ **not** `middleware.ts`; that file does not exist in Next.js 16 and the build throws if both are present. Session refresh and redirect only, never an authorization decision (research R9)
- [X] T044 [US1] In `proxy.ts`, return the **same** `response` object the Supabase client wrote cookies into — constructing a fresh `NextResponse` after `getClaims()` silently drops refreshed tokens and produces "logged out on every second navigation"
- [X] T045 [US1] Create `app/(auth)/login/page.tsx` with an email field calling `signInWithOtp` — ⚠️ **`shouldCreateUser: true` is required by FR-043**; `false` makes the provider error on unknown addresses, turning the form into a staff enumerator (research R3)
- [X] T046 [US1] Ensure the `/login` response is identical for every address, with no timing branch and no "unknown address" fast path (FR-043)
- [X] T047 [US1] Create `app/auth/callback/route.ts` performing `exchangeCodeForSession`, an idempotent `app_user` reconcile, and `redirect('/')`; map an expired code to `/login?error=link_expired` and an INACTIVE member to `/login?error=no_access` (FR-005)
- [X] T048 [US1] Add `await requireUser()` to `POST /api/generate` in `app/api/generate/route.ts`, **before** `buildProposalHtml` and `renderPdf`, returning `401 { error: 'unauthenticated' }`
- [X] T049 [US1] Add the `503 { error: 'temporarily_unavailable', retryable: true }` branch to `app/api/generate/route.ts` — ⚠️ it MUST NOT be reported as `generation_failed`; collapsing them sends diagnosis into the Chromium pipeline when the cause is the datastore (FR-045)
- [X] T050 [US1] Add a 401 branch to the `!response.ok` handling in `components/ProposalForm.tsx` that redirects to `/login`; leave every other branch and all styling untouched
- [X] T051 [US1] Add a `signOut()` Server Action in `app/(dashboard)/dashboard/actions.ts` invoked by a `<form action>` POST, redirecting to `/login` (FR-007) — a GET link would not be CSRF-safe
- [ ] T052 [US1] Run `npm run test:integration` and confirm the pre-existing suite passes under auth, then verify `proxy` actually runs on the **first** preview deploy — ⚠️ Next patches the `proxy.js` NFT trace only under webpack, skipped under Turbopack (research R9); fall back to `next build --webpack` if it does not

**Checkpoint**: US1 is fully functional and shippable with no dashboard at all.

---

## Phase 4: User Story 2 — An Admin manages who is on the team (Priority: P2)

**Goal**: Invite, change role, remove, and restore members, with the last-Admin guarantee holding
under concurrency.

**Independent Test**: As Admin, invite a colleague as Sales; they accept and generate a proposal;
change their role to Admin and back; remove their access and confirm lockout. Separately, as the only
Admin, attempt self-removal and confirm refusal.

> **Note**: T053–T062 build the dashboard shell. US3 reuses those tasks only — see Dependencies.

### Dashboard shell (shared infrastructure, first needed here)

- [X] T053 [US2] Create `postcss.config.mjs` with `@tailwindcss/postcss` — ⚠️ this routes **all** stylesheets through PostCSS including `app/globals.css`; T062 verifies no visual change
- [X] T054 [US2] Create `app/(dashboard)/dashboard.css` importing `tailwindcss/theme.css` and `tailwindcss/utilities.css` — ⚠️ **deliberately NOT `preflight.css`**. Preflight resets the bare `input` selectors that `app/globals.css` styles directly (44px min-height, `--raise-1` background, 3px `:focus-visible` outline). Omitting the import is the whole mechanism; there is no config flag (ADR-0004)
- [X] T055 [US2] Add `source(none)` plus explicit `@source "./"` and `@source "../../components/dashboard"` to `app/(dashboard)/dashboard.css` so the scanner never reads `ProposalForm.tsx` — a build-time guarantee, stronger than a class prefix
- [X] T056 [US2] Add the non-inline `@theme` block to `app/(dashboard)/dashboard.css` aliasing namespaced Tailwind names to the existing `:root` variables — ⚠️ plain `@theme`, **never `@theme inline`**, which substitutes at build time and severs the live link to `globals.css`
- [X] T057 [US2] Override the `gray-*` ramp in the `@theme` block to a black-based scale derived from `--surface`/`--raise-1/2/3`, and add `class="dark"` to `<html>` in `app/layout.tsx` — this reskins every pasted Tremor component at once with zero source edits
- [X] T058 [US2] Create `components/dashboard/utils.ts` exporting `cx`, `focusInput`, `hasErrorInput` — ⚠️ **do not create `lib/utils.ts`**; `lib/` is declared framework-free and reserved for the render pipeline. Adjust the import path on every pasted component
- [X] T059 [P] [US2] Paste and adapt Tremor Raw `Card` into `components/dashboard/Card.tsx`, and build `components/dashboard/StatCard.tsx` (value + label + optional subline)
- [X] T060 [P] [US2] Create `components/dashboard/EmptyState.tsx`, `ErrorState.tsx`, `LoadingSkeleton.tsx`, and `UnavailableState.tsx` (the last for FR-045, visually distinct from a generic error)
- [X] T061 [US2] Create `app/(dashboard)/layout.tsx` calling `requireUser()` and importing `dashboard.css`, plus `app/(dashboard)/dashboard/loading.tsx` and `error.tsx` (FR-037, FR-038)
- [X] T062 [US2] Verify SC-008: `npm run build && npm start`, screenshot `/`, diff against a pre-change capture — **pixel-identical is the bar**. Also confirm `dashboard.css` emits no utilities for classnames used only in `ProposalForm.tsx`

### Tests for User Story 2

- [X] T063 [P] [US2] Create `tests/integration/db/last-admin.test.ts` — **two genuinely separate connections** issuing overlapping transactions, asserting exactly one succeeds and one raises `LastAdminError` (SC-004). ⚠️ Without this the invariant is *asserted, not verified*: the naive `count() > 1` version passes every single-threaded test
- [ ] T064 [P] [US2] Add `tests/integration/db/invite-uniqueness.test.ts` asserting two concurrent invites to the same address produce exactly one row via the partial unique index (FR-024)
- [ ] T065 [P] [US2] Add `tests/integration/db/trigger-role-assignment.test.ts` covering `handle_new_auth_user`: with an invitation → ACTIVE with that role; without → INACTIVE with `SALES` (FR-005, FR-023)
  - ⚠️ **T064 and T065 were wrongly marked `[X]` and were re-opened on 2026-08-05** during a pre-commit audit that checked each completed task against the file it names. Neither file exists — `tests/integration/db/` contains only `last-admin.test.ts`, and its cases cover the advisory lock, not the partial unique index or the trigger. The underlying behaviour *was* exercised manually during Phase 2 (T038) and the `citext` comparison defect was found and fixed that way, which is likely how the ticks got applied; but manual exercise is not a regression test, and FR-024/FR-005/FR-023 currently have no automated coverage
- [X] T066 [P] [US2] Add `tests/integration/admin-access.spec.ts` asserting a Sales member reaches zero admin views and zero admin actions by direct navigation and direct submission (SC-003, FR-009)

### Implementation for User Story 2

- [X] T067 [US2] Create `server/repo/users.ts` with `listMembers(actor: AdminActor)` and `countActiveMembers(actor: AdminActor)` — actor-first signatures throughout
- [X] T068 [US2] Implement `updateMember(actor, targetId, { role?, status? })` in `server/repo/users.ts` — ⚠️ **Read `history/adr/0003-last-admin-invariant-concurrency-control.md` before writing this function.** It must take `pg_advisory_xact_lock(hashtext('app_user:admin_invariant'))` as the first statement of the transaction, re-count inside the lock, then mutate. **`pg_advisory_xact_lock`, never `pg_advisory_lock`** — the session-scoped variant leaks onto a pooled connection and permanently deadlocks in production only
- [X] T069 [US2] Set the interactive transaction `timeout: 10_000` on `updateMember` so lock contention does not surface as `P2028`, and map `P2028` → `503`
- [X] T070 [US2] Ensure `updateMember` is the **single** path for role change, removal, and restore — no separate `deactivate` or `changeRole` function (ADR-0003; two paths means two places to get the lock right)
- [X] T071 [US2] Add restore semantics to `updateMember`: the caller supplies the role explicitly, defaulted by the UI to the role held at removal. Restoring MUST NOT re-grant Admin implicitly (FR-032)
- [X] T072 [US2] Create `server/repo/invitations.ts` with `listPendingInvitations(actor: AdminActor)`, `createInvitation`, and `revokeInvitation`; map Prisma `P2002` from the partial unique index to "already invited" (FR-024)
- [X] T073 [US2] Implement the `inviteUser` Server Action in `app/(dashboard)/dashboard/actions.ts` — ⚠️ first statement `await requireAdmin()`. Insert the invitation row **first**, then send the email, so a send failure leaves a revocable `PENDING` row. Reuse `collectFieldErrors` from `lib/schema.ts`
- [X] T074 [US2] Implement the `updateMember` and `revokeInvitation` Server Actions in `app/(dashboard)/dashboard/actions.ts`, each opening with `await requireAdmin()` — ⚠️ Server Actions are public HTTP endpoints with stable IDs; being rendered inside an admin layout authorizes nothing
- [X] T075 [US2] Map `LastAdminError` to **409** and refusal copy in the actions, and existing-member invites to a 409 that states whether that member is currently active or inactive (FR-025, FR-033)
- [X] T076 [P] [US2] Create `components/dashboard/RoleBadge.tsx` and `StatusBadge.tsx` — ⚠️ each MUST carry **text** (`Admin`/`Sales`, `Active`/`Inactive`), not colour alone (FR-044)
- [X] T077 [P] [US2] Create `components/dashboard/MembersTable.tsx` as a Server Component rendering email, role, status, and joined date, with client islands for row actions (FR-009 — rows are data, actions are interactive)
- [X] T078 [P] [US2] Paste and adapt Tremor Raw `Dialog` (backed by `@radix-ui/react-dialog`) into `components/dashboard/Dialog.tsx` — Radix supplies focus trapping, focus restoration on close, `aria-modal`, and escape handling (FR-044)
- [X] T079 [US2] Create `components/dashboard/InviteDialog.tsx` (email + role radio) using `useActionState` over the invite action
- [X] T080 [US2] Create `components/dashboard/ConfirmDialog.tsx` with **distinct copy when the target is the acting Admin**: "You will lose admin access immediately and cannot undo this yourself" (FR-034, FR-035)
- [X] T081 [US2] Create `app/(dashboard)/dashboard/members/page.tsx` calling `requireAdmin()`, plus its `loading.tsx` and `error.tsx` — ⚠️ an unauthorized visitor gets `notFound()`, not a 403, so the route's existence is not confirmed (FR-011)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 — Everyone sees the numbers they are entitled to (Priority: P3)

**Goal**: Sales sees their own count; Admin sees active members and the organisation-wide total.

**Independent Test**: As Sales, generate three proposals and confirm the dashboard reads three and
shows nothing about anyone else. As Admin, confirm both figures match an independent count.

### Tests for User Story 3

- [X] T082 [P] [US3] Add `tests/integration/metrics.spec.ts`: three generations by one member produce exactly three rows and a tile reading 3 (SC-006, FR-014)
- [X] T083 [P] [US3] Add a case to `tests/integration/metrics.spec.ts` asserting a **failed** generation records no row (FR-015)
- [X] T084 [P] [US3] Add a case asserting that when the metric write fails the member **still receives the PDF** and the discrepancy is logged distinguishably (FR-016)

### Implementation for User Story 3

- [X] T085 [US3] Create `server/repo/generations.ts` with `countOwnGenerations(actor: Actor)` and `countOrgGenerations(actor: AdminActor)` — the differing actor types are what make FR-009 a compile-time property
- [X] T086 [US3] Add the `PdfGeneration` insert to `app/api/generate/route.ts` via `after()` from `next/server` — ⚠️ register it **inside the try block and only after `renderPdf` resolves**. `after()`'s callback runs even when the response did not complete successfully, so registering at the top and relying on the error path to skip it does not work (research R11)
- [X] T087 [US3] Confirm the metric write adds no datastore work **inside** the render itself, per Principle III — the insert happens after `renderPdf` has returned
- [X] T088 [US3] Create `app/(dashboard)/dashboard/page.tsx` branching on role — one route, not two parallel dashboards, so a Sales member sees *their* dashboard rather than a 403
- [X] T089 [US3] Render the Sales view: a single "Your PDFs generated" tile plus a prominent link to `/`. ⚠️ Admin data MUST NOT be fetched on this branch, so nothing sensitive reaches the RSC payload (FR-009)
- [X] T090 [US3] Render the Admin view: "Active members" and "Successful PDFs generated" tiles, plus pending invitations
- [X] T091 [US3] Wrap each dashboard figure in its own Suspense boundary so one failing tile shows a retry-able error without taking down the rest (FR-038)
- [X] T092 [US3] Add empty-state copy for zero generations — a deliberate `0` with "No proposals generated yet", never a blank region (FR-037)
- [X] T093 [US3] Verify SC-006: counts match `select count(*)` exactly for both the personal and organisation-wide figures

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T094 [P] Add a nightly invitation-expiry sweep marking `PENDING` rows past `expiresAt` as `EXPIRED` (FR-026)
- [ ] T095 Run `@axe-core/playwright` against `/login`, `/dashboard`, and `/dashboard/members` and fix every WCAG 2.2 AA violation (SC-014)
- [ ] T096 Complete a keyboard-only pass over every task in the new views — sign in, invite, change role, remove, restore, read both dashboards — confirming visible focus throughout and focus trapped in and restored from dialogs (SC-014, FR-044)
- [ ] T097 [P] Document the bootstrap procedure and the **manual** lockout-recovery SQL in `docs/DEVELOPMENT.md` — ⚠️ recovery deliberately requires Supabase console credentials; any in-app break-glass path *is* the backdoor FR-036 exists to prevent
- [X] T098 [P] Update `CLAUDE.md` — required in the same change by Workflow Rules. Move feature 002 from "planned" to its implementation state, and correct the stale line stating feature 001 is at "T001–T060 of 63" (`tasks.md` shows T059/T061/T063 are `[X]`; only **T062** remains open)
  - Done 2026-08-05. Both stale status lines corrected (001 verified against its own `tasks.md` — only T062 open). Added: the auth/data stack, the full command list, the Prisma 7 `.env` and `DIRECT_URL` traps, `server/` + `proxy.ts` + `prisma/` + `components/dashboard/` to Directory Structure, and the new `scripts/` entries. Replaced the "no secrets/env infrastructure exists yet" note, which feature 002 falsified. The open `/sp.analyze` findings are carried inline under the 002 entry so they survive the report. Also updated `lib/CLAUDE.md` with the browser/page reuse rule — it loads automatically under `lib/`, which is where the regression would be reintroduced
- [ ] T099 [P] Update `docs/ARCHITECTURE.md` with the auth and authorization flow
- [ ] T100 Run `/sp.analyze` and resolve any finding, treating constitution conflicts as CRITICAL
- [ ] T101 Run the full suite — `npm run test:unit`, `npm run test:integration`, `npm run check:table-fit`, `npm run lint`, `npm run build` — and state which suite ran against which build in the completion claim (Workflow Rules)
- [ ] T102 Deploy to Vercel and re-run `quickstart.md` against the deployed URL, folding in feature 001's open **T062**
- [ ] T103 Decide whether to add a scheduled keep-alive against free-tier idle suspension — the spec sets **no availability target** deliberately, so this is an operational choice, not a requirement (plan Risk #10)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: T001–T005 gate everything. T006–T010 can proceed in parallel with them.
- **Phase 2 Foundational**: depends on Phase 1. **Blocks all user stories.**
- **Phase 3 (US1)**: depends only on Phase 2. **This is the MVP.**
- **Phase 4 (US2)**: depends only on Phase 2. Independent of US1.
- **Phase 5 (US3)**: depends on Phase 2, plus the dashboard shell **T053–T062** from Phase 4.
- **Phase 6 Polish**: depends on whichever stories shipped.

### The one cross-story dependency, stated honestly

US3 needs the Tailwind shell and shared components (**T053–T062**), which live in US2's phase because
US2 is the earliest story that needs them. This is a dependency on *ten named tasks*, not on US2 as a
whole — US3 does not need members management, invitations, or the advisory lock. If US3 is built
before US2, pull T053–T062 forward.

Everything else is genuinely independent: US1 ships with no dashboard at all.

### Within each user story

Tests before implementation · schema before repositories · repositories before actions · actions
before UI · story complete before moving to the next priority.

### Parallel Opportunities

- T006–T009 in Phase 1
- T027–T029 and T031–T032 in Phase 2
- All four US1 test tasks (T039–T042)
- All four US2 test tasks (T063–T066)
- All three US3 test tasks (T082–T084)
- T059/T060, T076/T077/T078 within US2
- T094, T097, T098, T099 in Polish

---

## Parallel Example: User Story 1

```bash
# All US1 tests together:
Task: "Playwright globalSetup + storageState in tests/integration/auth.setup.ts"
Task: "Auth gating spec in tests/integration/auth-gating.spec.ts"
Task: "Byte-identical PDF spec in tests/integration/pdf-parity.spec.ts"
Task: "Deactivation kill-switch spec in tests/integration/deactivation.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup — ⚠️ **do not skip T001–T005**
2. Phase 2 Foundational
3. Phase 3 US1
4. **STOP and VALIDATE**: signed-out visitors generate nothing; an invited member's PDF is
   byte-identical; a deactivated member is refused on their next request
5. Deploy — this alone closes the brand-integrity hole of an anonymous generator

### Incremental Delivery

Setup + Foundational → US1 (MVP, deploy) → US2 (deploy) → US3 (deploy) → Polish.

### Parallel Team Strategy

After Phase 2: Developer A on US1, Developer B on US2 (including the shell), Developer C joins US3
once T053–T062 land.

---

## Notes

- **103 tasks** — 10 Setup, 28 Foundational, 14 US1, 29 US2, 12 US3, 10 Polish
- ⚠️ Three tasks carry production-only failure modes if done wrong: **T068** (`pg_advisory_lock` vs
  `pg_advisory_xact_lock`), **T031** (`setAll` without its `headers` argument), **T045**
  (`shouldCreateUser: false`). Each names the consequence inline.
- ⚠️ **T011–T014 are configuration, not code.** They produce no diff and will be invisible in review.
  Each has an explicit verification step for exactly that reason.
- The integration suite runs against a production build and **cannot** evidence dev-mode behaviour —
  load pages in a real browser before declaring UI work done
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
