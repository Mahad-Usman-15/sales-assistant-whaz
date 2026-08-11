# Implementation Plan: RBAC Dashboard

**Branch**: `002-rbac-dashboard` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-rbac-dashboard/spec.md`

## Summary

Wrap the existing, unchanged proposal pipeline in identity. Every surface — including
`POST /api/generate` — requires a signed-in ACTIVE member; two roles (Admin, Sales) are enforced
server-side on every request from live database state; and a dashboard reports per-member and
organisation-wide generation counts.

The pipeline itself is not modified: `lib/` stays framework-free, the renderer touches no datastore,
and FR-013/SC-007 require byte-identical output. Identity is a precondition checked before the render
and a metric registered after it — Principle III's "additive extension" shape, literally.

**Technical approach** (from `research.md`): Supabase Auth passwordless magic link + Supabase Postgres
via Prisma 7 driver adapters through the Supavisor transaction pooler; authorization in TypeScript
behind branded actor types; RLS default-deny as a blast-radius limiter, not the authorization model;
Tailwind v4 + Tremor Raw scoped so it cannot touch `app/globals.css`.

**Two research findings overturned the pre-spec architecture sketch:**

1. **FR-042 needs no code.** Supabase Auth already throttles `/auth/v1/otp` per address
   (`otp.period`, 60 s, customizable) and per project-hour (`otp.requests_per_hour`, 30). The sketch
   assumed a throttling mechanism had to be built. It does not — it has to be *configured*. (R1)
2. **FR-041 is not achievable at $0 through configuration.** Supabase sessions last **indefinitely**
   by default, and time-box / inactivity-timeout are **Pro Plan and above** — buying that would
   breach Principle V. The 30-day window therefore moves into application code as a `lastSeenAt`
   check inside the guard's already-mandatory per-request lookup, costing zero extra queries. (R2)

A third finding is smaller but sharper: **FR-043 forces `shouldCreateUser: true`** on sign-in. The
intuitive `false` makes the provider error on unknown addresses, which is precisely the membership
disclosure FR-043 forbids. (R3)

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) on Node.js — Vercel's Node runtime. **Never Edge**:
`playwright-core` + `@sparticuz/chromium` require full Node, and Next 16's `proxy` runtime is fixed
to `nodejs` and not configurable.
**Primary Dependencies**: existing — Next.js 16.2, React 19.2, `zod` 4.4, `playwright-core`,
`@sparticuz/chromium`. Added — `@supabase/supabase-js`, `@supabase/ssr`, `prisma` 7 +
`@prisma/client` + `@prisma/adapter-pg`, `tailwindcss` v4 + `@tailwindcss/postcss`,
`tailwind-variants` + `clsx` + `tailwind-merge` + `@remixicon/react`, `@radix-ui/react-dialog`,
`server-only`. Dev — `@axe-core/playwright`.
**Storage**: Supabase Postgres. `DATABASE_URL` → Supavisor **transaction** pooler `:6543`
(`pgbouncer=true`); `DIRECT_URL` → Supavisor **session** pooler `:5432` (⚠️ *not*
`db.<ref>.supabase.co`, which is IPv6-only and unreachable from Vercel's IPv4 build containers).
No object storage — PDFs are never persisted (FR-017).
**Testing**: `vitest` (unit, no DB) · `@playwright/test` (integration, against a production build) ·
a real-Postgres concurrency suite for FR-033 · `@axe-core/playwright` for SC-014.
**Target Platform**: Vercel Hobby/Free, Node runtime, `maxDuration: 60` on the generate route.
**Project Type**: Web application — single Next.js app, App Router.
**Performance Goals**: signed-in proposal production stays under the 2-minute target (SC-013); guard
adds one indexed PK lookup (~5–20 ms through the pooler), `cache()`-deduped per request.
**Constraints**: $0 recurring (Principle V) — Supabase free tier, Gmail SMTP, Vercel Hobby. No
domain is owned (Whaz's only address is `whazpk@gmail.com`), which rules out every ESP that requires
DNS verification; see research R4.
Zero network fetches during render (Principle III + Security Requirements). No AI in render path
(Principle I). Byte-identical PDF output (FR-013).
**Scale/Scope**: single-digit to low-double-digit members (Assumption 13); 10–50 proposals/day;
~11 new routes/views, 3 tables, 5 migrations.

**No `NEEDS CLARIFICATION` items remain** — the five spec clarifications (2026-08-01) plus R1–R6
resolved them.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial evaluation (pre-Phase 0): PASS.** Re-verified post-Phase 1 design: **PASS** against
constitution **v4.0.1**.

*This feature was **forbidden** under v3.0.0, whose Principle III required the pipeline to remain
"stateless, with no required database, authentication, or persistent storage." The amendment to
v4.0.0 landed on 2026-08-01 **before any code was written** — the ordering Governance demands
("Implementation MUST NOT precede its amendment"), and the first time in this project that ordering
was achieved rather than recovered from. No exception is outstanding.*

| Principle | Verdict | How this plan satisfies it |
|---|---|---|
| **I. Deterministic Rendering — Zero AI** | ✅ PASS | No model anywhere. Identity adds no content to the PDF; FR-013 and SC-007 require byte-identical output, which is a stronger guarantee than determinism alone. |
| **II. Brand Fidelity Is Ground Truth** | ✅ PASS | The render path, the letterhead raster, and `lib/` are untouched. FR-040 and SC-008 require `/` to be **pixel-identical** after Tailwind is introduced — the mechanism (omitting `preflight.css`, `source(none)` + explicit `@source`) is a *build-time* guarantee that `ProposalForm.tsx` is never even scanned (R10). |
| **III. Additive Extension** | ✅ PASS | The renderer performs no datastore or network work. `requireUser()` completes **before** `renderPdf`; the metric registers **after** it resolves (R11). `lib/` stays framework-free — all server-only code lives in `server/`, which is why it is not in `lib/`. FR-016 encodes the "a stateful failure must not void a successful render" clause verbatim. |
| **IV. Small, Spec-Driven Increments** | ✅ PASS | Scoped to FR-001…FR-045. Six phases, each independently verifiable. No permission table (two fixed roles); no speculative dependencies — only Radix packages for components actually pasted. `globals.css` is not migrated. |
| **V. Cost Ceiling ($0)** | ⚠️ **PASS with two named constraints** | Supabase free + Gmail SMTP + Vercel Hobby — genuinely $0, no domain purchased. **The ceiling bit twice, and both are recorded rather than discovered later**: (1) R2 — Supabase's session controls are Pro-only, so FR-041 moved into application code instead of being bought; (2) R4 — owning no domain rules out every ESP requiring DNS verification, so email goes through Gmail SMTP. Principle V requires cost justification *before* adoption, and both alternatives (Pro plan, a registered domain) were declined explicitly rather than by omission. |
| **VI. Authorization Server-Enforced, Every Request, Live State** | ✅ PASS | Bullet-for-bullet below. |

### Principle VI, one-for-one

| VI's binding consequence | Where it lands |
|---|---|
| Role/status re-read from the app's own table each protected request | `requireUser()` / `requireAdmin()`, `cache()`-wrapped (FR-006, FR-041) |
| Role never from subject-writable metadata | `invitation.role` is the only carrier; `user_metadata` is never read (data-model, R3) |
| Middleware is not a security boundary | `proxy.ts` redirects only; every surface re-checks (R9, FR-008) |
| Server Actions begin with their own check | Every action opens `await requireAdmin()` (contracts) |
| Data access takes a guard-produced actor type | `AdminActor` is producible only by `requireAdmin()` → a missing check is a **compile error** |
| Cross-row invariants under an explicit lock, tested on two connections | `pg_advisory_xact_lock` + re-count (R7); `tests/integration/db/last-admin.test.ts` (SC-004) |
| RLS default-deny, described honestly | Enabled, zero policies, `REVOKE`; data-model states plainly that **Prisma bypasses it as table owner** |

### Technology Constraints & Security Requirements

Node everywhere, Edge never ✅ · Supabase Postgres through the pooler, no direct connection from a
function ✅ · passwordless, no password ever stored/hashed/reset ✅ · `auth.users` not managed by app
migrations ✅ · PDFs never persisted, usage record holds actor + timestamp only ✅ (FR-017) ·
`globals.css` not migrated, Tailwind base layer omitted, scanner restricted ✅ (R10) · vendored
component source over runtime dependency ✅ (Tremor Raw) · catalog **not** migrated to the DB ✅ ·
`SUPABASE_SECRET_KEY` confined to `server/auth/admin.ts` behind `import 'server-only'`, never
`NEXT_PUBLIC_` ✅ · `setAll` forwards its `headers` second argument ✅ · removal is reversible
deactivation, records survive ✅ · no deployed bootstrap surface ✅ (FR-036).

**Workflow Rules** — ⚠️ *"A known defect in a surface a new feature depends on MUST be fixed before
that feature is built on top of it."* The sustained-generation defect is exactly that, which is why
**Phase 0 gates everything** and why SC-009 is a spec-level criterion rather than a plan note.

## Project Structure

### Documentation (this feature)

```text
specs/002-rbac-dashboard/
├── plan.md              # This file
├── spec.md              # 45 FRs, 14 SCs, Clarifications session 2026-08-01
├── research.md          # Phase 0 — R1–R12
├── data-model.md        # Phase 1 — 3 tables, trigger, migration order
├── quickstart.md        # Phase 1 — setup + per-phase verification
├── checklists/requirements.md
├── contracts/
│   └── auth-and-admin.md   # Phase 1 (feature 001's generate-api.md is modified, not replaced)
└── tasks.md             # Phase 2 output (/sp.tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
  page.tsx                       # UNCHANGED (proposal form)
  layout.tsx                     # + class="dark" on <html>
  globals.css                    # UNTOUCHED — brand source of truth
  (auth)/login/page.tsx          # NEW
  auth/callback/route.ts         # NEW
  (dashboard)/
    layout.tsx                   # requireUser(); imports dashboard.css
    dashboard.css                # NEW — Tailwind v4 scoped + @theme bridge
    dashboard/
      page.tsx  loading.tsx  error.tsx
      members/ page.tsx  loading.tsx  error.tsx
      actions.ts                 # 'use server'
  api/generate/route.ts          # + requireUser(), 401, 503, after() metric

