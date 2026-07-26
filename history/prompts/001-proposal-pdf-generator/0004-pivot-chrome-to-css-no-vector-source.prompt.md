---
id: 0004
title: Pivot Chrome To CSS Rebuild
stage: plan
date: 2026-07-19
surface: agent
model: claude-opus-4-8
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: none
labels: [plan, architecture, brand-assets, constitution-conflict, pivot]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-proposal-pdf-generator/research.md
 - specs/001-proposal-pdf-generator/plan.md
 - specs/001-proposal-pdf-generator/quickstart.md
 - specs/001-proposal-pdf-generator/spec.md
 - design.md
 - projectplan.md
 - CLAUDE.md
tests:
 - none
---

## Prompt

Can I add any skill that increase the dpi of the image

(followed by)

the template is created by AI

## Response snapshot

Answered the DPI question directly: no tool can add real resolution to a finished raster. DPI metadata is just a tag; resampling (Lanczos/bicubic) only smooths; a generative upscaler would invent letterforms — unacceptable in a rendered email address a client reads, and barred by Principle II's ban on approximating brand art. Recommended re-export from vector source instead, and offered to do it via the connected Figma MCP.

The user's follow-up — **"the template is created by AI"** — invalidated the decision made minutes earlier. There is no vector source: the AI-generated raster *is* the original, so the ~300 DPI re-export agreed in PHR-0003 is unexecutable. It also falsified a standing project assumption recorded in `projectplan.md` §8/§9/§10 and the original planning session, which all stated an editable design file existed elsewhere and could be re-exported at print resolution.

Reframed the situation rather than just reporting the blocker: the loss of the source file actually makes a **CSS/SVG rebuild the strongest option**, not the forbidden one. Principle II bans hand-recreating the chrome on the stated rationale that it is *"hand-designed graphic art, not simple geometry"* from a *"canonical design file"* — both premises are now provably false. And the composition really is ordinary CSS: `linear-gradient` band, `clip-path` diagonal cut, `radial-gradient` dot grid, SVG icons, and a wordmark that `design.md` §5 itself identifies as **Montserrat Black plus a star glyph** — a face already being self-hosted. Rebuilt that way the chrome is resolution-independent and its contact text becomes selectable and searchable, which is strictly better fidelity than the 300 DPI raster originally chased.

Presented four options with that reasoning; user chose **rebuild in HTML/CSS/SVG**. Propagated the pivot across every affected artifact rather than leaving half of them describing the image approach:

- **`research.md`** — rewrote R1 wholesale (asset audit retained, decision reversed, no-vector-source constraint, constitution conflict, 5 rejected alternatives, new visual-fidelity obligation); R2 clarified that the CSS argument deliberately does *not* extend to the bespoke watermark; R4 noted Playwright's `displayHeaderFooter` is now disqualifying since it ignores page CSS/fonts; R5 upgraded font inlining from prudent to load-bearing (a failed Montserrat Black load now breaks the *logo*, not just body copy) and switched the required face to weight 900.
- **`plan.md`** — Summary rewritten; Principle II row changed from PASS to **AMENDMENT REQUIRED**; overall verdict to CONDITIONAL PASS; Complexity Tracking populated (was intentionally empty) with the deviation and its rejected alternatives; structure drops `assets/brand/` and `lib/assets.ts`, adds `lib/chrome.ts` and `lib/fonts.ts`.
- **`quickstart.md`** — removed the blocking asset prerequisite entirely; added a mandatory visual-fidelity comparison checklist; verification now asserts chrome text is *selectable*, which is the observable proof no image is being rendered.
- **`spec.md`** — FR-005 rewritten to require resolution-independence and real text; new Clarifications entry explicitly marked as superseding the 300 DPI answer.
- **`design.md`** §5, **`projectplan.md`** (§8 scope, §9 architecture + diagram, §10 risk, follow-ups), **`CLAUDE.md`** — all corrected, with the superseded guidance struck through and dated rather than deleted, so the reversal stays legible.

## Outcome

- ✅ Impact: Architecture pivoted from image-based to CSS-built letterhead chrome on new information, and propagated across 7 files. A blocking external dependency was removed from the critical path, and output fidelity improved (resolution-independent, selectable contact text) rather than degraded. One constitution amendment is now a prerequisite for `/sp.implement`.
- 🧪 Tests: none (planning artifacts). Added a new implementation-time obligation: visual fidelity of the CSS chrome must be reviewed against `docs/*.png` — now a checklist in `quickstart.md` and a task for `/sp.tasks`.
- 📁 Files: `research.md` (R1 rewritten, R2/R4/R5 revised), `plan.md` (Summary, Constitution Check, Complexity Tracking, structure), `quickstart.md`, `spec.md` (FR-005 + Clarifications), `design.md` §5, `projectplan.md` (5 corrections), `CLAUDE.md`.
- 🔁 Next prompts: **`/sp.constitution`** to amend Principle II (required before implementation) — then `/sp.tasks`. The PDF-rendering ADR is now more clearly warranted, since the chrome decision has a documented reversal worth preserving.
- 🧠 Reflection: The right move was not to treat "no vector source" purely as bad news. Losing the source removed the only real justification for the image-based approach, so the constraint that looked like a setback was what unlocked the better design. Equally important was refusing to quietly reinterpret Principle II — the honest path is amending it, since its rationale is factually wrong, and `/sp.analyze` flagging CRITICAL in the meantime is correct behaviour, not noise to suppress.

## Evaluation notes (flywheel)

- Failure modes observed: A project-level assumption ("an editable source design file exists and can be re-exported") sat unverified in `projectplan.md` across the entire planning phase and propagated into the constitution's Principle II rationale, the spec, the plan, and a user-facing decision — before one sentence from the user falsified it. Asset *provenance* deserves the same up-front verification as asset *content*; the alpha-channel audit caught what the files were, but not where they came from, and only the latter determined the architecture.
- Graders run and results (PASS/FAIL): Constitution Check re-run post-pivot — 4 of 5 principles PASS; Principle II fails pending amendment and is logged in Complexity Tracking rather than rationalised away.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): When `/sp.plan` records a dependency on an external artifact, state its provenance explicitly in Technical Context (who made it, with what tool, whether a source file exists) so an unverifiable assumption is visible at plan time rather than surfacing mid-implementation.
