# Specification Quality Checklist: RBAC Dashboard

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-01
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/sp.clarify` or `/sp.plan`.

### Iteration 3 (2026-08-01) — `/sp.clarify` session

Five questions asked and answered, closing the five Partial/Missing taxonomy categories. Counts after:
**45 FRs, 14 SCs, 14 assumptions.** All 16 checklist items still pass.

| Category | Before | Resolution |
|---|---|---|
| Security & privacy | Partial | FR-041 (30-day sliding session), FR-042 (per-address sign-in throttle), FR-045 (fail closed) |
| Edge cases — throttling | Missing | FR-042 + a new edge case; Out of scope now distinguishes sign-in throttling from generation quotas |
| Accessibility | Missing | FR-044 (WCAG 2.2 AA, new views only), SC-014 |
| Reliability & availability | Missing | FR-045. **No availability target set** — a deliberate decision; the idle-suspension hazard is recorded in Dependencies with no requirement attached |
| Lifecycle / state transitions | Partial | FR-032 rewritten — restore requires explicit role selection |

**One requirement was derived, not separately asked.** FR-043 (uniform response to a sign-in link
request, no timing difference, no "unknown address" fast path) follows directly from the throttling
decision: per-address throttling invites an early-exit optimisation that would turn the sign-in form
into a staff enumerator. Recorded as derived so a reviewer knows it was not an independent choice.

**One recommendation was not taken, correctly and deliberately.** For the unreachable-store question
the analysis argued for fail-closed *plus* an anti-idle requirement; the decision was fail-closed
alone. The hazard is documented in Dependencies without a requirement attached, so `/sp.plan` can
choose whether to mitigate it. The spec does not smuggle the rejected half back in.

### Iteration 2 (2026-08-01) — Target Audience added

A **Target Audience** section was added on review; it was genuinely missing. It is not decoration —
it carries a constraint that changes requirements. The sales team is non-technical, and the original
tool's targets — under 2 minutes per proposal, >80% adoption — are adopted by this feature as its
own. An authentication step done carelessly threatens both, so two consequences are now stated as
requirements rather than left implicit: sign-in is a per-session cost and never a per-proposal one
(**SC-012**), and the 2-minute production target still holds for a signed-in member (**SC-013**).

*(Provenance note, added 2026-08-01: those audience facts originate in the 2026-07 MVP analysis.
`projectplan.md` and `problemstatement` are historical records, not sources of truth — the spec
restates what remains true and owns it. See Constitution v4.0.1 Governance, "Source of truth.")*
Two assumptions were added — team size (**13**, which is what justifies an unpaginated members list
and briefly serialised admin changes) and session/device expectations (**14**).

The section also disambiguates a real trap: `whaz.md` has its own "Target Audience" heading
describing Whaz's **clients** (students, freelancers, founders). Those are proposal *recipients*, not
users of this tool, and they have no role in this feature. Recorded explicitly so a later reader does
not wire client personas into an internal admin tool.

Counts after this iteration: 40 FRs, **13** SCs, **14** assumptions. All 16 checklist items still pass.

### Validation record (iteration 1 — all items pass)

**Zero `[NEEDS CLARIFICATION]` markers, deliberately.** The four material forks in this feature —
whether authentication gates the generator or only the dashboard, whether "delete" means erase or
deactivate, how invitations are delivered, and where authorization is enforced — were each put to
the user and decided during the planning session that preceded this spec. Manufacturing questions
the user has already answered would be worse than silence. Everything else genuinely had a defensible
default and is recorded in **Assumptions** (12 entries) rather than deferred, per the guidance that
reasonable defaults are documented, not asked about.

**Two judgement calls worth surfacing to a reviewer**, both recorded as assumptions rather than
blocking questions:

- **Assumption 5** — a removed member's past generations still count toward the organisation-wide
  total. This changes the headline figure an Admin sees. Read as "output produced," not "output by
  current staff." If leadership wants the figure to track only current members, FR-021 inverts and
  this is worth catching before `/sp.plan`.
- **Assumption 10** — counts start at zero on launch day. Nothing was ever recorded, so no backfill
  is possible. Flagged because an Admin seeing "0 proposals generated" on day one will read it as a
  bug unless they were told.

**On "no implementation details":** `dashboard.txt` names a tech stack (Supabase, Prisma, TypeScript,
Zod, Tremor). None of it appears in this spec — it belongs in `plan.md`. The one place the spec
approaches mechanism is **FR-003** ("sign in without creating, remembering, or resetting a password,
by following a single-use link sent to their work email"). That is retained deliberately: it
describes what the member experiences and is directly testable by a non-technical stakeholder. It
names no provider and no protocol.

**On testability:** every FR is stated as a refusal, a guarantee, or an observable capability, and
each maps to at least one acceptance scenario or edge case. The two hardest to verify are called out
in the spec rather than hidden — **FR-033** (the last-Admin invariant under concurrency, which
cannot be demonstrated by acting one step at a time; see SC-004) and **FR-013/SC-007** (byte-identical
output, which is why the requirement says "not a single byte" instead of "looks the same").

**On scope bounding:** the Out of scope list has 9 entries, 3 of which exist to prevent scope the
source document could be read as implying — a full audit log, permanent deletion (`dashboard.txt`
says "delete"), and time-windowed figures.