proxy.ts                         # NEW — NOT middleware.ts (Next 16)

server/                          # NEW — server-only; deliberately not lib/
  db/client.ts                   # Prisma singleton, import 'server-only'
  auth/supabase.ts  admin.ts  guard.ts
  repo/users.ts  invitations.ts  generations.ts   # actor-first signatures
  errors.ts                      # LastAdminError, ForbiddenError, StoreUnavailableError

lib/                             # UNCHANGED except one addition
  schema.ts catalog.ts pdf.ts …  # render pipeline, framework-free
  rbac-schema.ts                 # NEW — shared zod; imports NO Prisma

components/
  ProposalForm.tsx               # one new branch (401 → /login)
  dashboard/                     # NEW — Tremor Raw + utils.ts

prisma/schema.prisma  migrations/  seed.ts
prisma.config.ts
generated/prisma/**              # gitignored
scripts/bootstrap-admin.ts       # NEVER deployed
tests/unit/  tests/integration/  tests/integration/db/
```

**Structure Decision**: single Next.js application (the frontend/backend split does not apply — App
Router colocates them). The one structural addition is **`server/`**, deliberately *not* `lib/`:
`lib/CLAUDE.md` declares `lib/` framework-free and unit-testable without booting Next, Chromium, or a
database. Prisma and the Supabase SSR client are none of those. Two enforcement mechanisms, both
required: `import 'server-only'` at the top of `server/db/client.ts` (throws at *build* time if
reached from a `'use client'` graph), and never importing `generated/prisma` from `lib/` or
`components/`. Convention alone is not enforcement.

## Implementation Phases

| Phase | Objective | Gate |
|---|---|---|
| **0 — Fix `/tmp` exhaustion** *(hard prerequisite)* | Memoised module-scope `getBrowser()`; one long-lived `Page` per instance and **nothing closed per request**; `isConnected()`/`isClosed()` self-heal for genuine crashes only; renders serialised at 1 per instance. ⚠️ *This row originally read "per-request `newContext()`/close in `finally`… semaphore (~2)" — corrected 2026-08-03. `--no-startup-window` + `--single-process` mean closing a context **or** a page kills the browser, so both variants relaunched Chromium every render and reproduced the very defect this phase fixes (Vercel 2026-08-02: 17 relaunches across 20 requests, 3 successes). See tasks T002–T004* | 20 sequential generations on one instance, all 200 (**SC-009**) |
| **1 — Data foundation** | Supabase project; Prisma 7 schema + migrations 1–5; `handle_new_auth_user`; RLS lockdown; `.env.example`; `scripts/bootstrap-admin.ts`; **custom SMTP (R4 — blocking, not polish)**; configure `otp.period` / `otp.requests_per_hour` (**R1 — FR-042 is satisfied here, in configuration**) | Bootstrap creates one ACTIVE ADMIN via the invite path and refuses on second run; publishable key reads nothing |
| **2 — Auth + guard** | `proxy.ts`; `/login`; `/auth/callback`; `server/auth/*`; `lastSeenAt` + 30-day check (**R2 — FR-041**); `requireUser()` + 401/503 in `/api/generate`; `ProposalForm` 401 branch; Playwright `globalSetup` + `storageState` | Existing suite green under auth; a removed member is refused on their **next** request (**SC-005**) |
| **3 — Dashboard shell** | Tailwind v4 + PostCSS; `dashboard.css`; `class="dark"`; `components/dashboard/utils.ts`; `StatCard`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, unavailable state; `loading.tsx`/`error.tsx` | `/` **pixel-identical** to pre-change (**SC-008**) |
| **4 — Admin features** | `server/repo/*`; `updateMember` under the advisory lock; `LastAdminError` → 409; invite + revoke actions; `MembersTable`, `RoleBadge`, `StatusBadge`, `InviteDialog`, `ConfirmDialog`; restore-with-role (FR-032) | Two-connection race test passes (**SC-004**) |
| **5 — Metrics + Sales view** | `PdfGeneration` write via `after()`; admin tiles; Sales own-count; role-branched `/dashboard` | Counts match `select count(*)` exactly (**SC-006**) |
| **6 — Hardening** | Invite-expiry sweep; a11y pass + `@axe-core/playwright` (**SC-014**); `docs/DEVELOPMENT.md` (bootstrap + lockout recovery); **`CLAUDE.md` update**; `/sp.analyze`; deploy verification (folds in feature 001's open T062) | Full suite green; deployed |

Accessibility (FR-044) is **built in during phases 3–4 and verified in 6** — not a phase-6 retrofit.
FR-044's "state never by colour alone" is a build-time decision for the badges (R6).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

**No violations.** One deviation from the *obvious* implementation is recorded — not as an exception,
but because the reasoning must survive:

| Deviation | Why | Simpler alternative rejected because |
|---|---|---|
| FR-041's 30-day window enforced in application code rather than provider configuration | Supabase's session controls are **Pro Plan only**; buying them would breach Principle V ($0 ceiling) | Configuring the provider is simpler *and unavailable at this price*. The app-level check rides on a lookup the guard already performs (zero extra queries) and is evaluated per request against live state — which is what Principle VI asks for anyway, so this is arguably the better design and not merely the affordable one. |

## Risks

| # | Risk | Severity | Response |
|---|---|---|---|
| 1 | `/tmp` exhaustion at ~7 renders/instance | 🔴 Critical | Phase 0 gates everything. Auth makes it **worse** — the same members keep one instance warm |
| 2 | `pg_advisory_lock` used instead of `pg_advisory_xact_lock` | 🔴 Critical | Session-scoped lock leaks onto a pooled connection → production-only permanent deadlock. Comment the migration; the race test catches it |
| 3 | Role read from `user_metadata` | 🔴 Critical | Full privilege escalation. `invitation` is the only carrier (R3, data-model) |
| 4 | `setAll` called without its `headers` argument | 🔴 Critical | A CDN can serve one member's session to another |
| 5 | Built-in email sender (2/hour, project-wide) | 🟠 High | **Blocks FR-003, not just invites** — three Monday sign-ins exhaust the hour. Custom SMTP in Phase 1 (R4) |
| 6 | `proxy.ts` NFT trace skipped under Turbopack | 🟠 High | Verify on the **first** preview deploy; `next build --webpack` fallback (R9) |
| 7 | `DIRECT_URL` IPv6 trap | 🟡 Medium | Session pooler `:5432`, never `db.<ref>.supabase.co` (R8) |
| 8 | Prisma 7 no longer auto-loads `.env` | 🟡 Medium | `prisma.config.ts` loads it explicitly; will bite on day one otherwise (R8) |
| 9 | Existing Playwright suite 401s under auth | 🟡 Medium | `globalSetup` + `storageState`, Phase 2. `fullyParallel: false` is already set — fortunate, since the DB is now shared mutable state |
| 10 | Free-tier database suspends when idle | 🟡 Medium | Spec sets **no availability target** (deliberate). FR-045 makes the failure legible; whether to add a keep-alive is an operational choice deferred to Phase 6 |
| 11 | Two styling systems coexist | 🟡 Medium | Accepted — migrating 455 lines of measured brand CSS is the unrelated refactor Principle IV forbids |
| 12 | Cold start now = Prisma init + TLS + Chromium | 🟡 Medium | Prisma 7's adapter path ships no Rust engine, offsetting much of it. Measure against the 30 s bar |
| 13 | RLS creates false confidence | 🟢 Low | Stated plainly in data-model: Prisma bypasses RLS as table owner |

## Next

`/sp.tasks` to decompose these phases. **ADR-0002 remains outstanding** as a suggestion.
