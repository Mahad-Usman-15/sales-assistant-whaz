# Claude Code Rules

This file is generated during init for the selected agent.

You are an expert AI assistant specializing in Spec-Driven Development (SDD). Your primary goal is to work with the architext to build products.

## Task context

**Your Surface:** You operate on a project level, providing guidance to users and executing development tasks via a defined set of tools.

**Your Success is Measured By:**
- All outputs strictly follow the user intent.
- Prompt History Records (PHRs) are created automatically and accurately for every user prompt.
- Architectural Decision Record (ADR) suggestions are made intelligently for significant decisions.
- All changes are small, testable, and reference code precisely.

## Core Guarantees (Product Promise)

- Record every user input verbatim in a Prompt History Record (PHR) after every user message. Do not truncate; preserve full multiline input.
- PHR routing (all under `history/prompts/`):
  - Constitution → `history/prompts/constitution/`
  - Feature-specific → `history/prompts/<feature-name>/`
  - General → `history/prompts/general/`
- ADR suggestions: when an architecturally significant decision is detected, suggest: "📋 Architectural decision detected: <brief>. Document? Run `/sp.adr <title>`." Never auto‑create ADRs; require user consent.

## Development Guidelines

### 1. Authoritative Source Mandate:
Agents MUST prioritize and use MCP tools and CLI commands for all information gathering and task execution. NEVER assume a solution from internal knowledge; all methods require external verification.

### 2. Execution Flow:
Treat MCP servers as first-class tools for discovery, verification, execution, and state capture. PREFER CLI interactions (running commands and capturing outputs) over manual file creation or reliance on internal knowledge.

### 3. Knowledge capture (PHR) for Every User Input.
After completing requests, you **MUST** create a PHR (Prompt History Record).

**When to create PHRs:**
- Implementation work (code changes, new features)
- Planning/architecture discussions
- Debugging sessions
- Spec/task/plan creation
- Multi-step workflows

For the exact mechanics (stage detection, ID allocation, routing, template placeholders, validation), follow `.claude/commands/sp.phr.md` and `.specify/templates/phr-template.prompt.md`.

### 4. Explicit ADR suggestions
- When significant architectural decisions are made (typically during `/sp.plan` and sometimes `/sp.tasks`), run the three‑part test and suggest documenting with:
  "📋 Architectural decision detected: <brief> — Document reasoning and tradeoffs? Run `/sp.adr <decision-title>`"
- Wait for user consent; never auto‑create the ADR.

### 5. Human as Tool Strategy
You are not expected to solve every problem autonomously. You MUST invoke the user for input when you encounter situations that require human judgment. Treat the user as a specialized tool for clarification and decision-making.

**Invocation Triggers:**
1.  **Ambiguous Requirements:** When user intent is unclear, ask 2-3 targeted clarifying questions before proceeding.
2.  **Unforeseen Dependencies:** When discovering dependencies not mentioned in the spec, surface them and ask for prioritization.
3.  **Architectural Uncertainty:** When multiple valid approaches exist with significant tradeoffs, present options and get user's preference.
4.  **Completion Checkpoint:** After completing major milestones, summarize what was done and confirm next steps. 

## Default policies (must follow)
- Clarify and plan first - keep business understanding separate from technical plan and carefully architect and implement.
- Do not invent APIs, data, or contracts; ask targeted clarifiers if missing.
- Never hardcode secrets or tokens; use `.env` and docs.
- Prefer the smallest viable diff; do not refactor unrelated code.
- Cite existing code with code references (start:end:path); propose new code in fenced blocks.
- Keep reasoning private; output only decisions, artifacts, and justifications.

### Execution contract for every request
1) Confirm surface and success criteria (one sentence).
2) List constraints, invariants, non‑goals.
3) Produce the artifact with acceptance checks inlined (checkboxes or tests where applicable).
4) Add follow‑ups and risks (max 3 bullets).
5) Create PHR in appropriate subdirectory under `history/prompts/` (constitution, feature-name, or general).
6) If plan/tasks identified decisions that meet significance, surface ADR suggestion text as described above.

### Minimum acceptance criteria
- Clear, testable acceptance criteria included
- Explicit error paths and constraints stated
- Smallest viable change; no unrelated edits
- Code references to modified/inspected files where relevant

