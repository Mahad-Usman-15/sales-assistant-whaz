# Phase 1 Data Model: RBAC Dashboard

**Feature**: `002-rbac-dashboard` · **Date**: 2026-08-01 · **Spec**: [spec.md](./spec.md)

Three application tables in `public`, plus one trigger on Supabase's `auth.users`. Prisma models are
PascalCase with camelCase fields, mapped to snake_case in Postgres.

---

## Enums

| Enum | Values | Source |
|---|---|---|
| `Role` | `ADMIN`, `SALES` | FR-004 |
| `UserStatus` | `ACTIVE`, `INACTIVE` | FR-004 |
| `InvitationStatus` | `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED` | FR-024, FR-026, FR-027 |

`Role` and `UserStatus` are closed sets. `lib/rbac-schema.ts` declares `ROLES` as a `const` tuple and
a unit test asserts set-equality with the generated Prisma enum — see "Cross-boundary consistency".

---

## `AppUser` → `public.app_user`

The application's identity record (spec entity: **Member**).

| Field | Type | Constraints | Why |
|---|---|---|---|
| `id` | `uuid` | PK; **equals `auth.users.id`**; FK → `auth.users(id)` `ON DELETE RESTRICT` | One identity, two systems. RESTRICT because soft-removal means the row must survive, and an accidental auth-user delete must fail loudly rather than silently vaporise history (FR-021, FR-032). |
| `email` | `citext` | UNIQUE, NOT NULL | FR-028 — addresses differing only in case are the same person. `citext` makes this a database property, not a convention. Denormalised from `auth.users` so the members list needs no admin-API call per row. |
| `role` | `Role` | NOT NULL, default `SALES` | FR-004. Persists through removal so restore can default to it (FR-032). |
| `status` | `UserStatus` | NOT NULL, default `INACTIVE` | FR-004. **Default INACTIVE is deliberate** — an auth user created without an invitation lands denied (FR-005, R3). |
| `deactivatedAt` | `timestamptz?` | nullable | Audit; distinguishes "never activated" from "removed". |
| `lastSeenAt` | `timestamptz` | NOT NULL, default `now()` | **FR-041.** Updated coarsely (only when > 1 h stale). The guard refuses when `now() - lastSeenAt > 30 days`. See R2. |
| `invitedById` | `uuid?` | FK → `app_user(id)` `ON DELETE SET NULL` | FR-029. SET NULL, not RESTRICT — the inviter leaving must not block their own removal, and losing the pointer is acceptable where losing the invitee is not. |
| `createdAt` | `timestamptz` | default `now()` | FR-029 ("when they joined"). |

**Indexes**
- `@@index([role, status])` — serves the active-admin count in the hot invariant path (FR-033) and
  the active-member tile (FR-019).
- UNIQUE on `email` (via `citext`).

**State transitions**

```
(auth user created)
    ├── matching PENDING invitation ──► ACTIVE, role = invitation.role
    └── no invitation                ──► INACTIVE, role = SALES   (FR-005)

ACTIVE ──(admin removes, FR-031)──► INACTIVE  [blocked by FR-033 if last active Admin]
INACTIVE ──(admin restores with explicit role, FR-032)──► ACTIVE
```

There is no `DELETED` state. Permanent deletion is out of scope, and `ON DELETE RESTRICT` is what
makes "history survives removal" structurally true rather than a convention.

---

## `Invitation` → `public.invitation`

A pending grant of access carrying the role an Admin chose (spec entity: **Invitation**).

| Field | Type | Constraints | Why |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `email` | `citext` | NOT NULL | FR-028. |
| `role` | `Role` | NOT NULL | **The security reason this table exists.** See below. |
| `status` | `InvitationStatus` | NOT NULL, default `PENDING` | FR-024, FR-026, FR-027. |
| `invitedById` | `uuid` | FK → `app_user(id)` `ON DELETE RESTRICT` | FR-029; the audit trail must not lose who issued a grant. |
| `expiresAt` | `timestamptz` | NOT NULL (issued + 7 days) | FR-026, Assumption 7. |
| `acceptedAt` | `timestamptz?` | nullable | |
| `createdAt` | `timestamptz` | default `now()` | |

**Indexes**
- **Partial unique index on `(email) WHERE status = 'PENDING'`** — FR-024 becomes a database
  guarantee, not a checked condition. Two admins inviting the same address simultaneously produce a
  `P2002`, which the action maps to "already invited"; no read-then-write race exists.
- `@@index([status, expiresAt])` — serves the expiry sweep and the pending-invitations view.

