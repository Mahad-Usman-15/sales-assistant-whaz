---
id: 0002
title: Clarify Proposal Spec MVP
stage: spec
date: 2026-07-17
surface: agent
model: claude-opus-4-8
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.clarify
labels: [spec, clarify, mvp, proposal-generator]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-proposal-pdf-generator/spec.md
tests:
 - none
---

## Prompt

/sp.clarify

(No additional user text. Ran the structured ambiguity scan against the active feature spec `specs/001-proposal-pdf-generator/spec.md`.)

## Response snapshot

Ran `check-prerequisites.ps1 -Json -PathsOnly` to confirm the active feature (`001-proposal-pdf-generator`) and spec path. Scanned the spec against the full clarification taxonomy: most categories were already Clear (core goals, out-of-scope, entities, edge cases, constraints, terminology, completion signals). Four high-impact points were resting on informed assumptions that would drive the data model, template layout, and acceptance tests, so I surfaced them as clarifications (each with a recommended option). User answers:

1. **Pricing** → No pricing in v1 (confirmed the existing assumption; services show name + free/paid only).
2. **Body structure** → Full letter structure (salutation → intro → services → notes → closing → signature block).
3. **Form fields** → Use default set as-is (recipient name, client company, title, prepared-by, date; no recipient contact).
4. **Latency** → Under 30 seconds worst-case incl. cold start (user chose the loose bar over my "under 10s" recommendation).

Integrated all four into the spec: added a `## Clarifications` → `### Session 2026-07-17` block (4 bullets) right after Overview; added **FR-014** (full-letter body sections), **FR-015** (no pricing/monetary amounts), **FR-016** (≤30s generation incl. cold start + in-progress indicator); added **SC-008** (100% of generations ≤30s); updated the Generated Proposal Document entity to name the letter sections; and firmed the two now-resolved Assumptions (field set, pricing) from hedged guesses to confirmed decisions. Saved after each integration.

## Outcome

- ✅ Impact: Spec de-risked before planning — 4 material ambiguities resolved and propagated, no `[NEEDS CLARIFICATION]` markers, no contradictions left. Data model, template structure, and acceptance bar are now pinned down for `/sp.plan`.
- 🧪 Tests: none (spec artifact); acceptance = requirements checklist (still passing) plus the new measurable SC-008.
- 📁 Files: `specs/001-proposal-pdf-generator/spec.md` (Clarifications section added; FR-014/015/016, SC-008, entity + Assumptions updated).
- 🔁 Next prompts: `/sp.plan` — fill Constitution Check and make the PDF-rendering architecture decision (ADR candidate still pending).
- 🧠 Reflection: Three of the four answers matched the confirmed defaults, but pinning them explicitly converts spec Assumptions into decisions the plan/tasks can be tested against; the one divergence (30s vs 10s latency) is exactly the kind of thing worth asking rather than assuming, since it changes the acceptance threshold.

## Evaluation notes (flywheel)

- Failure modes observed: None blocking. Tension between the command's "ask exactly one question at a time" text-era loop and the native batched question UI — resolved by presenting the four discrete, independent clarifications together with per-question recommendations, which is lower-friction for the user here.
- Graders run and results (PASS/FAIL): Clarification validation — PASS (exactly one bullet per accepted answer; ≤5 questions; only allowed new headings added; terminology consistent).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none identified this round.
