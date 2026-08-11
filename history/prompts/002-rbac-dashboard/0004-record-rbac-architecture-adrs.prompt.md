---
id: 0004
title: Record RBAC Architecture ADRs
stage: plan
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: /sp.adr
labels: [adr, architecture, authorization, concurrency, write-skew, ui-stack, decision-record]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: history/adr/0002-identity-and-authorization-architecture.md
  pr: null
files:
 - history/adr/0002-identity-and-authorization-architecture.md
 - history/adr/0003-last-admin-invariant-concurrency-control.md
 - history/adr/0004-dashboard-ui-stack-and-design-system-coexistence.md
 - CLAUDE.md
tests:
 - none (documentation stage; no code written)
---

## Prompt

/sp.adr

(Invoked with empty additional input, following `/sp.plan` for `002-rbac-dashboard`.)

## Response snapshot

Extracted decision **clusters** from `plan.md`, `research.md`, `data-model.md`, and
`contracts/auth-and-admin.md`, applied the three-part significance test, and created **three** ADRs.
One existing ADR was referenced; no conflicts were found.

| ADR | Cluster | Why it clusters |
|---|---|---|
| **0002** Identity and Authorization Architecture | Supabase Auth (magic link) + Supabase Postgres via Prisma 7 + TypeScript guard with branded actor types + invitation-as-role-carrier + RLS deny-all backstop + soft deactivation + app-level session lifetime | Single-vendor coupling is *itself* the decision — the `auth.users` → `app_user` trigger only exists because auth and data share a database. These cannot diverge without replacing the sync mechanism. |
| **0003** Last-Admin Invariant and Concurrency Control | `pg_advisory_xact_lock` + re-count in-transaction + one `updateMember` path + `409 last_admin` + two-connection race test | Genuinely independent of 0002 — the isolation strategy could change (e.g. to SERIALIZABLE) without touching the identity architecture. |
| **0004** Dashboard UI Stack and Design-System Coexistence | Tailwind v4 with Preflight omitted + `source(none)`/`@source` + non-inline `@theme` bridge + gray-ramp override + vendored Tremor Raw + Radix a11y | Independent of both — the UI stack could be swapped without touching auth or the invariant. |

**Clustering discipline applied.** Three candidates were folded in rather than given their own ADRs,
because the command warns specifically against over-granularity:

- *Session-lifetime enforcement in app code* (the Pro-plan finding) → folded into 0002. If Pro were
  ever bought, the change would move through the guard, which is 0002's core.
- *Soft deactivation over hard delete* → folded into 0002 as a data-lifecycle component.
- *Metric write via `after()`* → **rejected as an ADR entirely.** It fails the cross-cutting test —
  one route handler, one file. Documented in `research.md` R11 instead, which is where the command
  says such notes belong.

**ADR-0003 is the one that justifies this whole exercise.** The naive `count() > 1` guard permits
write skew under READ COMMITTED, the failure is unrecoverable from inside the product (recovery needs
Supabase console credentials, since FR-036 deliberately provides no in-app break-glass), **and it
passes every single-threaded test a developer would naturally write**. That combination — looks
correct, fails silently, catastrophic, undetectable by ordinary testing — is exactly what a permanent
decision record is for. It also records the four-letter difference between `pg_advisory_xact_lock`
and `pg_advisory_lock`, where the wrong one deadlocks only in production, only under pooling, and
only sometimes.

**Conflict check against ADR-0001** (Letterhead Chrome Strategy): none. ADR-0001 governs the *PDF*
chrome; ADR-0004 governs the *browser* UI. They share a brand-fidelity posture but touch different
surfaces, and ADR-0004 explicitly protects ADR-0001's surface — Tailwind's scanner is never permitted
to read `ProposalForm.tsx`, so the form cannot be restyled even by accident. Recorded in ADR-0004's
References so the non-conflict is deliberate rather than assumed.

**Tooling gap found:** `.specify/scripts/powershell/` has **no `create-adr` script** — only
`.specify/templates/adr-template.md` exists. The command's Step 5 instructs running `create-adr.sh`,
which is the same absent-script pattern already recorded for PHRs. All three ADRs were hand-authored
against the template, matching ADR-0001's numbering and structure. Noted in `CLAUDE.md`.

## Outcome

- ✅ Impact: Three architecturally significant decision clusters now have permanent, reviewable
  records with explicit alternatives and both-sided consequences. 22 rejected alternatives are
  documented across the three (nine in 0002, seven in 0003, six in 0004), each with its reason.
- 🧪 Tests: None — documentation stage; no application code written.
- 📁 Files: `history/adr/0002…md`, `history/adr/0003…md`, `history/adr/0004…md` (all new);
  `CLAUDE.md` (ADR index expanded with one-line hooks; missing `create-adr` script recorded).
- 🔁 Next prompts: `/sp.tasks`. **Phase 0** (sustained-generation defect) remains the gate and does
  not depend on tasks.
- 🧠 Reflection: The clustering rule did real work here. An atomic reading of `plan.md` would have
  produced eight or nine ADRs (Supabase, Prisma, Tailwind, Tremor, advisory locks, magic link, RLS,
  soft delete…), which is a filing system rather than a decision record. Grouping by *what would
  change together* produced three, and the boundaries turned out to be meaningful: each cluster can
  be replaced without disturbing the other two.

## Evaluation notes (flywheel)

- Failure modes observed: the command's Step 5 references a `create-adr.sh` script that does not
  exist in this repo. Third `.specify/` tooling gap encountered in two days (missing `create-phr.sh`,
  `create-new-feature.ps1`'s PowerShell 5.1 `Join-Path` bug, `update-agent-context.ps1`'s silent
  no-op). Handled by hand-authoring; recorded so the next session does not rediscover it.
- Graders run and results (PASS/FAIL): **Clustering PASS** — 3 ADRs, each spanning multiple
  components; the one single-file candidate (`after()` metric write) was rejected as an ADR.
  **Alternatives PASS** — every ADR lists ≥1 alternative with rationale (actual: 9, 7, 6).
  **Both-sided consequences PASS** — each has populated Positive *and* Negative sections; negatives
  are real (hard runtime dependency, vendor coupling, two styling systems, global serialisation), not
  token. **Conciseness/detail PASS.** **References PASS** — all link back to spec, plan, research,
  and the governing constitution version. **Conflict scan PASS** — 0 conflicts with ADR-0001, and the
  non-conflict is stated explicitly rather than left implied. **Placeholder scan PASS** — no
  `{{TITLE}}`-style tokens remain in any file.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): during `/sp.tasks`, check whether the task that
  implements `updateMember` references ADR-0003 directly. If a task list can be written that touches
  admin mutations without pointing at that ADR, the record is not discoverable at the moment it
  matters — and a decision record nobody reads at the point of decision has failed regardless of how
  well it is written.
