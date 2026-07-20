---
id: 0002
title: Amend Principle II For CSS Chrome
stage: constitution
date: 2026-07-19
surface: agent
model: claude-opus-4-8
feature: none
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.constitution
labels: [constitution, amendment, major-bump, brand-fidelity, governance]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md
 - specs/001-proposal-pdf-generator/plan.md
 - specs/001-proposal-pdf-generator/research.md
 - specs/001-proposal-pdf-generator/spec.md
 - CLAUDE.md
tests:
 - none
---

## Prompt

/sp.constitution

(Invoked with no arguments, following the plan-stage finding that Principle II must be amended before `/sp.implement` — see PHR 001-proposal-pdf-generator/0004.)

## Response snapshot

Amended **Principle II — Brand Fidelity Is Ground Truth** and bumped the constitution **1.0.0 → 2.0.0 (MAJOR)**.

**Bump reasoning**: v1.0.0 required the chrome be *"treated as pre-exported image assets ... never hand-recreated as a CSS/SVG approximation."* v2.0.0 requires the opposite. An implementation compliant with one violates the other, which is precisely a backward-incompatible redefinition under the document's own versioning policy — so MAJOR, not MINOR. The principle's *title and goal* are unchanged; only the mandated mechanism inverted.

**Why the amendment was warranted rather than a workaround**: v1.0.0's rationale rested on two premises — that the chrome is *"hand-designed graphic art, not simple geometry"* and that a *"canonical design file"* exists. Both are factually false. The letterhead was produced by an AI image generator, so no vector source exists and the mandated re-export is impossible at any resolution; and the composition (linear-gradient band, clip-path cut, radial-gradient dot grid, Montserrat Black wordmark) is ordinary CSS geometry.

**What v2.0.0 changes**: mandates CSS/SVG-built chrome; forbids bundling the reference rasters; and adds four binding consequences — chrome text must be real selectable text, output must stay sharp at any size, fidelity must be verified by explicit side-by-side comparison before any chrome change merges (a *required* review step, since no authoritative raster remains in the output path), and genuinely bespoke artwork such as the deferred watermark must still never be hand-approximated. That last clause deliberately preserves the half of v1.0.0 that was correct — the original error was classifying simple CSS geometry as bespoke art, not the instinct to protect bespoke art.

**Secondary hardening drawn from the failure itself**: added a Code Quality Standard requiring that assumptions about external artifacts record their **provenance** (who made it, with what tool, whether an editable source exists) before being built upon — the unverified provenance assumption is what invalidated Principle II. Added a Workflow Rule that a falsified premise MUST be amended through Governance, never silently reinterpreted. Extended the amendment procedure to require citing motivating evidence, so future readers can tell a correction from a drift. Technology Constraints gained a brand-assets bullet (no raster may be bundled) and a note that Montserrat Black is load-bearing.

**Propagation**: verified `plan-template.md`, `spec-template.md`, `tasks-template.md`, and all `.claude/commands/sp.*.md` defer generically to the constitution with no hardcoded principle text — no template edits needed. Updated `plan.md` (Principle II row → PASS, overall verdict CONDITIONAL PASS → PASS, Complexity Tracking deviation retired, Summary warning replaced), `research.md` R1 (conflict → RESOLVED), `spec.md` (v2.0.0 reference), and `CLAUDE.md` (4 version references + the new amend-don't-reinterpret rule).

## Outcome

- ✅ Impact: Constitution at v2.0.0; the feature plan now complies with policy as written, with **zero outstanding exceptions** — Complexity Tracking is empty again because the conflict was resolved by amendment, not by granting a waiver.
- 🧪 Tests: none (governance documentation). Validation performed: no unresolved bracket tokens, version line matches the Sync Impact Report, dates ISO-8601, principles stated in MUST/MUST NOT terms.
- 📁 Files: `.specify/memory/constitution.md` (Principle II rewritten; Technology Constraints +2 bullets; Code Quality Standards +1; Workflow Rules +1; Governance amendment procedure extended; new Sync Impact Report), `plan.md`, `research.md`, `spec.md`, `CLAUDE.md`.
- 🔁 Next prompts: `/sp.tasks` — now unblocked. The chrome fidelity comparison must land as an explicit task, since v2.0.0 makes it a required review step rather than a suggestion.
- 🧠 Reflection: The temptation was to soften Principle II into something vague enough to permit both approaches. That would have destroyed its usefulness as a gate. Inverting the mechanism decisively while *strengthening* the verification obligation keeps the principle testable — and the MAJOR bump is the honest signal that prior-compliant work would now be non-compliant.

## Evaluation notes (flywheel)

- Failure modes observed: A ratified principle encoded an unverified factual claim about the world ("a canonical design file exists") inside its rationale, so falsifying that claim invalidated binding policy. Principles should assert values and rules; where they depend on a fact, that fact needs verifying before ratification — which is now itself a Code Quality Standard.
- Graders run and results (PASS/FAIL): Constitution validation — PASS (no bracket tokens, version/report agreement, ISO dates, declarative MUST-language). Propagation checklist — PASS (4 template/command groups verified as generic; 4 dependent docs updated).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): When ratifying or amending a principle, mark any factual premise it depends on with its evidence source inline, so a future reader can re-verify the premise without reconstructing the reasoning from scratch.