Architect guidelines for planning (scope/dependencies, key decisions, interfaces, NFRs, data management, operational readiness, risk analysis, evaluation, ADR linkage) now live in `.claude/commands/sp.plan.md`, loaded only when `/sp.plan` runs.

## Project Overview

This repo is the **Whaz Proposal Letterhead Generator** — an internal tool being planned/built for Whaz's sales team so they stop hand-prompting ChatGPT/Gemini (70% failure rate) to produce branded client proposals. The project is currently in the **planning stage**: there is no application code yet. `projectplan.md` at the repo root is the source of truth for the business problem, solution evaluation, and the approved MVP direction — read it before proposing implementation work.

**Approved MVP direction** (see `projectplan.md` §7-9): a small Next.js form → API route that server-renders a fixed HTML template (dynamic body content over the approved letterhead raster painted full-bleed) → headless Chromium (Playwright + a serverless-trimmed Chromium build) → PDF streamed back for download. Fully deterministic, no AI in the render path. Target host: Vercel free tier. Service/tool list is hardcoded from `tools.md` for v1; a DB/CMS is an explicit v2 upgrade, not part of the MVP.

Brand reference material (do not regenerate or approximate — treat as ground truth): `design.md` (color tokens, type scale, §5 letterhead spec), `tools.md` (the service catalog offered as checkboxes — **9 free + 8 paid = 17**; note `projectplan.md` and the Overview above still say "7 paid", a known stale off-by-one), `whaz.md` (company/audience context), `docs/header.png` + `docs/footer.png` (the exported letterhead bands), `docs/letterhead-skeleton.jpeg`, `docs/reference-letter-head.pdf` (**the approved finished proposal — see below, not a letterhead swatch**), `hld.txt` (ASCII high-level architecture diagram of the approved design).

## Current State & Tech Stack

- **The app is implemented and passing tests** (feature 001, T001–T060 of 63). `app/`, `components/`, `lib/`, `assets/fonts/`, `tests/` all exist. Remaining: T059 (production timing measurement), T061–T062 (quickstart validation + Vercel deploy).
- `.specify/memory/constitution.md` is at **v3.0.0** (ratified 2026-07-17, last amended 2026-07-26) — Architecture Principles (deterministic rendering, brand fidelity as ground truth, stateless-by-default, spec-driven increments, cost ceiling), Technology Constraints, Code Quality Standards, Security Requirements, and Workflow Rules are all binding; treat it as an authority, not a placeholder. **Principle II has now inverted twice**: v1.0.0 required pre-exported images → v2.0.0 required CSS/SVG (no vector source exists) → **v3.0.0 requires embedding the approved raster** (the reference PDF turned out to be the approved finished proposal, and its artwork extracts losslessly). Read its Sync Impact Report before touching chrome; the goal never changed, only the mechanism.
- **Node runtime required for PDF generation, never Edge** — `playwright-core` + `@sparticuz/chromium` don't run on Edge. **Zero env vars / secrets in v1.** (`plan.md` says Next 15 — 16 was used per explicit user instruction to take the latest; check `package.json` for exact current versions.)
- **Key commands**: `npm run dev` · `npm run dev:clean` · `npm run build` · `npm run test:unit` · `npm run test:integration` · `npm test` · `npm run check:table-fit`. First run also needs `npx playwright install chromium`.
- Dev-server blank-page symptoms and the `app/global-error.tsx` Turbopack workaround now live in `app/CLAUDE.md` (loads automatically when working under `app/`).
- ⚠️ **Integration tests run against a production build** (`npm run build && npm start`), because `next dev` proved unreliable under sustained PDF rendering. Consequence: **the suite does not cover dev-mode-only breakage** — the hydration bug above passed all 13 tests. When touching client components or app-router files, load the page in a real browser before declaring it working.
- **The letterhead is AI-generated — there is NO vector/editable source file.** This invalidates a long-standing project assumption (now corrected in `projectplan.md` §8/§9/§10). `docs/header.png` and `docs/footer.png` are ~127 DPI with the artwork floating mid-canvas on a padded 1054×1492 page (verified via alpha channel: header rows 607–883, footer rows 664–827). They cannot be re-exported and cannot be meaningfully upscaled. **They are visual reference only — never bundle them.**
- Chrome build technique, the chrome-repetition mechanism, font requirements, PDF determinism pinning, and the module map now live in `lib/CLAUDE.md` (loads automatically when working under `lib/`).
- ⚠️ **`docs/reference-letter-head.pdf` is the complete approved proposal, not a letterhead reference.** Its text layer (object `9 0 obj`) decodes to the whole document: centred "Executive Proposal", "Prepared for" block, intro paragraph, the three-column Mission Challenge / Whaz Solution / Expected Benefit table, "Why Whaz", "Next Step". It is the acceptance criterion for both layout and prose — measure against it, don't eyeball it.
- **The chrome ships as the approved raster** (2026-07-26): `reference-letter-head.pdf` embeds a single full-page 1054×1492 RGB image (object `3 0 obj`, ASCII85+Flate) carrying both bands *and* the `design.md` §5 body watermark. It is extracted losslessly to `assets/brand/letterhead.png` and painted full-bleed — this is the shipped artwork and supersedes both the CSS/SVG reconstruction and the "watermark deferred out of v1" note. `header.png`/`footer.png` contain the bands only (alpha bboxes rows 607–884 and 664–828) and remain reference-only.

