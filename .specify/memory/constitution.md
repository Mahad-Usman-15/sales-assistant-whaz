<!--
Sync Impact Report
Version change: 2.0.0 → 3.0.0 (MAJOR — backward-incompatible principle redefinition)
Bump rationale: Principle II's normative rule inverts for the second time. v2.0.0 required the chrome
  be "built in HTML/CSS/SVG rather than shipped as raster assets" and that reference rasters "MUST NOT
  be bundled"; v3.0.0 requires the opposite (the approved raster is extracted and bundled; CSS
  reconstruction is forbidden). An implementation compliant with v2.0.0 violates v3.0.0 and vice
  versa. Two binding consequences of v2.0.0 — chrome text MUST be selectable, chrome MUST stay sharp
  at any zoom — are withdrawn outright as unachievable against the approved source. Both are
  backward-incompatible removals under this document's own versioning policy.
Modified principles:
  - II. Brand Fidelity Is Ground Truth, Not a Suggestion (title unchanged; mandate redefined again)
      Cause: v2.0.0 correctly established that no vector source exists, but then inferred that the
      chrome should therefore be rebuilt in code. The Whaz salesperson rejected that output. The
      decisive fact, found 2026-07-26: docs/reference-letter-head.pdf is not a letterhead swatch but
      the **client-approved finished proposal**, and the artwork it embeds — a full-page 1054x1492
      composite carrying both bands *and* the body watermark — is extractable losslessly. The approved
      artifact therefore *is* the ~127 DPI raster, which makes that resolution the fidelity bar rather
      than a defect to engineer around. A generative upscale was attempted and empirically failed
      (wrong canvas, corrupted glyphs, shifted band colour, destroyed alpha).
      The principle's *goal* (brand fidelity is non-negotiable, drift is a defect) is unchanged for the
      third consecutive version. Its verification obligation is strengthened from visual review to a
      numeric tolerance, because visual review demonstrably passed a 5.1mm layout error.
  - Verification of fidelity moved from "side-by-side comparison" (v2.0.0) to a measured baseline
      tolerance. This is a strengthening, not a relaxation.
Added sections: none. Technology Constraints' Fonts and Brand-assets bullets were rewritten; Code
  Quality Standards and Workflow Rules each gained one bullet derived from failures observed during
  this amendment's motivating work.
Removed sections: none. Two Principle II bullets were withdrawn (see bump rationale).
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" defers generically
     ("[Gates determined based on constitution file]"); no hardcoded principle text. No edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific hardcoding. No edit needed.
  ✅ .specify/templates/tasks-template.md — no principle-driven task categories to revise. No edit needed.
  ✅ .claude/commands/sp.*.md — constitution references are generic (load file, stage routing,
     "Constitution Alignment" checks); none name principles. No edit needed.
  ✅ CLAUDE.md — version references updated 2.0.0 → 3.0.0; brand guidance already describes the
     raster approach and its "code is ahead of the constitution" warning is now retired.
  ✅ README.md — v2.0.0 references updated; preview-script rationale re-pointed at the numeric check.
  ✅ specs/001-proposal-pdf-generator/plan.md — Constitution Check Principle II row rewritten for
     v3.0.0; Technology Constraints compliance line updated for Arimo.
  ✅ specs/001-proposal-pdf-generator/research.md — R1 superseded-by note added.
  ✅ specs/001-proposal-pdf-generator/spec.md — Dependencies section version reference updated.
  ✅ specs/001-proposal-pdf-generator/tasks.md — v2.0.0 obligations annotated as superseded; T033
     (selectable chrome text) marked withdrawn.
Follow-up TODOs: none. Ratification date preserved from the original adoption (2026-07-17).
-->

# Whaz Proposal Letterhead Generator Constitution

## Architecture Principles

