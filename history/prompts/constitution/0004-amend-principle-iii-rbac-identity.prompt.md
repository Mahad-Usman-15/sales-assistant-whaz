---
id: 0004
title: Amend Principle III For RBAC Identity
stage: constitution
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: null
branch: master
user: Mahad Usman
command: /sp.constitution
labels: [constitution, amendment, major-bump, principle-iii, principle-vi, rbac, authorization, supabase, prisma]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md
 - CLAUDE.md
 - docs/DEVELOPMENT.md
 - specs/001-proposal-pdf-generator/plan.md
 - specs/001-proposal-pdf-generator/spec.md
tests:
 - none (documentation-only change; no code touched)
---

## Prompt

Update the consitution as per the RBAC dashobard spec.

## Response snapshot

Amended the constitution **3.0.0 → 4.0.0 (MAJOR)** against `dashboard.txt` and the approved
`002-rbac-dashboard` plan. No code was written; this amendment deliberately lands *before*
implementation, satisfying Governance's "Implementation MUST NOT precede its amendment."

**Why MAJOR rather than MINOR.** Principle III's normative rule is reversed, not extended. v3.0.0
required the pipeline to "remain stateless, with no required database, authentication, or persistent
storage," and Technology Constraints stated flatly "**Data**: No database in v1." `dashboard.txt`
requires two roles, per-user and org-wide PDF counts, and member administration — each needs
identity, and identity needs persistence. An anonymous `POST /api/generate` is *compliant* with
v3.0.0 and *violates* v4.0.0. That is this document's own definition of backward-incompatible.
Adding Principle VI alone would have been MINOR; III is what forces the MAJOR.

**Principle III redefined:** *Stateless-by-Default, Extend Without Rebuilding* →
*Additive Extension — Identity Wraps the Render Path, It Does Not Rewrite It.* The rewrite preserves
the goal verbatim and replaces only the means. Statelessness was never the objective; it was the
cheapest available route to the real one — a render path that cannot be destabilised by whatever is
built around it. Four obligations that were previously implicit are now binding: `lib/` stays
framework-free and unit-testable without a database; authorization completes *before* the renderer
is invoked and metric writes register only *after* a render has succeeded; a failed metric write
never voids a delivered PDF (an operational counter is not a billing record and gets no veto over a
document); and adding state must not change the render path's contract beyond one new typed
authorization error. The rewrite also closes a loophole the old wording left open — "stateless" said
nothing about *where* state may be touched once it exists, so a database round trip inside the
renderer would have satisfied the letter of a rule about the MVP while destroying determinism.

