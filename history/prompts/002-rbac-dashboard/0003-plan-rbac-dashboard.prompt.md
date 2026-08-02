---
id: 0003
title: Plan RBAC Dashboard Implementation
stage: plan
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: /sp.plan
labels: [plan, rbac, supabase, prisma, tailwind, authorization, research, constitution-check]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-rbac-dashboard/plan.md
 - specs/002-rbac-dashboard/research.md
 - specs/002-rbac-dashboard/data-model.md
 - specs/002-rbac-dashboard/contracts/auth-and-admin.md
 - specs/002-rbac-dashboard/quickstart.md
 - CLAUDE.md
tests:
 - none (planning stage; no code written)
---

## Prompt

/sp.plan

(Invoked with empty input.)

## Response snapshot

Produced the full Phase 0 + Phase 1 planning set for `002-rbac-dashboard`. Constitution Check
**PASS against v4.0.1**, both pre-Phase 0 and post-Phase 1.

**The plan is not a transcription of the pre-spec architecture sketch.** Verifying two load-bearing
assumptions against current Supabase documentation overturned them, and a third fell out as a
consequence:

1. **FR-042 (sign-in throttling) needs no code.** Supabase Auth already throttles `/auth/v1/otp` per
   address — `otp.period`, 60 s default, **customizable** — plus `otp.requests_per_hour` (30,
   project-wide). The sketch assumed a throttle had to be built; it has to be *configured*. Building
   one would put a second store and a second clock *behind* a limit the provider already applies
   before our code runs. Recorded honestly: the hourly cap is project-wide, not per-address — for
   this deployment that is stronger than FR-042 asks, but it is not literally what FR-042 says.
2. **FR-041's 30-day session is not achievable at $0 by configuration.** Supabase sessions last
   **indefinitely** by default, and time-box / inactivity-timeout are **Pro Plan and above**. Buying
   Pro breaches Principle V. So the window moves into application code as a `lastSeenAt` check inside
   the guard's already-mandatory per-request lookup — **zero additional queries**, and evaluated
   against live state, which is what Principle VI wants anyway. Logged in Complexity Tracking as a
   deviation with its reasoning, since "why isn't this just a project setting?" is exactly the
   question a future reader will ask.
3. **FR-043 forces `shouldCreateUser: true`.** The intuitive choice, given FR-002's ban on
   self-service registration, is `false` — but that makes the provider error on unknown addresses,
   which is precisely the membership disclosure FR-043 forbids. With `true`, every address gets an
   identical response, the trigger finds no invitation, and the member lands INACTIVE — satisfying
   FR-005 exactly. FR-002 still holds because an auth row grants nothing; membership is an ACTIVE
   `app_user` row, and only an invitation produces one.

A fourth finding raised an existing risk's severity: the built-in email sender is capped at **2
emails per hour, project-wide**. With passwordless sign-in that is the *primary auth path*, not just
the invite path — three members signing in on a Monday exhausts the hour. Custom SMTP moves from
Phase 6 polish to **Phase 1 blocking**.

**Artifacts:** `research.md` (R1–R12, Decision/Rationale/Alternatives), `data-model.md` (3 tables,
the `handle_new_auth_user` trigger, 5-step migration order, RLS posture stated honestly — *Prisma
bypasses RLS as table owner*), `contracts/auth-and-admin.md` (mechanism-selection rule, 7 typed
errors including the new `503 temporarily_unavailable`, actor-typed server-only reads),
`quickstart.md` (setup + a gate per phase, each tied to a spec SC), `plan.md`.

**Constitution Check highlights:** Principle VI is checked bullet-for-bullet in its own table, which
was the experiment recorded at the end of the `/sp.clarify` PHR — it mapped one-to-one, so the spec
was carrying the constitutional obligations at the right altitude. Principle V is marked **PASS with
a named constraint** rather than a bare PASS, because finding #2 is exactly the kind of cost
decision the principle says must be justified *before* adoption.

**Tooling note:** `update-agent-context.ps1` reported "Updated existing Claude Code context file" and
wrote nothing — it looks for generated marker sections (`## Active Technologies`, `## Recent
Changes`) that this hand-written `CLAUDE.md` does not contain, and its line-based parsing truncates
mid-sentence anyway (its own log shows `Found language: TypeScript 5.9 … **Never Edge**:`). Verified
by diff rather than trusting the success message; updated `CLAUDE.md` by hand and recorded the
script's no-op behaviour there.

## Outcome

- ✅ Impact: Feature 002 is fully planned. Six phases, each with a gate that is a spec Success
  Criterion rather than a judgement call. Phase 0 (the sustained-generation defect) is a formal
  prerequisite under the Workflow Rule added in constitution v4.0.0.
- 🧪 Tests: None — planning stage; no application code written.
- 📁 Files: `plan.md`, `research.md`, `data-model.md`, `contracts/auth-and-admin.md`,
  `quickstart.md` (all new), `CLAUDE.md` (002 entry moved from spec-stage to planned; the three
  findings recorded; `update-agent-context.ps1` no-op noted).
- 🔁 Next prompts: `/sp.tasks`. **ADR-0002 is outstanding** and worth taking before implementation —
  the decision cluster now has two findings that make the "why" non-obvious. Phase 0 can start
  immediately and does not depend on tasks.
- 🧠 Reflection: The two overturned assumptions were both in the *approved* architecture sketch, and
  neither would have surfaced from re-reading it — only from checking the vendor's current
  configuration surface. The pattern worth keeping: when a plan says "we will build X," ask first
  whether the platform already ships X, and when it says "we will configure Y," check that Y exists
  on the tier you are actually paying for. One of those saved a component; the other caught a
  Principle V breach before it was bought.

## Evaluation notes (flywheel)

- Failure modes observed: `update-agent-context.ps1` reporting success while doing nothing — a
  false-positive from tooling, caught only because the output was diffed rather than trusted. This is
  the second `.specify/` PowerShell script in two days to misbehave silently or partially.
- Graders run and results (PASS/FAIL): Constitution Check PASS (6 principles + Technology
  Constraints + Security Requirements + Workflow Rules, all mapped to concrete plan elements).
  Placeholder scan PASS (no `[FEATURE]`, `[DATE]`, or Option labels left in `plan.md`).
  NEEDS CLARIFICATION count PASS (zero — R1–R6 closed the Technical Context unknowns). Spec-coverage
  spot check PASS (all 5 clarifications land in named artifacts: FR-041→R2, FR-042→R1, FR-043→R3,
  FR-044→R6, FR-045→R5). Gate-to-SC mapping PASS (each of the 6 phase gates cites a specific SC).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): during `/sp.tasks`, check whether Phase 1 can be
  decomposed without any task depending on a Supabase *dashboard* setting. R1 and R4 both resolve to
  configuration rather than code, and configuration steps are invisible to a task list that only
  tracks files — if they cannot be represented as tasks, they will be the things that get skipped.
