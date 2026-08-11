---
id: 0001
title: Specify RBAC Dashboard
stage: spec
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: /sp.specify
labels: [spec, rbac, authorization, dashboard, invitations, last-admin-invariant]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-rbac-dashboard/spec.md
 - specs/002-rbac-dashboard/checklists/requirements.md
 - .specify/scripts/powershell/create-new-feature.ps1
 - CLAUDE.md
tests:
 - none (specification stage; no code written)
---

## Prompt

RBAC dashboard

## Response snapshot

Created branch `002-rbac-dashboard` and wrote `specs/002-rbac-dashboard/spec.md` from `dashboard.txt`,
under constitution **v4.0.0** (amended earlier the same day expressly to permit this feature).

**Three prioritised user stories, each independently shippable:**

- **P1 — Only invited staff can produce Whaz-branded proposals.** Chosen as P1 not because it is the
  headline ask but because it is the only slice that stands alone: a client-facing branded document
  generator that anyone on the internet can drive is a brand-integrity problem *today*, and this
  closes it with no dashboard at all. Everything else depends on knowing who is acting.
- **P2 — An Admin manages who is on the team.** Without it the team is frozen at launch membership
  and a departing employee cannot be locked out.
- **P3 — Everyone sees the numbers they are entitled to.** The visible payoff, but last, because
  counts are meaningless until generations are attributable.

**40 functional requirements** across identity/access, authorization, generation and usage records,
figures, invitations, member administration, and presentation. **11 success criteria**, all
technology-agnostic and measurable. **14 edge cases.**

**Zero `[NEEDS CLARIFICATION]` markers — deliberately.** The four material forks (does auth gate the
generator or only the dashboard; does "delete" erase or deactivate; how are invitations delivered;
where is authorization enforced) were each put to the user and decided in the planning session that
preceded this. Re-asking answered questions would be worse than silence. Everything else had a
defensible default and went into **Assumptions** (12 entries) instead.

**Judgement calls flagged for review rather than buried:** removed members' past generations still
count toward the org-wide total (Assumption 5 — this changes the headline figure an Admin sees; if
leadership wants it to track current staff only, FR-021 inverts); and counts start at zero on launch
day because nothing was ever recorded (Assumption 10 — an Admin seeing "0 proposals" on day one will
read it as a bug unless told).

**Requirements written to be falsifiable rather than agreeable.** FR-013 says the output must not
change "a single byte," not "must look the same." FR-033 states the at-least-one-Admin rule *and*
that it must hold under simultaneous action — SC-004 then demands it be demonstrated by two Admins
removing each other at the same instant, because the naive implementation passes every test that can
be written one step at a time. FR-009 and FR-011 forbid disclosure by any route including direct
navigation, closing the "the button isn't rendered" non-answer.

`dashboard.txt` names a tech stack (Supabase, Prisma, TypeScript, Zod, Tremor); **none of it appears
in the spec** — it belongs in `plan.md`. The one place the spec approaches mechanism is FR-003
(passwordless sign-in by emailed single-use link), retained because it describes what a member
experiences and names no provider or protocol.

**Tooling defect found and fixed en route.** `create-new-feature.ps1` failed partway through — it
created the branch and `specs/002-rbac-dashboard/` but threw before creating
`history/prompts/002-rbac-dashboard/`. Cause: `Join-Path $repoRoot 'history' 'prompts' $branchName`
uses the 3-argument form, which is PowerShell 7+ only; Windows PowerShell 5.1 binds the third
argument positionally and throws. Fixed at the call site with a comment, and recorded in `CLAUDE.md`
so the same pattern is checked before trusting other scripts in that directory.

## Outcome

- ✅ Impact: Feature 002 is specified and passes all 16 quality-checklist items on the first
  iteration. Branch `002-rbac-dashboard` is checked out. The already-approved architecture plan
  (`~/.claude/plans/serene-marinating-harbor.md`) now has a spec to be validated against.
- 🧪 Tests: None — specification stage; no application code written.
- 📁 Files: `specs/002-rbac-dashboard/spec.md` (new), `specs/002-rbac-dashboard/checklists/requirements.md`
  (new), `.specify/scripts/powershell/create-new-feature.ps1` (bug fix), `CLAUDE.md` (directory
  structure + the PowerShell 5.1 note).
- 🔁 Next prompts: `/sp.plan` — the architecture work is already done and approved, so this is
  largely transcription plus a Constitution Check against v4.0.0. Before or alongside it: **Phase 0**
  (the sustained-generation defect), which SC-009 and the Dependencies section now make a formal gate
  rather than a preference. ADR-0002 remains outstanding as a suggestion.
- 🧠 Reflection: Two things went right that are worth repeating. Writing the spec *after* the
  architecture session meant the ambiguities were already resolved, which is why the marker count is
  zero rather than three — the spec stage is much cheaper when the forks have been decided. And
  stating the last-Admin rule together with its concurrency condition in the same requirement (rather
  than leaving concurrency to the plan) means a correct-looking-but-broken implementation now fails
  the *spec*, not just a code review.

## Evaluation notes (flywheel)

- Failure modes observed: `create-new-feature.ps1` failed silently-ish — it printed a
  ParameterBindingException but had already created the branch and switched to it, so a less careful
  read would have concluded the whole scaffold existed. Partial success with a nonzero exit is the
  worst shape for a scaffolding script; verified the actual filesystem state rather than trusting the
  error message's implication.
- Graders run and results (PASS/FAIL): Checklist 16/16 PASS on iteration 1. Placeholder scan PASS
  (no `[FEATURE NAME]`, `[DATE]`, or `$ARGUMENTS` left). Tech-agnosticism scan PASS (no framework,
  language, or vendor name in any FR or SC). FR↔scenario coverage PASS (every FR maps to at least one
  acceptance scenario or edge case). Branch/spec/prompts directory naming coherence PASS after the
  script fix.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): at `/sp.plan`, check whether the plan's Constitution
  Check can cite Principle VI bullet-for-bullet against FR-008/010/011/033/036. A clean one-to-one
  mapping would confirm the spec is carrying the constitutional obligations at the right altitude;
  needing to restate them in the plan would mean the spec under-specified them.