### I. Deterministic Rendering — Zero AI in the Render Path
The proposal-generation pipeline (form → template → PDF) MUST NOT invoke any generative AI model
at any stage of layout, formatting, or PDF rendering. Every piece of content in a generated PDF
MUST originate from explicit rep input — typed or selected — or from fixed, reviewed template copy;
never from AI inference at render time.
**Rationale**: This directly resolves the confirmed root cause of the tool's predecessor failing
~70% of the time: a non-deterministic generator was used for what is fundamentally a deterministic
document-assembly task (`projectplan.md` §1). Reintroducing generative AI into the render path,
even "just for wording," reopens that exact failure mode.

Note: that the *letterhead artwork* was produced by an AI image generator does not violate this
principle. The artwork is a fixed, client-approved asset committed to the repo; no model runs during
a render. The prohibition is on generation at render time, not on the provenance of static assets.

### II. Brand Fidelity Is Ground Truth, Not a Suggestion
The letterhead's visual identity is non-negotiable, and any perceptible drift from the approved
material is a defect rather than a stylistic choice. `docs/reference-letter-head.pdf` is the single
authoritative reference; `docs/header.png`, `docs/footer.png`, `docs/letterhead-skeleton.jpeg`, and
`design.md` §5 are secondary corroborating material.

`docs/reference-letter-head.pdf` is the **client-approved finished proposal**, not a letterhead
swatch. It is authoritative for body layout and fixed prose as well as for chrome.

The chrome MUST be the approved artwork itself — the full-page composite extracted losslessly from
that PDF and committed as `assets/brand/letterhead.png` — painted full-bleed and repeated on every
page. It MUST NOT be reconstructed, approximated, or redrawn in CSS, SVG, or any other code form.

The following are binding consequences, not guidance:

- The approved artwork's native resolution **is** the fidelity bar. Its ~127 DPI is a property of
  what the client approved, not a defect to be engineered around. Re-generating, upscaling, or
  "enhancing" the artwork is FORBIDDEN — it produces a different image, not a better one.
- Exactly one brand raster MAY be bundled: the extracted composite. The reference files in `docs/`
  remain reference-only and MUST NOT be bundled or referenced by the render path.
- Fidelity MUST be verified **numerically, not visually**, before any layout or chrome change is
  merged: the baseline position of every fixed document element MUST agree with
  `docs/reference-letter-head.pdf` to within 0.5mm. A side-by-side visual look is permitted as an
  additional check but MUST NOT be the basis of a fidelity claim.
- Body text MUST remain real, selectable, searchable text. Only the letterhead artwork may be raster.
- Artwork that is genuinely bespoke rather than simple geometry MUST NOT be hand-approximated in
  code. It ships as a supplied asset or it does not ship.

**Rationale**: The goal is unchanged across all three versions — the brand chrome is ground truth and
drift is a defect. Only the mechanism has changed, twice, as facts arrived. v1.0.0 assumed a canonical
design file; none exists. v2.0.0 concluded that the chrome should therefore be rebuilt in code; the
Whaz salesperson rejected that output, and the decisive fact was then found — the reference PDF is the
approved *document*, and its embedded artwork extracts losslessly. Once the approved artifact is
available in full, reproducing it is strictly more faithful than reconstructing it, and the resolution
question dissolves: matching what the client approved is the requirement. The numeric-verification
bullet exists because a visual review of this very feature passed a 5.1mm misplacement that baseline
extraction caught immediately. The final bullet is retained unchanged from v2.0.0 and is now
*satisfied* rather than deferred — the body watermark ships as part of the extracted composite.
Full evidence and rejected alternatives: `specs/001-proposal-pdf-generator/research.md` R1 and the
spec's Clarifications, Session 2026-07-26.

### III. Stateless-by-Default, Extend Without Rebuilding
The MVP render pipeline (form → HTML → PDF → download) MUST remain stateless, with no required
database, authentication, or persistent storage. Future capabilities (proposal history, guarded
AI-assisted drafting, e-signature) MUST be layered additively around the existing pipeline, never
implemented as a replacement or rewrite of it.
**Rationale**: Preserves the low-cost, low-complexity MVP promise while keeping a credible
extension path open (`projectplan.md` §8, MVP Scope — Out).

