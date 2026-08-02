---
id: 0005
title: Generate RBAC Implementation Tasks
stage: tasks
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: /sp.tasks
labels: [tasks, rbac, decomposition, user-stories, mvp, configuration-tasks]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: history/adr/0003-last-admin-invariant-concurrency-control.md
  pr: null
files:
 - specs/002-rbac-dashboard/tasks.md
 - CLAUDE.md
tests:
 - none (task-planning stage; no code written)
---

## Prompt

/sp.tasks

(Invoked with empty input.)

## Response snapshot

Generated `specs/002-rbac-dashboard/tasks.md` — **103 tasks, T001–T103**, organised by user story.
10 Setup · 28 Foundational · 14 US1 · 29 US2 · 12 US3 · 10 Polish. Format validated: every task has a
checkbox, sequential ID, file path, and (in story phases only) a story label; no duplicate IDs.

**Tests included, and justified rather than assumed.** The command treats tests as optional, but this
spec makes three of them load-bearing: SC-004 can only be demonstrated by two concurrent connections,
SC-007 by a byte comparison, SC-014 by an automated accessibility check. Each test task cites the
criterion it discharges.

**Both flywheel notes from the previous two PHRs were acted on, and both changed the output:**

1. *From the plan PHR* — "check whether Phase 1 can be decomposed without any task depending on a
   Supabase dashboard setting; configuration is invisible to a task list that only tracks files."
   It cannot: R1 (rate limits) and R4 (SMTP) both resolve to configuration. So **T011–T014 are
   explicitly configuration tasks**, each with its own verification step, and the phase carries a
   warning that they produce no diff and are therefore the steps most likely to be skipped. Without
   this, FR-042 would have looked unimplemented because no file changed — or worse, someone would
   have "implemented" it by writing the throttle R1 says not to write.
2. *From the ADR PHR* — "check whether the task implementing `updateMember` references ADR-0003; a
   decision record nobody reads at the point of decision has failed regardless of how well it is
   written." **T068 now opens with "Read `history/adr/0003-…md` before writing this function"** and
   restates the `pg_advisory_xact_lock` warning inline. T024 and T070 also point at it.

**One cross-story dependency, stated rather than hidden.** The Tailwind shell and shared components
(T053–T062) live in US2's phase because US2 is the earliest story that needs them, and US3 depends on
those **ten named tasks** — not on US2 as a whole. US3 needs no members management, no invitations, no
advisory lock. Putting the shell in Foundational was considered and rejected: Foundational blocks
*all* stories, and US1 needs no dashboard at all, so it would have delayed the MVP for nothing.

**Three tasks carry production-only failure modes** and name the consequence inline rather than
relying on a reader to remember: T068 (`pg_advisory_lock` vs `pg_advisory_xact_lock` — leaks onto a
pooled connection, permanent deadlock, production only), T031 (`setAll` without its `headers`
argument — a CDN can serve one member's session to another), T045 (`shouldCreateUser: false` — turns
the sign-in form into a staff enumerator).

**MVP is US1 alone**, and it is genuinely shippable: sign-in gating every surface, with no dashboard.
That closes the brand-integrity hole of an anonymous branded-document generator on its own.

T098 folds in the `CLAUDE.md` correction owed since the plan stage — the stale "T001–T060 of 63" line
for feature 001, where `tasks.md` actually shows only T062 open.

## Outcome

- ✅ Impact: Feature 002 is fully decomposed and immediately executable. Every task has a file path;
  every phase has a checkpoint; every gate is a spec Success Criterion. Phase 1 T001–T005 (the `/tmp`
  fix) gates the feature, per the Workflow Rule added in constitution v4.0.0.
- 🧪 Tests: None run — task-planning stage; no application code written. 11 test tasks are specified
  across the three stories.
- 📁 Files: `specs/002-rbac-dashboard/tasks.md` (new); `CLAUDE.md` (002 entry moved to "scoped", with
  the two easily-missed task groups flagged).
- 🔁 Next prompts: `/sp.implement`, or begin at T001 manually. **T001–T005 can start immediately** —
  they touch only `lib/pdf.ts` and depend on nothing else in the feature.
- 🧠 Reflection: The decomposition surfaced a structural question the plan had not: where does shared
  UI infrastructure live when the highest-priority story does not need it? Putting it in Foundational
  is the tidy answer and the wrong one — it would gate the MVP on styling work US1 never uses. Naming
  a ten-task dependency is uglier on the page and more honest about what actually blocks what.

## Evaluation notes (flywheel)

- Failure modes observed: my own note count said "102 tasks" against an actual 103 — caught by a
  scripted count rather than by re-reading, and corrected. Worth noting that hand-tallied summary
  numbers in generated documents are exactly the kind of claim that should be verified mechanically,
  since nobody re-derives them later.
- Graders run and results (PASS/FAIL): Format PASS (103/103 tasks carry checkbox + ID + path; zero
  malformed). ID uniqueness PASS (T001–T103, no duplicates, no gaps). Story labelling PASS (55
  labelled tasks, all inside story phases; Setup/Foundational/Polish carry none). Story-coverage PASS
  (US1 14, US2 29, US3 12 — each with its own tests, implementation, and checkpoint). Independence
  PASS with one documented exception (US3 → T053–T062). Spec traceability PASS (spot-checked FR-041
  →T035, FR-042→T013, FR-043→T045/T046, FR-044→T076/T078/T095/T096, FR-045→T036/T049/T060).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): after T005, check whether the Phase 1 gate can actually be
  evidenced on a Vercel preview without the rest of the feature existing. If verifying "20 sequential
  generations on one warm instance" turns out to need auth or a dashboard to observe, then Phase 0 is
  not as independent as the plan claims and the gating order needs revisiting before Phase 2 starts.