**Why this table exists at all — the load-bearing reason.** The role an Admin chose must survive the
gap between "invited" and "signed in", in a form **the invitee cannot alter**. The obvious carrier,
Supabase's `raw_user_meta_data` / `user_metadata`, is **writable by the user** via
`supabase.auth.updateUser()` — a privilege-escalation primitive. A server-owned row is the only
trustworthy carrier (FR-010, FR-023, Principle VI).

**State transitions**

```
PENDING ──(invitee signs in, trigger matches)──► ACCEPTED
PENDING ──(admin revokes, FR-027)────────────► REVOKED
PENDING ──(expiresAt passes, nightly sweep)──► EXPIRED
```

`ACCEPTED`, `REVOKED`, and `EXPIRED` are terminal. Only `PENDING` **and** unexpired rows are matched
by the trigger, so an expired row grants nothing even before the sweep relabels it (FR-026).

---

## `PdfGeneration` → `public.pdf_generation`

One successfully delivered proposal (spec entity: **Usage Record**).

| Field | Type | Constraints | Why |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `userId` | `uuid` | FK → `app_user(id)` `ON DELETE RESTRICT` | FR-021 — removing a member must not alter historical totals. RESTRICT is what enforces that. |
| `createdAt` | `timestamptz` | default `now()` | |

**Index**: `@@index([userId, createdAt])` — serves both the personal count (FR-018) and any future
time filter without a second index.

**Stores no proposal content and no client details** (FR-017). A count needs nothing more, and
Constitution Security Requirements discourage unnecessary retention.

---

## Trigger: `handle_new_auth_user`

`AFTER INSERT ON auth.users`, `SECURITY DEFINER`, `SET search_path = public`.

1. Find the newest `PENDING`, unexpired `invitation` where `email = NEW.email` (citext → case-insensitive).
2. Insert `app_user` with
   `role = coalesce(inv.role, 'SALES')`,
   `status = CASE WHEN inv IS NULL THEN 'INACTIVE' ELSE 'ACTIVE' END`,
   `invitedById = inv.invitedById`.
3. If an invitation matched, set it `ACCEPTED` with `acceptedAt = now()`.

**Why a trigger and not callback code**: it is the only path that cannot be bypassed — invite, magic
link, a future OAuth provider, or a manual insert from the Supabase dashboard all pass through it.
The `/auth/callback` route performs an *idempotent reconcile* as a safety net for users who existed
before the trigger did.

**No invitation → INACTIVE, never "no row."** Deny-by-default **plus** an audit trail of who tried to
get in (FR-005). A missing row is indistinguishable from a bug.

---

## Security posture at the data layer

- **RLS enabled, zero policies** on all three tables, plus `REVOKE ALL` from `anon`/`authenticated`
  and a matching `ALTER DEFAULT PRIVILEGES`. Additionally, remove `public` from the project's Exposed
  Schemas — PostgREST is never used here.
- ⚠️ Stated honestly per Principle VI: **RLS does not constrain Prisma.** Prisma connects as table
  owner and owners bypass RLS. This is a blast-radius limiter for a leaked publishable key. The
  TypeScript guard is the authorization model.
- **Do not add `FORCE ROW LEVEL SECURITY`** — it would require `SET LOCAL ROLE` plus a JWT GUC per
  query, which needs a session-capable connection, which means abandoning the 6543 transaction
  pooler. Wrong trade for a two-role internal tool.

---

## Cross-boundary consistency

`lib/rbac-schema.ts` **MUST NOT** import the Prisma `Role` enum. Importing from `generated/prisma`
into a module that a client component also imports drags the Prisma client into the browser graph —
it will either fail the build or bloat the bundle badly.

Single source of truth is preserved by a **unit test** (`tests/unit/role-enum-parity.test.ts`) that
imports both the `ROLES` tuple and the generated Prisma enum and asserts set-equality. The test runs
in Node, so importing Prisma there is free, and drift becomes a red test rather than a runtime 500.
This mirrors the existing `CATALOG_IDS` membership check in `app/api/generate/route.ts`.

---

## Migration order

| # | Contents | Why separate |
|---|---|---|
| 1 | Enums + `app_user` | Base identity |
| 2 | `invitation` + partial unique index | FK depends on 1 |
| 3 | `pdf_generation` | FK depends on 1 |
| 4 | **Raw SQL, `--create-only`**: cross-schema FK `app_user.id → auth.users(id)`; `handle_new_auth_user`; last-admin backstop trigger | Prisma cannot express cross-schema FKs to `auth`, or triggers |
| 5 | **Raw SQL**: `citext` extension, RLS enable, `REVOKE`/`ALTER DEFAULT PRIVILEGES` | Prisma cannot express RLS |

*(The `citext` extension must be created before migration 1 uses the type — either in a preceding
raw-SQL step or as the first statement of migration 1.)*