### IV. Small, Reviewable, Spec-Driven Increments
All feature work MUST flow through the SDD lifecycle (`/sp.specify` → `/sp.plan` → `/sp.tasks` →
`/sp.implement`) and land as the smallest viable diff that satisfies its spec. No unrelated
refactors, no speculative abstractions, no code written ahead of a documented requirement.
**Rationale**: Matches the Default Policies already governing this project (see `CLAUDE.md`) and
keeps a very small team's surface area fully auditable end-to-end.

### V. Cost Ceiling as an Architectural Constraint
Recurring infrastructure cost MUST remain at $0 (or an explicitly leadership-approved near-$0
figure) at the team's current volume (~10-50 proposals/day). Any dependency, service, or hosting
change that introduces recurring cost MUST be justified against this ceiling *before* adoption,
not discovered after the fact.
**Rationale**: Low/no-cost is a hard constraint from the original business ask (`projectplan.md`
§3, Non-Functional Requirements), not a nice-to-have.

## Technology Constraints

- **Hosting**: Vercel (Free/Hobby tier) is the approved MVP target. Moving to a paid tier requires
  explicit sign-off, per Principle V.
- **Rendering stack**: Playwright plus a serverless-trimmed Chromium build (e.g. `@sparticuz/chromium`)
  for HTML→PDF. Do not add a full Puppeteer bundled-Chromium dependency — it risks the
  bundle-size/memory failures documented in `projectplan.md` §10.
- **Fonts**: Body type MUST be self-hosted `.woff2` and awaited via `document.fonts.ready` before
  printing; no runtime dependency on Google Fonts or another network font CDN. The shipped face is
  **Arimo**, chosen for metric compatibility with the reference document's Helvetica, which cannot be
  named directly because `@sparticuz/chromium` ships no system fonts.
- **Static fonts only — variable fonts are FORBIDDEN.** Chromium converts variable fonts to Type3 in
  PDF output, which drops the ToUnicode map and silently breaks text selection and search. This also
  rules out Google Fonts as a *source* for Arimo, which it serves variable-only; use per-weight static
  files (e.g. from `@fontsource`).
- **Brand assets**: Exactly one letterhead raster may be bundled — `assets/brand/letterhead.png`, the
  composite extracted losslessly from `docs/reference-letter-head.pdf` (Principle II). Everything in
  `docs/` is reference-only and MUST NOT be bundled or fetched by the render path.
- **Data**: No database in v1. The service/tool catalog is a hardcoded constant sourced from
  `tools.md`. Migrating it to a DB/CMS is an explicit, already-agreed v2 decision (see PHR-0001) —
  do not pre-build that capability speculatively during MVP work.
