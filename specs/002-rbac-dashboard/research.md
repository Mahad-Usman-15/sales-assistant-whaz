# Phase 0 Research: RBAC Dashboard

**Feature**: `002-rbac-dashboard` · **Date**: 2026-08-01 · **Spec**: [spec.md](./spec.md)

Each item states a Decision, its Rationale, and the Alternatives rejected. Items **R1–R4** are new to
this plan: they resolve the five clarifications recorded on 2026-08-01, and two of them overturn
assumptions the earlier architecture sketch was built on.

---

## R1 — Per-address sign-in throttling (FR-042)

**Decision: configure Supabase Auth's existing rate limits. Write no throttling code, add no store.**

Supabase Auth already implements exactly the shape FR-042 asks for, on `/auth/v1/otp`:

| Control | Default | Scope | Customizable |
|---|---|---|---|
| `otp.period` — cooldown before the **same user** may request again | **60 s** | Last request of the user | **Yes** |
| `otp.requests_per_hour` | **30** | Project-wide | **Yes** |
| `email.inbuilt_smtp_per_hour` | **2** | Project-wide | Custom SMTP only |

*Verified against `supabase/supabase` — `packages/shared-data/config.ts` and
`apps/docs/content/_partials/auth_rate_limits.mdx`.*

**Rationale**: FR-042's "short cooldown between consecutive requests for the same address" maps
one-to-one onto `otp.period`, which is enforced per user and is customizable. Building our own
throttle would mean a second store, a second clock, and a second thing to get wrong — for a control
the identity provider already applies *before* our code runs. A throttle that sits in front of the
provider is also strictly better than one behind it: abusive traffic never reaches an email send.

⚠️ **Honest gap, recorded rather than glossed:** FR-042 says "a bounded number per hour." Supabase's
hourly OTP cap is **project-wide**, not per-address. For this deployment that is *stronger* than the
requirement — a single abuser cannot consume more than the whole project's hourly budget, and with a
team this size the project cap will never bind on legitimate use. But it is not literally
per-address, and the plan should not claim it is. If per-address hourly counting is ever genuinely
needed, it becomes application code at that point.

**Alternatives rejected:**
- *Application-level throttle table.* New table, new write on an unauthenticated path (itself a DoS
  amplifier), and it would run *after* the provider's own limit. Strictly worse.
- *IP-based limiting / CAPTCHA.* Explicitly out of scope in the spec, and misfires behind a shared
  office IP — the exact deployment shape here.
- *Edge/CDN rate limiting.* Another surface to configure and reason about for a control already
  available as a project setting.

---

## R2 — 30-day sliding session (FR-041) ⚠️ constitutional conflict found

**Decision: enforce the 30-day window in application code, via a `lastSeenAt` column checked by the
existing per-request guard. Do NOT use Supabase's session controls.**

Research finding that forces this: Supabase sessions **last indefinitely by default**, and the three
settings that would bound them — *time-box*, *inactivity timeout*, *single session per user* — are
**Pro Plan and above**. *(Verified: `apps/docs/content/guides/auth/sessions.mdx` and the Auth session
control announcement.)*

Constitution Principle V caps recurring cost at **$0**. Buying Pro to obtain an inactivity timeout
would breach it, and Principle V requires that justification happen *before* adoption. So the
provider-configured route is unavailable, and FR-041 is not satisfiable by configuration at this
price point.

**Rationale for the application-level route**: `requireUser()` already reads the member row on every
protected request — that read is mandatory anyway, because FR-006 requires the deactivation
kill-switch to consult live state. Adding a `lastSeenAt` comparison to a lookup we are already
performing costs **zero additional queries**. The check is also stronger than the provider's: it is
evaluated per request against live state, which is precisely the shape Principle VI demands, rather
than at token-refresh time.

Write cost is controlled by updating `lastSeenAt` **coarsely** — only when the stored value is more
than an hour old. At 10–50 proposals/day this is a handful of writes per member per day.

