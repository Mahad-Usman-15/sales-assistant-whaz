---
id: 0005
title: Generate Implementation Tasks Breakdown
stage: tasks
date: 2026-07-19
surface: agent
model: claude-opus-4-8
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.tasks
labels: [tasks, breakdown, mvp, user-stories, tdd]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-proposal-pdf-generator/tasks.md
tests:
 - none
---

## Prompt

/sp.tasks

(Invoked with no arguments. All design documents present: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md.)

## Response snapshot

Ran `check-prerequisites.ps1 -Json` (confirmed all four optional docs available), read `tasks-template.md`, and generated `tasks.md` with **63 tasks** across 6 phases, organised by user story.

Included test tasks — they are not optional here: `plan.md` names Vitest + `@playwright/test`, and `contracts/generate-api.md` defines 9 numbered contract cases. Each of those 9 cases is mapped to a specific task and cited inline (e.g. T017 → case 1, T045 → case 3, T055 → case 7).

Phase split: **Setup** T001–T009 (greenfield Next.js init, tooling, self-hosted fonts) · **Foundational** T010–T016 (escaping boundary, font data-URI loader, browser lifecycle, page geometry, API route skeleton) · **US1** T017–T034 (P1, the MVP — schema, chrome, template, route wiring, form) · **US2** T035–T044 (P2, catalog + picker) · **US3** T045–T054 (P3, validation and failure handling) · **Polish** T055–T063 (determinism, multi-page, no-network verification, timing, deploy).

Key judgement calls:

- **`lib/chrome.ts` is the critical path** for US1 and got three dedicated tasks (header T022, footer T023, fixed-position page CSS T024) rather than one lumped "build chrome" item — it is the highest-risk work in the feature now that the chrome is code rather than an image.
- **T034 is flagged as a blocking constitutional requirement**, not a polish item. Constitution v2.0.0 Principle II makes the side-by-side fidelity comparison a required review step precisely because no authoritative raster backs the output any more. T033 pairs with it, verifying chrome text is genuinely selectable — the observable proof that nothing is silently rendering as an image.
- **Cross-story file coupling surfaced explicitly** rather than pretending full independence: US2 extends four files US1 creates (`schema.ts`, `view-model.ts`, `template.ts`, `ProposalForm.tsx`), so the Dependencies section names them for parallel-team coordination.
- Split escaping into `escapeHtml()` and `escapeHtmlWithBreaks()` (T010) so the escape-then-`<br>` ordering from research R6 is enforced by the API shape rather than left to a caller's discipline.
- Added `lib/geometry.ts` (T014) and `lib/filename.ts` (T028) as small named modules — neither appeared in the plan's structure, but both hold values referenced from multiple places.

Validated the output mechanically rather than by eye: a regex check confirmed **63/63 tasks match the required checklist format**, IDs run **strictly sequential T001–T063**, story labels are present only on user-story phases (25 unlabelled setup/foundational/polish, 18 US1, 10 US2, 10 US3), and **34 tasks carry `[P]`**.

## Outcome

- ✅ Impact: `tasks.md` complete and immediately executable — every task carries an exact file path, and the feature is now ready for `/sp.implement`. MVP scope is Phases 1–3 (T001–T034).
- 🧪 Tests: none run (task-planning artifact). Test tasks defined: 4 for US1, 4 for US2, 5 for US3, 3 in polish — all 9 contract cases covered, plus unit coverage for escaping, schema, catalog, and template.
- 📁 Files: `specs/001-proposal-pdf-generator/tasks.md` (created, 63 tasks).
- 🔁 Next prompts: `/sp.implement` to execute, or `/sp.analyze` first for a cross-artifact consistency pass (should now come back clean — the Principle II conflict was resolved by the v2.0.0 amendment). The PDF-rendering ADR is still un-consented and would now capture a decision with a documented reversal.
- 🧠 Reflection: Validating the checklist format with a script instead of reading it caught what a visual scan would likely have missed — the ID sequence and label placement were exactly the kind of mechanical constraint that drifts silently across 63 hand-written lines.

## Evaluation notes (flywheel)

- Failure modes observed: None in generation. One structural tension worth noting — the template's premise is that user stories are fully independent, but US2 and US3 genuinely extend files US1 creates. Rather than fabricate independence, the dependency section names the four shared files; forcing true independence would have meant duplicating the schema and template per story.
- Graders run and results (PASS/FAIL): Checklist format — PASS (63/63 match `- [ ] TNNN [P?] [USn?] description + path`). ID sequencing — PASS (T001–T063 contiguous). Story-label placement — PASS (labels only within user-story phases). Contract coverage — PASS (all 9 cases mapped).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Run the same regex validator as a pre-check inside `/sp.implement` so a hand-edited `tasks.md` can't drift out of format between the two commands.
