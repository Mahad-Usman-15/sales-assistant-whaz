# Contracts: Auth, Generation, and Admin Operations

**Feature**: `002-rbac-dashboard` · **Date**: 2026-08-01

Companion to `contracts/generate-api.md` (feature 001), which this feature **modifies**.

## Mechanism selection rule

> Anything returning bytes, or that a browser *navigates* to, is a **Route Handler**.
> Anything that is a form mutation whose result is a re-rendered page is a **Server Action**.
> Anything that is a read rendered on the server is **neither** — it is an `async` Server Component
> calling a repository directly.

The last line matters: members list, org metrics, and own-count have **no endpoint**. Zero client JS,
and — more importantly — zero second authorization surface to secure.

> ⚠️ **Server Actions are public HTTP endpoints** with stable, discoverable IDs. Every action below
> begins with `await requireAdmin()` or `await requireUser()`. Being rendered inside an admin layout
> authorizes nothing (Principle VI, FR-008).

---

## Typed errors

| Code | Status | Meaning | Retryable |
|---|---|---|---|
| `validation_failed` | 400 | Input failed schema or catalog checks | No — fix input |
| `unauthenticated` | 401 | No valid session | No — sign in |
| `forbidden` | 403 | Authenticated but not permitted | No |
| `last_admin` | **409** | Would leave zero active Admins | No — promote someone first |
| `method_not_allowed` | 405 | Wrong verb | No |
| `generation_failed` | 500 | Render pipeline failed | Yes |
| `temporarily_unavailable` | **503** | Member store unreachable (FR-045) | **Yes** |

`last_admin` is **409 Conflict** — a state conflict, not bad input and not a server fault.
`temporarily_unavailable` is **503 and must never be reported as `generation_failed`** (FR-045); the
distinction is what stops a sleeping database from sending someone into the Chromium pipeline.

---

## `POST /api/generate` *(modified — feature 001 endpoint)*

- **Purpose**: unchanged — render a proposal PDF.
- **Authorization**: `requireUser()` — any ACTIVE member, either role (FR-012).
- **Validation**: unchanged (`proposalInputSchema`, unknown-id and duplicate-id checks).
- **Request/success response**: **unchanged**. `application/pdf` + `Content-Disposition` +
  `Cache-Control: no-store`. FR-013 requires the bytes be identical to pre-feature output.
- **New side effect**: on success only, an `after()`-registered `PdfGeneration` insert (FR-014, R11).
- **Errors**: 400 · **401** · 405 · 500 · **503**.

Ordering is load-bearing: `requireUser()` runs **before** `renderPdf`; the metric registers **after**
it resolves. Both follow from Principle III — no datastore work inside the render.

## `GET /auth/callback` *(new Route Handler — mandatory)*

- **Request**: `?code=<pkce>` — the magic link *navigates* here, so it cannot be an Action.
- **Behaviour**: `exchangeCodeForSession(code)` → sets `sb-*` cookies → idempotent reconcile of the
  `app_user` row → `redirect('/')`.
- **Authorization**: none. This is how you get one.
- **Errors**: invalid/expired code → `redirect('/login?error=link_expired')`.
  Member exists but INACTIVE → `redirect('/login?error=no_access')` (FR-005; this is where access is
  disclosed, per FR-043 — never at request time).

## Request a sign-in link *(client component, not an endpoint)*

`createBrowserClient(...).auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`.

- ⚠️ **`shouldCreateUser: true` is required by FR-043**, not a convenience. `false` makes the
  provider error on unknown addresses, turning the form into a staff enumerator (R3).
- **Throttling**: provider-configured (R1) — `otp.period` per address, `otp.requests_per_hour`
  project-wide. No application code.
- **Response**: identical for every address — "Check your email." No timing branch (FR-043).

---

## Server Actions

### `inviteUser(formData)`
- **Authorization**: `requireAdmin()` · **Validation**: `inviteInputSchema` (`email` trimmed +
  lowercased, `role`)
- **Behaviour**: insert `invitation` **first**, then send. A send failure leaves a `PENDING` row an
  Admin can revoke and re-issue — better than an email with no backing row (FR-027).
- **Errors**: `validation_failed` · `409` already a member (with their current status, FR-025) ·
  `409` pending invitation exists (from the partial unique index, `P2002` → FR-024) · `500` send
  failure, retryable.

### `updateMember(formData)` — role and/or status, **one action**
- **Request**: `{ userId, role?, status? }` · **Authorization**: `requireAdmin()`
- **Validation**: `updateMemberInputSchema`, then the last-admin invariant **inside** the transaction
  under `pg_advisory_xact_lock` (R7).
- **Covers**: change role (FR-030), remove access (FR-031), **restore with explicit role** (FR-032).
  One locked path for every role/status change is what makes FR-033 auditable.
- **Errors**: `404` not found · **`409 last_admin`** (FR-033) · `503` on lock timeout (`P2028`).

### `revokeInvitation(formData)`
- `requireAdmin()`; `PENDING` → `REVOKED` (FR-027). Idempotent: revoking an already-terminal
  invitation succeeds without change.

### `signOut()`
- `requireUser()`, no input, `redirect('/login')`. A `<form action>` POST is CSRF-safe by
  construction; a GET link is not (FR-007).

---

## Server-only reads (no endpoint)

| Function | Actor type | Serves |
|---|---|---|
| `countOwnGenerations(actor: Actor)` | any active member | FR-018 |
| `countOrgGenerations(actor: AdminActor)` | Admin only | FR-019 |
| `countActiveMembers(actor: AdminActor)` | Admin only | FR-019 |
| `listMembers(actor: AdminActor)` | Admin only | FR-009 |
| `listPendingInvitations(actor: AdminActor)` | Admin only | FR-027 |

**`AdminActor` is a branded type only `requireAdmin()` can produce.** Calling an admin repository
function without having passed the guard is therefore a **compile error**, not a review miss
(Principle VI; Constitution Code Quality — "where a rule can be enforced by the type system … it
MUST be").

Sales dashboards never *fetch* admin data, so nothing sensitive reaches the RSC payload (FR-009).

---

## Guard contract

```
requireUser()  → Actor       | throws UnauthenticatedError | ForbiddenError | StoreUnavailableError
requireAdmin() → AdminActor  | throws (above) | ForbiddenError
```

Wrapped in React `cache()` so a page rendering five server components pays one lookup. Each call
re-reads `role`, `status`, and `lastSeenAt` from `app_user` (FR-006, FR-041) — **never** from a token
claim, and **never** from `user_metadata`, which the subject can write.

Failure mapping: Server Component → `notFound()` (do not confirm the route exists, FR-011) ·
Server Action → throw · Route Handler → typed JSON above.
