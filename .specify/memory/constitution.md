<!--
Sync Impact Report
Version change: [UNRATIFIED TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A — no prior named principles existed; all placeholders resolved for the first time.
Added sections:
  - Architecture Principles (I. Deterministic Rendering — Zero AI in the Render Path;
    II. Brand Fidelity Is Ground Truth, Not a Suggestion; III. Stateless-by-Default,
    Extend Without Rebuilding; IV. Small, Reviewable, Spec-Driven Increments;
    V. Cost Ceiling as an Architectural Constraint)
  - Technology Constraints
  - Code Quality Standards
  - Security Requirements
  - Workflow Rules
  - Governance (amendment procedure, versioning policy, compliance review)
Removed sections: none (template placeholders replaced; no prior ratified content existed to remove).
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" section already defers generically
     to this file ("[Gates determined based on constitution file]"); no edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific hardcoding found; no edit needed.
  ✅ .specify/templates/tasks-template.md — no constitution-specific hardcoding found; no edit needed.
  ✅ .claude/commands/*.md — reviewed all `sp.*.md` command files; constitution references are
     generic (load file, stage routing, "Constitution Alignment" checks in sp.analyze.md); none
     hardcode principle names or agent-specific naming that this ratification would invalidate.
Follow-up TODOs: none deferred — this is a from-scratch ratification, not an amendment, so no prior
  dates or version numbers needed to be preserved.
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
The letterhead's header/footer chrome (diagonal-cut bands, watermark, dot-grid texture, logo and
contact zones) MUST be treated as pre-exported image assets sourced from the canonical design
file, never hand-recreated as a CSS/SVG approximation. `docs/letterhead-skeleton.jpeg`,
`docs/reference-letter-head.pdf`, and `design.md` §5 are the authoritative references; any visual
drift from them is a defect, not a stylistic choice.
**Rationale**: The brand chrome is hand-designed graphic art, not simple geometry — approximating
it in code risks reintroducing the layout inconsistency this tool exists to eliminate
(`projectplan.md` §9).

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
  before printing; no runtime dependency on Google Fonts or another network font CDN.
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

## Security Requirements

- No secrets, API keys, or tokens MUST ever be hardcoded; all such values load from `.env`
  (untracked), with `.env.example` documenting the required keys.
- The proposal form and its API route MUST validate and sanitize all rep-entered input
  server-side before it is interpolated into the rendered HTML, preventing HTML/script injection
  into the PDF template.
- The rendering pipeline MUST NOT fetch remote content (fonts, images, scripts) at render time —
  all assets (fonts, header/footer images) MUST be bundled locally, closing off a class of
  SSRF/data-exfiltration risk inside the serverless render step.
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

## Governance

This constitution supersedes any conflicting ad-hoc practice. All specs, plans, and tasks MUST be
checked against it — `/sp.analyze` treats a constitution conflict as automatically CRITICAL,
requiring the spec/plan/tasks to change, not the principle to be silently reinterpreted or diluted.

**Amendment procedure**: Amendments are proposed via `/sp.constitution`, must state which
principle(s) are added, changed, or removed and why, and take effect immediately upon being
written to this file — there is no separate approval workflow beyond the user driving that command.

**Versioning policy**: Semantic versioning (MAJOR.MINOR.PATCH) — MAJOR for backward-incompatible
principle removal or redefinition, MINOR for a new principle or a materially expanded section,
PATCH for wording or clarification fixes that carry no normative change.

**Compliance review**: Every `/sp.plan` run MUST re-check its Constitution Check section against
this file, both before Phase 0 research and after Phase 1 design. Every `/sp.analyze` run MUST
flag constitution violations as CRITICAL findings.

**Version**: 1.0.0 | **Ratified**: 2026-07-17 | **Last Amended**: 2026-07-17