**Principle VI added — *Authorization Is Server-Enforced, on Every Request, from Live State*.**
Seven binding consequences, each closing a specific silent-failure mode rather than restating good
practice: role/status re-read from the app's own table per request (a token claim is UX only —
revocation that waits for expiry is not revocation); a role never sourced from subject-writable auth
metadata, which is full privilege escalation — the server-owned invitation record is the only trusted
carrier; route middleware is a redirect convenience, never a boundary; Server Actions are public HTTP
endpoints and each begins with its own check; data-access functions take a guard-produced actor type
so a missing check fails the build rather than a review; cross-row invariants ("at least one active
Admin") are enforced under an explicit lock or serializable transaction and tested with two
concurrent connections, because a `count() > 1` read-then-write permits write skew and passes every
single-threaded test; and RLS is enabled default-deny but described honestly as a blast-radius
limiter for key leakage, never as the authorization model, since a privileged ORM connection
bypasses it.

**Principle V materially expanded (not redefined).** The $0 ceiling is unchanged; free-tier
operational limits are now design obligations. A $0 tier is a different product from a paid one, not
a smaller one — an idle project pausing and a vendor-documented non-production email sender both
present to users as outages, so a mitigation must ship with the decision that adopts the tier.

**Technology Constraints:** the Data bullet was rewritten (Supabase Postgres via Prisma through the
managed pooler; direct function-to-database connections forbidden; the `tools.md` catalog explicitly
does *not* migrate as a side effect). Four bullets added — Authentication (passwordless magic link;
the app never stores, hashes, resets, or transmits a password; the provider's user schema is not
managed by app migrations), Server runtime (Node everywhere, Edge forbidden — the framework's
route-middleware runtime is fixed to Node and not configurable), persisted-data minimisation (PDFs
never stored; a usage record holds an actor and a timestamp and nothing else), and UI scoping
(`app/globals.css` is not migrated to a utility framework; a dashboard framework must omit its
base/reset layer and restrict its class scanner so it cannot restyle existing surfaces; vendored
component source preferred over a runtime dependency).

**Security Requirements** gained four: privileged service credentials confined to one server-only
module and never given a client-exposed prefix; session cookies written with the cache-control
headers the SSR client supplies (dropping them lets a CDN serve one user's session to another); user
removal implemented as reversible deactivation with attributable records surviving it; and no
deployed bootstrap or break-glass surface — first-admin creation is an operator action that refuses
to run once an active admin exists, lockout recovery is a documented manual procedure. Client-side
validation was explicitly labelled a UX affordance, not a trust boundary.

**Code Quality** gained one bullet: where a rule can be enforced by the type system, a database
constraint, or the build, it must be — conventions decay silently, a compile error does not.
**Workflow Rules** gained one: a known defect in a surface a new feature depends on is fixed first,
or the plan states why deferring is safe (this is what makes the `/tmp`-exhaustion fix a formal
gate on the RBAC work rather than a preference).

**Propagation:** `CLAUDE.md` (version refs, Principle III rename with the "No database in v1"
withdrawal called out, a new Principle VI summary, env/secrets note rewritten); feature 001's
`plan.md` (Constitution Check re-verified PASS against v4.0.0, Principle III row renamed and
re-scoped, Storage line annotated) and `spec.md` (version ref; FR-011's "no sign-in" noted as
superseded but retained as an accurate MVP record); `docs/DEVELOPMENT.md` version refs. The four
`.specify/templates/*` files and `.claude/commands/sp.*.md` need no edit — their constitution hooks
defer generically and name no principle. `history/adr/0001` cites v3.0.0 Principle II, which is
unchanged in v4.0.0, so that historical citation stays correct. `projectplan.md` §8/§9 still describe
"no login, no database" as the MVP scope decision; left as written, since it is an accurate record
that this constitution supersedes rather than contradicts.

## Outcome

- ✅ Impact: Constitution at v4.0.0. The RBAC dashboard work is now constitutionally sanctioned and
  the governance gate blocking Phase 1 is cleared. Principle VI turns six of the plan's
  highest-severity risks (metadata role source, middleware-as-boundary, unauthorized Server Actions,
  write skew on the last-Admin rule, RLS false confidence, secret-key exposure) from design notes
  into binding rules that `/sp.analyze` will flag as CRITICAL.
- 🧪 Tests: None — documentation-only change; no application code touched.
- 📁 Files: `.specify/memory/constitution.md` (rewritten, v4.0.0), `CLAUDE.md`,
  `docs/DEVELOPMENT.md`, `specs/001-proposal-pdf-generator/plan.md`,
  `specs/001-proposal-pdf-generator/spec.md`.
- 🔁 Next prompts: **ADR-0002** for the Supabase + Prisma + server-enforced-authorization decision
  cluster (suggestion only — user consent required). Then **Phase 0** (`/tmp` exhaustion fix in
  `lib/pdf.ts`), now a formal Workflow-Rules gate. Then branch `002-rbac-dashboard` → `/sp.specify`.
- 🧠 Reflection: Principle III is the third principle inversion in this project, and the first that
  was *not* a correction. II inverted twice because a premise turned out to be false; III inverted
  because the requirement changed. Both paths were handled by amendment rather than reinterpretation,
  which is the rule working as designed. Worth noting what made the rewrite safe: rather than
  deleting "stateless," the amendment asked what statelessness was *for* and re-stated that answer
  directly — which is why the new form is strictly more restrictive about the renderer's internals
  than the rule it replaces.

## Evaluation notes (flywheel)

- Failure modes observed: none during the amendment. The pre-existing risk this amendment addresses
  is a documented pattern — plans that add auth typically encode authorization rules in the plan
  only, where they are advisory; a plan is not enforced by `/sp.analyze`, a principle is.
- Graders run and results (PASS/FAIL): Bracket-token scan PASS (zero unresolved placeholders).
  Version/date coherence PASS (4.0.0 in the report header and the footer; ISO dates; ratification
  date preserved at 2026-07-17). Template propagation PASS (4 template families checked, 0 needing
  edit, each with a stated reason). Normative-language check PASS (MUST/MUST NOT throughout; no
  bare "should" in a binding clause).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when `specs/002-rbac-dashboard/plan.md` is written, check
  whether its Constitution Check can cite Principle VI's bullets one-for-one against the plan's
  §16 Security Review table. If they map cleanly, the principle is at the right altitude; if the
  plan needs to restate them, VI is under-specified.
