<!--
Sync Impact Report
Version change: 1.0.0 → 2.0.0 (MAJOR — backward-incompatible principle redefinition)
Bump rationale: Principle II's normative rule is inverted, not merely clarified. v1.0.0 required the
  letterhead chrome be "treated as pre-exported image assets ... never hand-recreated as a CSS/SVG
  approximation"; v2.0.0 requires the opposite (chrome built in HTML/CSS/SVG, reference rasters never
  bundled). An implementation compliant with v1.0.0 violates v2.0.0 and vice versa, which is the
  definition of a backward-incompatible redefinition under this document's own versioning policy.
Modified principles:
  - II. Brand Fidelity Is Ground Truth, Not a Suggestion (title unchanged; mandate redefined)
      Cause: the v1.0.0 rationale rested on two premises found to be factually false — that the chrome
      is "hand-designed graphic art, not simple geometry", and that a "canonical design file" exists.
      The letterhead was produced by an AI image generator; no vector/editable source exists, so the
      mandated re-export path is unavailable at any resolution. Evidence and rejected alternatives:
      specs/001-proposal-pdf-generator/research.md R1.
      The principle's *goal* (brand fidelity is non-negotiable) is unchanged and its verification
      obligation is strengthened, since no authoritative raster remains in the output path.
Added sections: none (Technology Constraints gained two bullets; Code Quality Standards and Workflow
  Rules each gained one bullet derived from the failure that motivated this amendment).
Removed sections: none.
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" defers generically
     ("[Gates determined based on constitution file]"); no hardcoded principle text. No edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific hardcoding. No edit needed.
  ✅ .specify/templates/tasks-template.md — no principle-driven task categories to revise. No edit needed.
  ✅ .claude/commands/sp.*.md — constitution references are generic (load file, stage routing,
     "Constitution Alignment" checks); none name principles. No edit needed.
  ✅ CLAUDE.md — version references updated 1.0.0 → 2.0.0; brand-chrome guidance already corrected.
  ✅ specs/001-proposal-pdf-generator/plan.md — Constitution Check Principle II row moved from
     "AMENDMENT REQUIRED" to PASS; Complexity Tracking deviation retired.
  ✅ specs/001-proposal-pdf-generator/spec.md — Dependencies section version reference updated.
  ✅ specs/001-proposal-pdf-generator/research.md — R1 conflict note updated to "resolved".
Follow-up TODOs: none. Ratification date preserved from the original adoption (2026-07-17).
-->

# Whaz Proposal Letterhead Generator Constitution

## Architecture Principles

### I. Deterministic Rendering — Zero AI in the Render Path
The proposal-generation pipeline (form → template → PDF) MUST NOT invoke any generative AI model
at any stage of layout, formatting, or PDF rendering. Every piece of content in a generated PDF
MUST originate from explicit rep input — typed or selected — never from AI inference.
**Rationale**: This directly resolves the confirmed root cause of the tool's predecessor failing
~70% of the time: a non-deterministic generator was used for what is fundamentally a deterministic
document-assembly task (`projectplan.md` §1). Reintroducing generative AI into the render path,
even "just for wording," reopens that exact failure mode.

### II. Brand Fidelity Is Ground Truth, Not a Suggestion
The letterhead's visual identity — diagonal-cut gradient bands, the WHAZ wordmark, contact and
tagline zones, dot-grid texture — is non-negotiable. `docs/header.png`, `docs/footer.png`,
`docs/letterhead-skeleton.jpeg`, `docs/reference-letter-head.pdf`, and `design.md` §5 are the
authoritative visual references; any perceptible drift from them is a defect, not a stylistic choice.

Because the letterhead was produced by an AI image generator and **no vector or editable source file
exists**, the chrome MUST be built in HTML/CSS/SVG rather than shipped as raster assets. The
reference PNGs MUST NOT be bundled into the application: they are ~127 DPI with contact text baked in
as pixels, they cannot be re-exported, and no upscaler can recover detail that was never captured.