⚠️ Consequence to state plainly: the *provider* session remains indefinite. Our 30-day bound is an
application gate, so a stale session is refused by our guard while still being technically valid to
Supabase. That is acceptable — the guard is the security boundary (Principle VI), the provider
session is a transport detail — but a reader must not conclude that "the session expires" in the
identity provider.

**Alternatives rejected:**
- *Buy Supabase Pro.* Breaches Principle V for a single setting.
- *Short JWT TTL to force re-authentication.* Confuses token lifetime with session lifetime and
  attacks the wrong problem; it would also add refresh traffic without bounding session age.
- *Accept indefinite sessions and drop FR-041.* The clarification was explicit; silently dropping it
  would be reinterpreting a decision rather than implementing it.

---

## R3 — Uniform response to a sign-in request (FR-043)

**Decision: call `signInWithOtp` with `shouldCreateUser: true`. Access is denied by the database
trigger, never by the sign-in endpoint.**

This is the non-obvious consequence of FR-043. The instinct, given FR-002's ban on self-service
registration, is `shouldCreateUser: false` — but that makes the provider return an error for an
address it does not know, which is exactly the membership disclosure FR-043 forbids. The sign-in form
would become a staff enumerator.

**Rationale**: with `shouldCreateUser: true`, every address gets the identical "check your email"
response. The auth user is created, the `handle_new_auth_user` trigger finds no matching invitation,
and inserts the member as **INACTIVE** — which satisfies FR-005 exactly ("MUST gain no access, and
the attempt MUST be recorded rather than silently discarded"). The person discovers they have no
access only after following the link (US1 scenario 4), which is where the spec already places that
disclosure. FR-002 is upheld because creating an auth row grants nothing; membership is the
`app_user` row's ACTIVE status, and only an invitation produces one.

**Alternatives rejected:**
- *`shouldCreateUser: false`.* Directly violates FR-043.
- *Pre-check membership, then branch.* Reintroduces the timing difference FR-043 forbids and adds a
  query to an unauthenticated path.

---

## R4 — Email delivery is a blocking dependency, not a nice-to-have

> ### ✅ REVISED 2026-08-02 — provider changed, conclusion unchanged
>
> The original decision named **Resend**. That is not usable here: Resend, like every transactional
> provider, requires **domain** verification (SPF/DKIM), and Whaz's only address is
> `whazpk@gmail.com` — nobody can add DNS records to `gmail.com`. The finding that forced this was
> in the repo the whole time: the brand material lists a Gmail address and no owned domain.
>
> **Revised decision: Gmail SMTP** — `smtp.gmail.com:587` (TLS), username `whazpk@gmail.com`,
> password = a Google **App Password**, entered as Supabase's `smtp_pass`.
>
> - Requires **2-Step Verification** on the Google account. Google removed "less secure app" access
>   in May 2025, so an App Password is now the only SMTP path; it remains fully supported in 2026.
> - Free, and needs no domain — the account authenticates as itself rather than proving control of
>   a domain.
> - Gmail's free sending allowance (~500 recipients/day) is roughly 25× this team's need.
> - ⚠️ Unexpected upside: the sender becomes `whazpk@gmail.com`, **the same address printed on the
>   letterhead**. That closes the sender-trust risk a third-party domain would have introduced with
>   a non-technical audience, rather than merely mitigating it.
> - Residual risks: the tool now depends on one Google account (rotate the App Password if it
>   leaks — it grants full mailbox send access), and Gmail may throttle abnormal volume. Neither
>   binds at ~10–20 emails/day.
>
> Everything below still holds: the *conclusion* — that the built-in Supabase sender cannot carry
> this feature and custom SMTP is blocking, not polish — is unchanged. Only the provider moved.

**Original decision (superseded): custom SMTP (Resend free tier — 3k/month, preserves the $0 ceiling) is required before
FR-003, FR-022, or FR-027 can be considered working. Treat it as Phase 1 scope, not Phase 6 polish.**

**Rationale**: the built-in sender is capped at **2 emails per hour, project-wide** (R1 table). That
is not a soft limit that degrades under load — with passwordless sign-in it is the *primary* auth
path. Three members signing in on a Monday morning exhausts the hour. This makes email a hard
dependency of FR-003 (every sign-in), not only of invitations, which is a stronger statement than the
spec's Dependencies section makes.

**Alternatives rejected:** *ship on the built-in sender and swap later* — the failure mode is silent
non-delivery, which presents as "the tool is broken" and is untraceable from the app.

---

## R5 — Fail-closed and the fourth typed error (FR-045)

**Decision: the guard throws a distinct `StoreUnavailableError`; `POST /api/generate` maps it to
`503 { error: 'temporarily_unavailable', retryable: true }`. Views render a dedicated unavailable
state, not the generic error boundary.**

**Rationale**: the route already exposes typed errors (`validation_failed`, `generation_failed`,
`method_not_allowed`). FR-045 requires unavailability to be distinguishable from render failure,
because collapsing them sends diagnosis into the Chromium pipeline when the cause is a dependency.
`503` is the correct status — the server is functioning and the condition is transient — and it is
the only one of the four that is legitimately retryable without changing input.

**Alternatives rejected:** *reuse `generation_failed` (500)* — explicitly named a defect by FR-045.
*Return 401* — wrong: the member may well be authorized; we simply cannot tell, and 401 would trigger
the client's sign-out redirect and destroy a valid session.

---

## R6 — Accessibility (FR-044, SC-014)

**Decision: paste Tremor Raw components (Radix-backed) and hold them to WCAG 2.2 AA; verify with
`@axe-core/playwright` in the existing integration suite plus a keyboard-only pass.**

**Rationale**: Tremor Raw's dialog is built on `@radix-ui/react-dialog`, which supplies focus
trapping, focus restoration on close, `aria-modal`, and escape handling — the parts of FR-044 most
often missed and most tedious to hand-roll. Because Tremor Raw is *copied source*, remaining AA gaps
(accessible names on icon-only row actions, table caption/scope) are edits we own rather than
upstream issues we wait on.

FR-044's "state never conveyed by colour alone" is the clause with teeth: `RoleBadge` and
`StatusBadge` must carry text (`Admin` / `Sales`, `Active` / `Inactive`), not hue alone. Recorded
here because it is easy to satisfy at build time and expensive to retrofit.

**Alternatives rejected:** *manual audit only* — not a repeatable gate, and SC-014 asks for an
automated check. *A full a11y suite across the app* — out of scope per spec; would drag in the
existing generator.

---

## R7 — The last-Admin invariant under concurrency (FR-033, SC-004)

**Decision: `pg_advisory_xact_lock(hashtext('app_user:admin_invariant'))` taken at the top of a
single interactive transaction, then re-count, then mutate. One `updateMember` operation handles role
and status together. A statement-level trigger is added as a documented backstop.**

**Rationale**: a `count() > 1` check under READ COMMITTED permits **write skew** — two admins
deactivating each other never touch the same row, so there is no lock conflict to detect, and
`SELECT ... FOR UPDATE` on the target row changes nothing. The predicate being violated is not a
lockable object at this isolation level. A constant lock key serialises *all* admin mutations, which
is correct because the invariant is global; at single-digit admin changes per month the contention
cost is nil.

⚠️ **`pg_advisory_xact_lock`, never `pg_advisory_lock`.** The session-scoped variant would leak onto
a pooled connection and be inherited by an unrelated request — a permanent deadlock that only ever
appears in production.

**Alternatives rejected:** *partial unique index* (enforces *at most one*; the invariant is *at least
one* — not expressible). *CHECK constraint* (row-local, cannot see other rows). *Statement trigger
alone* (under READ COMMITTED it cannot see the other transaction's uncommitted work; both pass).
*SERIALIZABLE* (correct, but Prisma does not auto-retry `40001`, and surfacing "please try again" for
an operation that happens twice a month is a poor trade).

---

## R8 — Data access: Prisma 7 through the pooler

**Decision**: `prisma-client` generator (not `prisma-client-js`), mandatory `output` → `generated/prisma`,
`@prisma/adapter-pg` driver adapter, `prisma.config.ts`, `pool max: 3`.

```
DATABASE_URL = postgres://…pooler.supabase.com:6543/postgres?pgbouncer=true   # transaction mode
DIRECT_URL   = postgres://…pooler.supabase.com:5432/postgres                  # SESSION pooler
```

⚠️ `DIRECT_URL` must be the **session pooler on 5432**, not `db.<ref>.supabase.co`. The true direct
host is IPv6-only on projects created since 2024; Vercel build containers are IPv4, so migrations
fail with `ENETUNREACH`.
⚠️ Prisma 7 **no longer auto-loads `.env`** — `prisma.config.ts` must load it explicitly.
> ### ✅ CORRECTED 2026-08-01 — this item was wrong when first written
>
> The original text read: *"`prisma.config.ts`'s `Datasource` type has no `directUrl`; keep
> `directUrl` in `schema.prisma`."* **The opposite is true in Prisma 7.9.1**, and it is not a
> deprecation warning — schema validation fails outright:
>
> ```
> error: The datasource property `url` is no longer supported in schema files.
> error: The datasource property `directUrl` is no longer supported in schema files.
> Validation Error Count: 2   [P1012]
> ```
>
> Corrected mechanism, verified by running `prisma generate` in this repo:
>
> - `prisma/schema.prisma` → `datasource db { provider = "postgresql" }` and **nothing else**.
>   `url`, `directUrl`, and `shadowDatabaseUrl` are all rejected.
> - `prisma.config.ts` → `datasource: { url: env('DIRECT_URL') }`. Counter-intuitively this field
>   takes the **direct/session** URL, because the CLI uses it for migrations.
> - The **pooled** runtime URL appears in neither file — it reaches `new PrismaClient()` via the
>   adapter in `server/db/client.ts`.
> - ⚠️ `DIRECT_URL` must resolve for **`prisma generate` itself**, not only for `migrate`. An unset
>   variable aborts with `PrismaConfigEnvError`, so it belongs in Vercel's *build* environment, not
>   just the runtime one.
>
> Recorded rather than silently edited: the original claim was plausible and would have been
> repeated by the next reader.

**Rationale**: transaction-mode pooling is required for serverless; `pgbouncer=true` disables
prepared statements accordingly. Prisma 7's adapter path ships no Rust query engine, which partly
offsets adding Prisma to a function that already unpacks Chromium.

**Alternatives rejected:** *direct connection* (exhausts Postgres connections from serverless);
*Prisma 6* (would be new code written against a superseded major).

---

## R9 — Route middleware on Next.js 16

**Decision: `proxy.ts` at repo root exporting `proxy`. Session refresh and redirect only — never an
authorization decision.**

`middleware.ts` does not exist in Next.js 16; the build throws if both files are present. The `proxy`
runtime is `nodejs` and is **not configurable**. *(Verified against the Next.js 16 upgrade guide.)*

⚠️ Next renames `proxy.js` → `middleware.js` and patches the NFT trace **only under webpack** —
skipped under Turbopack, which Next 16 uses by default and which this repo already configures. Verify
on the first preview deploy; fall back to `next build --webpack` if `proxy` appears not to run.

**Rationale**: Next has shipped middleware-bypass advisories (the `x-middleware-subrequest` class).
FR-008 and Principle VI both require the real check to live elsewhere.

---

## R10 — Styling: Tailwind v4 scoped to the dashboard

**Decision**: `app/(dashboard)/dashboard.css` importing Tailwind v4 **with `preflight.css` omitted**
and `source(none)` plus explicit `@source` globs; a non-inline `@theme` block aliasing namespaced
Tailwind names to the existing `:root` variables; `class="dark"` on `<html>` with the `gray-*` ramp
overridden.

**Rationale**: omitting `preflight.css` is the only mechanism that disables the reset **without a
config flag**, and the reset is the entire risk — `app/globals.css` styles bare `input` selectors
directly (44px min-height, `--raise-1` background, 3px `:focus-visible` outline). `source(none)` +
explicit globs is a *build-time* guarantee that `ProposalForm.tsx` is never scanned — strictly
stronger than a class prefix. Non-inline `@theme` emits `var()` references, so `globals.css` stays
the single source of truth and edits propagate.

Overriding the `gray-*` ramp reskins every pasted Tremor component at once with zero source edits —
the highest-leverage move available, since Tremor Raw is written against `gray-*`/`blue-*`.

⚠️ Skip `@tailwindcss/forms` (default strategy restyles bare `input`/`select`, reintroducing the
reset just removed). ⚠️ Tremor components import `cx` from `@/lib/utils`; `lib/CLAUDE.md` declares
`lib/` framework-free, so this goes to `components/dashboard/utils.ts` with the import adjusted.

**Alternatives rejected:** *prefix all utilities* (Tremor source ships thousands of unprefixed
classnames); *migrate `globals.css` to Tailwind* (455 lines of measured brand CSS — the unrelated
refactor Principle IV forbids); *`@tremor/react`* (legacy, `react: ^18` peer, incompatible with
React 19).

---

## R11 — Recording a usage record (FR-014, FR-015, FR-016)

**Decision**: register an `after()` callback **inside the try block and only after `renderPdf`
resolves**.

```
const pdf = await renderPdf(html, input.proposalDate);   // success established HERE
after(async () => { /* INSERT */ });                     // register ONLY here
return new Response(...);
```

⚠️ `after()`'s callback runs **even if the response did not complete successfully**, so registering
it at the top of the handler and relying on the error path to skip it does not work.

**Rationale**: keeps the database off the response path, satisfying FR-016 (a failed write never
withholds a delivered PDF) and Principle III (no datastore inside the render). **Fallback**: if
`after()` proves unreliable on Hobby Fluid Compute, `await` the insert — one pooled round trip
(~20–50 ms) against a 3–8 s render is noise.

**Alternatives rejected:** *PENDING-then-UPDATE* (two round trips; a timed-out invocation leaves an
immortal PENDING row carrying no information the log lacks). *Client-called `POST /api/generations`*
(hands the counter to the client — forgeable and skippable, breaking FR-014 and SC-006).

---

## R12 — Restore with explicit role (FR-032)

**Decision**: restore reuses the same `updateMember(actor, targetId, { role, status })` operation and
the same advisory lock; the UI pre-fills the role held at removal.

**Rationale**: the member row persists through removal, so the prior role is simply still there — no
history table needed. Routing restore through the one locked mutation means there is exactly one code
path where role and status change, which is what makes FR-033 auditable. Restoring can only *raise*
the active-admin count, so it can never trip the invariant, but it goes through the lock anyway
rather than creating a second, subtly different path.

**Alternatives rejected:** *a separate `restoreMember` operation* — two paths to get the lock right,
and the second gets added later by someone who did not read this.

---

## Resolved unknowns

| Unknown from Technical Context | Resolution |
|---|---|
| How to satisfy FR-042 without new infrastructure | R1 — provider configuration |
| Whether FR-041 is achievable at $0 | R2 — not by configuration (Pro-only); yes in application code |
| Whether FR-043 conflicts with FR-002 | R3 — no, given `shouldCreateUser: true` + trigger |
| Whether the built-in email sender is viable | R4 — no, 2/hour project-wide; custom SMTP is blocking |
| How to express "temporarily unavailable" | R5 — `503 temporarily_unavailable` |
| Whether Tremor meets FR-044 | R6 — Radix covers focus management; badges need text labels |

**No `NEEDS CLARIFICATION` markers remain.**