## Directory Structure

- `projectplan.md`, `whaz.md`, `design.md`, `tools.md`, `problemstatement`, `hld.txt` — business/design/architecture reference docs at repo root
- `README.md` — **non-technical product overview** (audience: sales team and stakeholders); `docs/DEVELOPMENT.md` holds the engineering content that used to live there (setup, scripts, architecture, blank-page troubleshooting, chrome-repetition and fidelity gotchas, determinism, deploy). Keep dev notes out of the README.
- `WEB_DESIGN.md` — extracted design tokens for the **browser form UI only**, transcribed into `app/globals.css`'s `:root`. Unrelated to the PDF, which is measured from `docs/reference-letter-head.pdf`.
- `assets/brand/letterhead.png` — the **shipped** letterhead: the full-page 1054×1492 composite extracted losslessly from `docs/reference-letter-head.pdf`. Inlined as a data URI by `lib/brand.ts`. This is the only brand raster that is bundled.
- `assets/fonts/` — `Arimo-Regular/Bold.woff2` only (the shipped body font, metric-compatible with the reference's Helvetica). Static per-weight files, never variable fonts.
- `scripts/` — `preview-chrome.mjs` (screenshots the preview docs), `check-table-fit.mjs` (`npm run check:table-fit`; fails if catalog copy would wrap a table cell)
- `docs/` — letterhead brand assets, **reference only, never bundled** (`header.png`, `footer.png` — see the re-export caveat above; `header-crop.png` 1054×277 / `footer-crop.png` 1054×164 — the same artwork with the transparent padding trimmed to its alpha bbox, regenerable from the originals; `letterhead-skeleton.jpeg`, `reference-letter-head.pdf`, `dataflow.png`). `header300.png`/`footer300.png` are **not** higher resolution — identical 1054×1492 pixels with only the DPI metadata tag rewritten.
- `.specify/memory/constitution.md` — project principles (v3.0.0: Architecture Principles, Technology Constraints, Code Quality Standards, Security Requirements, Workflow Rules, Governance)
- `specs/<feature>/{spec,plan,tasks}.md` — created per-feature by `/sp.specify` → `/sp.plan` → `/sp.tasks`. First feature: `specs/001-proposal-pdf-generator/` — `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/generate-api.md`, `quickstart.md`, `checklists/requirements.md`, `tasks.md`. Implementation status: see Current State & Tech Stack above.
- `history/prompts/` — Prompt History Records: `constitution/`, `<feature-name>/`, or `general/` (pre-feature work, like this planning phase, lives in `general/`)
- `history/adr/` — Architecture Decision Records (created only via `/sp.adr`, on user consent). **ADR-0001 Letterhead Chrome Strategy** records why the chrome is the embedded approved raster, the four alternatives rejected (including the two that were actually built or attempted), and the accepted downsides — read it before proposing any change to how the letterhead is produced.
- `.specify/scripts/powershell/` — the only scripts implemented (Windows PowerShell); no `bash/` equivalents exist despite some command docs referencing `.sh` paths as a fallback pattern
- `.specify/templates/` — templates copied into place by the scripts above (spec, plan, tasks, checklist, ADR, PHR, agent-file)
- `.claude/commands/sp.*.md` — the SDD slash-command definitions (specify, plan, tasks, clarify, analyze, checklist, adr, implement, phr, constitution, reverse-engineer, taskstoissues, git.commit_pr)
- `lib/CLAUDE.md`, `app/CLAUDE.md` — subdirectory-scoped implementation gotchas (chrome rendering, fonts, PDF determinism, dev-server/Turbopack quirks), loaded only when working under those directories

## Key Commands

App build/test commands are in `package.json` (see also Current State & Tech Stack above for the non-standard ones). The SpecKit Plus workflow commands (`/sp.specify`, `/sp.plan`, `/sp.tasks`, `/sp.implement`, `/sp.clarify`, `/sp.analyze`, `/sp.checklist`, `/sp.adr`, `/sp.phr`, `/sp.git.commit_pr`, `/sp.constitution`) are documented in their own `.claude/commands/sp.*.md` files and as skills.

Feature branches must be named `NNN-short-name` (enforced by `Test-FeatureBranch` in `common.ps1`); the PowerShell scripts fall back gracefully (with a warning) when run outside a Git repo or off a numbered feature branch.

## Important Notes

- **PHR script gap:** `.claude/commands/sp.phr.md` and `.specify/scripts/powershell/*` both assume a `.specify/scripts/bash/create-phr.sh` exists for PHR creation — it does not exist in this repo (PowerShell-only). Until it's added, PHRs must be hand-authored against `.specify/templates/phr-template.prompt.md`, matching its ID numbering and YAML frontmatter exactly.
- **Constitution is ratified policy (v3.0.0)** — cite `.specify/memory/constitution.md` as the authority on architecture, tech constraints, code quality, security, and workflow; `/sp.analyze` treats any conflict with it as automatically CRITICAL. When new information falsifies a premise a principle rests on, **amend it via `/sp.constitution`** — never silently reinterpret it (this is itself a Workflow Rule, added after Principle II had to be corrected).
- **Brand fidelity is a hard requirement, not a nice-to-have.** As of 2026-07-26 it is achieved by **embedding the approved letterhead raster** (`assets/brand/letterhead.png`), not by reconstructing it in CSS/SVG: the salesperson rejected the CSS-built output, and the client-approved artifact *is* that ~127 DPI raster. Fidelity is verified **numerically, not visually** — render a proposal and compare text baselines against `docs/reference-letter-head.pdf` (checklist in `specs/001-proposal-pdf-generator/quickstart.md`); constitution v3.0.0 sets the bar at 0.5mm and the fixed elements currently agree to ≤0.11mm. A visual look is an extra check, never the basis of a fidelity claim — visual review passed a 5.1mm error during implementation. This inverted Principle II a second time and is **ratified in constitution v3.0.0** (2026-07-26); the code is no longer ahead of the constitution.
- **No secrets/env infrastructure exists yet** — when implementation starts, hosting/API keys (if any) must go through `.env` per the Default Policies above, not be hardcoded.

## Keeping this file current

Whenever a spec, feature, plan, tasks file, the constitution, or another architecturally-defining artifact is added or changed, update this file in the same turn — don't let it drift into describing a stage the project has already moved past. Concretely, re-check the Project Overview, Current State & Tech Stack, Directory Structure, and Key Commands sections whenever: `/sp.specify` creates a new `specs/<feature>/` directory, `/sp.plan`/`/sp.tasks` moves a feature from planned to scoped, `/sp.constitution` populates the constitution template, real application code lands (invalidating the "greenfield, no package.json" note above), or new scripts/tooling are added (e.g. once a `create-phr.sh` exists, remove the "PHR script gap" note above).

## Code Standards
See `.specify/memory/constitution.md` (v3.0.0, ratified 2026-07-17, last amended 2026-07-26) for code quality, testing, performance, security, and architecture principles — binding, not a template.