The following are binding consequences, not guidance:

- Text within the chrome (contact email, taglines, wordmark) MUST render as real selectable text,
  never as rasterized pixels.
- The chrome MUST remain sharp at any zoom or print size.
- Because no authoritative raster remains in the output path, visual fidelity MUST be verified by
  explicit side-by-side comparison against the reference material before any chrome change is
  merged. This is a required review step, not an optional check.
- Artwork that is genuinely bespoke rather than simple geometry — for example the deferred body
  watermark — MUST NOT be hand-approximated in code. It either ships as a supplied asset or stays
  deferred.

**Rationale**: The goal is unchanged from v1.0.0 — the brand chrome is ground truth and drift is a
defect. Only the mechanism changed, because v1.0.0's mechanism assumed a canonical design file that
does not exist. Building the chrome in code raises fidelity rather than lowering it: vector and text
output is exact at any resolution, where the only available raster is capped at ~127 DPI with
unsearchable contact details. The final bullet preserves what v1.0.0 got right — hand-drawing bespoke
art *is* a fidelity risk; the error was classifying ordinary CSS geometry (gradients, clip-path cuts,
a Montserrat wordmark) as bespoke art. Full evidence and rejected alternatives:
`specs/001-proposal-pdf-generator/research.md` R1.

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
- **Fonts**: Montserrat/Inter MUST be self-hosted (`.woff2`) and awaited via `document.fonts.ready`
  before printing; no runtime dependency on Google Fonts or another network font CDN. **Montserrat
  Black (900) is load-bearing** — under Principle II the wordmark is type rather than artwork, so a
  failed load breaks the logo itself, not merely body copy.
- **Brand assets**: No letterhead raster may be bundled into the application or referenced by the
  render path. The PNGs in `docs/` are visual reference material only (see Principle II).
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
  never restate *what* the code already says.
- Assumptions about external artifacts MUST record their provenance — who produced the artifact,
  with what tool, and whether an editable source exists — before being built upon. An unverified
  provenance assumption invalidated Principle II once already; treat it as a known failure mode.

## Security Requirements

- No secrets, API keys, or tokens MUST ever be hardcoded; all such values load from `.env`
  (untracked), with `.env.example` documenting the required keys.
- The proposal form and its API route MUST validate and sanitize all rep-entered input
  server-side before it is interpolated into the rendered HTML, preventing HTML/script injection
  into the PDF template.
- The rendering pipeline MUST NOT fetch remote content (fonts, images, scripts) at render time —
  all assets MUST be bundled locally and inlined, closing off a class of SSRF/data-exfiltration
  risk inside the serverless render step.
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

## Governance

This constitution supersedes any conflicting ad-hoc practice. All specs, plans, and tasks MUST be
checked against it — `/sp.analyze` treats a constitution conflict as automatically CRITICAL,
requiring the spec/plan/tasks to change, not the principle to be silently reinterpreted or diluted.

**Amendment procedure**: Amendments are proposed via `/sp.constitution`, must state which
principle(s) are added, changed, or removed and why, and take effect immediately upon being
written to this file — there is no separate approval workflow beyond the user driving that command.
An amendment that reverses a normative rule MUST cite the evidence that motivated it, so a future
reader can distinguish a correction from a drift.

**Versioning policy**: Semantic versioning (MAJOR.MINOR.PATCH) — MAJOR for backward-incompatible
principle removal or redefinition, MINOR for a new principle or a materially expanded section,
PATCH for wording or clarification fixes that carry no normative change.

**Compliance review**: Every `/sp.plan` run MUST re-check its Constitution Check section against
this file, both before Phase 0 research and after Phase 1 design. Every `/sp.analyze` run MUST
flag constitution violations as CRITICAL findings.

**Version**: 2.0.0 | **Ratified**: 2026-07-17 | **Last Amended**: 2026-07-19