- **Environment**: Repo scripting is PowerShell-only (`.specify/scripts/powershell/`). Do not
  introduce a parallel Bash script path unless it is actually implemented and tested (see
  `CLAUDE.md`'s "PHR script gap" note) — command docs that assume `create-phr.sh` exists are
  currently aspirational, not descriptive of this repo.

## Code Quality Standards

- Prefer the smallest viable diff; never refactor code unrelated to the task at hand.
- Do not invent APIs, data shapes, or third-party contracts; ask a targeted clarifying question
  when a dependency's behavior is unconfirmed rather than guessing.
- Cite existing code precisely (path + line range) when referencing it during review or planning;
  propose new code in fenced blocks.
- No dead or speculative code: no unused feature flags, no "just in case" configuration options,
  no half-finished implementations left in the tree.
- Comments explain non-obvious *why* (a hidden constraint, a workaround, a subtle invariant),
  never restate *what* the code already says. Values tuned empirically against a reference MUST say
  so, so a later reader does not "clean up" a number that is load-bearing.
- Assumptions about external artifacts MUST record their provenance — who produced the artifact,
  with what tool, and whether an editable source exists — before being built upon. An unverified
  provenance assumption invalidated Principle II once already; treat it as a known failure mode.
- An artifact MUST be inspected in full before its contents are summarized or relied upon. Rendering
  or opening *part* of a file is not reading it: `reference-letter-head.pdf` was described as a
  letterhead swatch for weeks because only its image layer was examined and never its text layer,
  and that summary propagated into `CLAUDE.md` and shaped the plan.

## Security Requirements

- No secrets, API keys, or tokens MUST ever be hardcoded; all such values load from `.env`
  (untracked), with `.env.example` documenting the required keys.
- The proposal form and its API route MUST validate and sanitize all rep-entered input
  server-side before it is interpolated into the rendered HTML, preventing HTML/script injection
  into the PDF template.
- The rendering pipeline MUST NOT fetch remote content (fonts, images, scripts) at render time —
  all assets MUST be bundled locally and inlined, closing off a class of SSRF/data-exfiltration
  risk inside the serverless render step. The letterhead raster is inlined as a data URI for this
  reason, not merely for latency.
- Any future addition of storage or authentication MUST follow least-privilege access (scoped
  credentials, no shared admin keys) and MUST be reflected in this constitution and `CLAUDE.md`
  before being merged, not after the fact.

## Workflow Rules

- Every user prompt MUST be captured as a Prompt History Record (PHR) under `history/prompts/`,
  routed by stage per `.claude/commands/sp.phr.md` (constitution work → `history/prompts/constitution/`;
  feature-stage work → `history/prompts/<feature-name>/`; pre-feature/general work →
  `history/prompts/general/`).
- Architecturally significant decisions MUST be surfaced as an ADR suggestion and MUST NOT be
  auto-created — the user's explicit consent is required before `/sp.adr` writes a record.
- Feature branches MUST follow the `NNN-short-name` convention enforced by `Test-FeatureBranch`
  in `.specify/scripts/powershell/common.ps1`.
- `CLAUDE.md` MUST be updated in the same change whenever a spec, feature, plan, tasks file, this
  constitution, or another architecturally-defining artifact changes — it is a live snapshot of
  the repo, not a one-time document (see `CLAUDE.md`'s "Keeping this file current" section).
- Ambiguous requirements, unforeseen dependencies, or architecturally uncertain forks in approach
  MUST be raised to the user for a decision rather than silently assumed.
- When new information falsifies a premise this constitution relies on, the principle MUST be
  amended through the procedure below — never silently reinterpreted to fit the new circumstance.
- A verification claim MUST state the environment that produced it. "Tests pass" is incomplete;
  which suite, against which build, is the claim. This project has been misled twice by the same
  gap: the integration suite runs against a production build and so cannot evidence dev-mode
  behaviour, and its `reuseExistingServer` setting means it silently tests whatever already occupies
  port 3000 rather than the build it names.

## Governance

This constitution supersedes any conflicting ad-hoc practice. All specs, plans, and tasks MUST be
checked against it — `/sp.analyze` treats a constitution conflict as automatically CRITICAL,
requiring the spec/plan/tasks to change, not the principle to be silently reinterpreted or diluted.

**Amendment procedure**: Amendments are proposed via `/sp.constitution`, must state which
principle(s) are added, changed, or removed and why, and take effect immediately upon being
written to this file — there is no separate approval workflow beyond the user driving that command.
An amendment that reverses a normative rule MUST cite the evidence that motivated it, so a future
reader can distinguish a correction from a drift.

**Implementation MUST NOT precede its amendment.** Where code has already shipped against a rule this
document still forbids, that gap MUST be recorded explicitly (in `CLAUDE.md` and the relevant plan)
until the amendment lands. Principle II reached that state on 2026-07-26 and is resolved by v3.0.0.

**Versioning policy**: Semantic versioning (MAJOR.MINOR.PATCH) — MAJOR for backward-incompatible
principle removal or redefinition, MINOR for a new principle or a materially expanded section,
PATCH for wording or clarification fixes that carry no normative change.

**Compliance review**: Every `/sp.plan` run MUST re-check its Constitution Check section against
this file, both before Phase 0 research and after Phase 1 design. Every `/sp.analyze` run MUST
flag constitution violations as CRITICAL findings.

**Version**: 3.0.0 | **Ratified**: 2026-07-17 | **Last Amended**: 2026-07-26
