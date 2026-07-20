---
id: 0003
title: Plan Proposal PDF Generator MVP
stage: plan
date: 2026-07-19
surface: agent
model: claude-opus-4-8
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.plan
labels: [plan, architecture, brand-assets, pdf-render, constitution-check]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-proposal-pdf-generator/plan.md
 - specs/001-proposal-pdf-generator/research.md
 - specs/001-proposal-pdf-generator/data-model.md
 - specs/001-proposal-pdf-generator/contracts/generate-api.md
 - specs/001-proposal-pdf-generator/quickstart.md
 - specs/001-proposal-pdf-generator/spec.md
 - design.md
 - CLAUDE.md
tests:
 - none
---

## Prompt

/sp.plan

Note:header and footer are in /docs

## Response snapshot

Ran `setup-plan.ps1 -Json`, then inspected the newly-supplied `docs/header.png` / `docs/footer.png` rather than taking them on trust. Both are 1054×1492 RGBA. An alpha-channel audit (PIL) showed all artwork confined to a band — header rows 607–883, footer rows 664–827 — with everything else fully transparent. Three findings followed:

1. **Bands float mid-canvas.** The A4-proportioned canvas invites using each file as a full-page background, but that would stack header and footer in the middle of the page. Assets must be cropped to the band.
2. **~127 DPI** (1054px across A4's 210mm) vs. the ~300 DPI target in `projectplan.md` §9 — and the bands have small text (email, taglines) baked into the raster, so it would print soft and be unsearchable.
3. **The body watermark does not exist.** Alpha is zero outside the bands in both files, yet `design.md` §5 and FR-005 both required it.

Because Constitution Principle II makes brand fidelity a hard requirement, I did not silently compromise on 2 or 3 — raised both as architectural decisions. User chose: **re-export at ~300 DPI cropped to band** (header 2480×~652, footer 2480×~386) and **drop the watermark from v1**. Amended `spec.md` (FR-005 rewritten, new Clarifications session 2026-07-19) and `design.md` §5 (watermark marked not-implemented; added a concrete band export spec) so neither document claims fidelity the build won't deliver.

Then wrote the full Phase 0/1 artifact set: `plan.md` (Technical Context, Constitution Check table across all 5 principles + tech/security constraint compliance, project structure, empty Complexity Tracking), `research.md` (8 decisions with rationale + alternatives — asset audit, watermark, render stack, `position: fixed` chrome repetition over Playwright's `displayHeaderFooter`, zero-network data-URI inlining, escaping boundary, cold-start budget, catalog sourcing), `data-model.md` (4 in-memory shapes, no DB), `contracts/generate-api.md` (request/response schema, 9 contract tests), `quickstart.md` (setup, verification checklist, deploy troubleshooting).

Ran `update-agent-context.ps1 -AgentType claude`; it reported adding language/framework/database but actually only prepended a UTF-8 BOM to `CLAUDE.md` (no marker section exists for it to inject into). Stripped the BOM and updated `CLAUDE.md` by hand instead — stack decisions, the blocking asset re-export, the deferred watermark, the corrected catalog count, and the new artifact inventory.

## Outcome

- ✅ Impact: Feature 001 fully planned and Constitution-Check-passing (initial + post-design, zero violations). Two brand-fidelity defects in the supplied assets were caught before implementation rather than after, and both spec and design docs were corrected to match what will actually ship.
- 🧪 Tests: none run (planning artifacts). Test strategy defined: Vitest units (escape/schema/catalog/template) + `@playwright/test` integration, with 9 named API contract cases including determinism, injection, and multi-page.
- 📁 Files: created `plan.md`, `research.md`, `data-model.md`, `contracts/generate-api.md`, `quickstart.md`; amended `spec.md` (FR-005 + Clarifications), `design.md` (§5 watermark + export spec), `CLAUDE.md` (4 sections).
- 🔁 Next prompts: `/sp.tasks` to generate `tasks.md`. In parallel, the 300 DPI re-export is a blocking prerequisite for the render task — worth starting now. ADR candidate on the PDF-rendering architecture is still open and un-consented.
- 🧠 Reflection: The user's one-line note ("header and footer are in /docs") looked like a trivial pointer, but verifying the assets instead of assuming they were ready is what surfaced all three defects. Measuring the alpha channel — rather than eyeballing the rendered images, which showed white margins that could plausibly have been a viewer artifact — is what turned "the watermark might be missing" into a fact solid enough to amend the spec on.

## Evaluation notes (flywheel)

- Failure modes observed: (1) `update-agent-context.ps1` reports success while doing nothing useful — it logs "Added language/framework/database" but silently no-ops when the target file lacks its expected marker section, and its only real effect was adding a UTF-8 BOM. Don't trust its summary output; diff the file. (2) I typed a stray Cyrillic word ("структure") into `plan.md` and had to correct it.
- Graders run and results (PASS/FAIL): Constitution Check — PASS on all 5 principles, both pre-Phase-0 and post-Phase-1; Technology Constraints and Security Requirements — PASS; Complexity Tracking — empty (no violations to justify).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Before `/sp.implement`, add the asset aspect-ratio guard described in research R1 to `lib/assets.ts` as an early task, so a bad re-export fails loudly at first render instead of producing a subtly broken PDF.
