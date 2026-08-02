---
id: 0002
title: Clarify RBAC Dashboard Spec
stage: spec
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: /sp.clarify
labels: [clarify, spec, session-lifetime, rate-limiting, accessibility, availability, lifecycle]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-rbac-dashboard/spec.md
 - specs/002-rbac-dashboard/checklists/requirements.md
 - CLAUDE.md
tests:
 - none (specification stage; no code written)
---

## Prompt

/sp.clarify

(Invoked with empty input. Five questions were asked one at a time; the user answered
**A, A, A, A, C** — with one mid-question request, "Which option is best design pattern in this
case," before the fourth answer.)

## Response snapshot

Scanned `specs/002-rbac-dashboard/spec.md` against the full ambiguity taxonomy. Most categories came
back Clear — functional scope, entities, edge cases (14 of them), terminology, and completion signals
were already well covered by the spec and its 12→14 assumptions. Five categories were Partial or
Missing, and all five were resolved.

| # | Question | Answer |
|---|---|---|
| 1 | Session lifetime | Sliding **30-day** session, refreshed on each use → **FR-041** |
| 2 | Sign-in link throttling | Throttle **per email address** → **FR-042** |
| 3 | Accessibility bar | **WCAG 2.2 AA**, new views only → **FR-044**, **SC-014** |
| 4 | Unreachable member store | **Fail closed**, distinct "temporarily unavailable" state, no availability target → **FR-045** |
| 5 | Role on restoring a removed member | Restoring Admin **picks** the role, defaulted to the one held at removal → **FR-032** rewritten |

**Q1's reasoning is worth preserving:** because FR-006 already forces a live status check on every
request, revocation does not depend on session expiry. The two concerns are decoupled, so a long
session costs nothing in security terms while a short one imposes a daily email round-trip on exactly
the non-technical audience the spec says must not hit friction. FR-041 states this explicitly so that
nobody later "hardens" the system by shortening the session, which would add friction and improve
nothing.

**Q2 surfaced a genuine gap in the existing Out of scope list.** It said "per-member generation
quotas or rate limits," which reads as covering rate limiting generally — but the sign-in form is a
*different surface*: unauthenticated by necessity (FR-003) and producing an outbound email on every
submission. Unbounded it is an open email relay pointed at Whaz's sending reputation, and it consumes
the free email allowance the $0 cost ceiling depends on. Out of scope now distinguishes the two
surfaces explicitly.

**One requirement was derived rather than separately asked — FR-043.** Per-address throttling invites
an obvious early-exit optimisation ("unknown address? skip the work"), which would turn the sign-in
form into a staff enumerator. FR-043 forbids it: the response must be identical, with no timing
difference, whether or not the address belongs to a member. Recorded as derived in the checklist so a
reviewer knows it was not an independent decision.

**Q4 is the one where the recommendation was not taken, and that is recorded honestly.** Asked which
option was the better design pattern, the analysis argued fail-closed *plus* an anti-idle requirement
— on the grounds that free-tier databases suspend after inactivity, so a small team's quiet week
would guarantee an outage whose first victim is a rep in front of a client. It also argued *against*
the "99% availability" half of that option, as an unmeasurable SLO with no monitoring behind it. The
user chose plain fail-closed. FR-045 records exactly that; the idle-suspension hazard is noted in
**Dependencies with no requirement attached**, explicitly leaving mitigation to `/sp.plan`. The
rejected half was not smuggled back in as a requirement.

**FR-045 carries one detail that matters more than it looks:** "temporarily unavailable" must be its
own state, never folded into the existing generation failure. The API already distinguishes
`validation_failed` from `generation_failed`; if a sleeping database surfaces as `generation_failed`,
a rep reports "it couldn't generate my proposal" and someone spends an afternoon inside Chromium
while the real cause is the datastore.

**Q5 closed the one path where a privilege could appear without anyone choosing it.** Everywhere else
a role is actively assigned (FR-010, FR-022); restore was the exception, and would have silently
reinstated Admin on the exact person most likely to have been removed *for* being an Admin.

Also fixed: FR-045 was initially inserted out of numeric order; reordered so the Identity block reads
041 → 042 → 043 → 045.

## Outcome

- ✅ Impact: All five Partial/Missing taxonomy categories resolved. Spec now **45 FRs, 14 SCs, 14
  assumptions**, with a `## Clarifications` session recording each decision. Zero Outstanding
  high-impact items; the spec is ready for `/sp.plan`.
- 🧪 Tests: None — specification stage; no application code written.
- 📁 Files: `specs/002-rbac-dashboard/spec.md` (Clarifications section, FR-041/042/043/044/045,
  FR-032 rewritten, SC-012 and SC-014, 2 new edge cases, 2 new acceptance scenarios, Target Audience
  and Assumption 14 updated, Out of scope extended, Dependencies extended);
  `specs/002-rbac-dashboard/checklists/requirements.md` (iteration-3 record);
  `CLAUDE.md` (counts).
- 🔁 Next prompts: `/sp.plan`. Note that three clarifications change the already-approved
  architecture plan: FR-042 adds a throttling mechanism that plan does not have, FR-044 adds an
  accessibility bar affecting component selection and test design, and FR-045 adds a typed
  "unavailable" error alongside the existing three. Phase 0 (sustained-generation defect) and
  ADR-0002 remain outstanding.
- 🧠 Reflection: The highest-value question was the one nobody would have thought to ask — Q4 exists
  only because the feature *creates* a dependency where none existed. Before this work the generator
  had zero runtime dependencies; FR-001 makes an outage of the member store a total outage of the
  product. That risk is invisible if you review the feature on its own terms and only appears if you
  ask what the feature takes away.

## Evaluation notes (flywheel)

- Failure modes observed: none in the session itself. One process note — the spec's Out of scope had
  a genuine ambiguity ("rate limits") that read as broader than it was, and it took the taxonomy
  sweep rather than a re-read to catch. Category-driven scanning found what re-reading would not.
- Graders run and results (PASS/FAIL): Clarification bullet count PASS (5 bullets = 5 accepted
  answers, no duplicates). Question quota PASS (5 of max 5; the mid-question "which is best" was a
  disambiguation and correctly did not advance the counter). Heading discipline PASS (only
  `## Clarifications` and `### Session 2026-08-01` added). FR uniqueness PASS (45 ids, 45 unique).
  Stale-text sweep PASS (no surviving "normal working day" phrasing after SC-012 was rewritten).
  Numeric ordering PASS after one correction.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): at `/sp.plan`, check whether FR-042 and FR-045 can be
  satisfied without new infrastructure. If throttling needs a new store or the unavailable-state
  needs a new error channel, that is a signal these clarifications changed the shape of the design,
  not just its detail — and the approved plan needs revisiting rather than transcribing.
