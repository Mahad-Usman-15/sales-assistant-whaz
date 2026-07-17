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

**Approved MVP direction** (see `projectplan.md` §7-9): a small Next.js form → API route that server-renders a fixed HTML template (dynamic body content layered over two pre-exported letterhead header/footer PNGs) → headless Chromium (Playwright + a serverless-trimmed Chromium build) → PDF streamed back for download. Fully deterministic, no AI in the render path. Target host: Vercel free tier. Service/tool list is hardcoded from `tools.md` for v1; a DB/CMS is an explicit v2 upgrade, not part of the MVP.

Brand reference material (do not regenerate or approximate — treat as ground truth): `design.md` (color tokens, type scale), `tools.md` (the 9 free + 7 paid services to offer as checkboxes), `whaz.md` (company/audience context), `docs/letterhead-skeleton.jpeg` and `docs/reference-letter-head.pdf` (the actual letterhead chrome — diagonal-cut header/footer bands, watermark, dot-grid texture), `hld.txt` (ASCII high-level architecture diagram of the approved design).

## Current State & Tech Stack

- No `package.json`, source directory, or app framework exists yet — greenfield.
- `.specify/memory/constitution.md` is ratified as v1.0.0 (2026-07-17) — Architecture Principles (deterministic rendering, brand fidelity as ground truth, stateless-by-default, spec-driven increments, cost ceiling), Technology Constraints, Code Quality Standards, Security Requirements, and Workflow Rules are all binding; treat it as an authority, not a placeholder.
- Planned stack per `projectplan.md`: Next.js (form + API route), Playwright + `@sparticuz/chromium` (or equivalent serverless-trimmed Chromium) for HTML→PDF, self-hosted Montserrat/Inter `.woff2` fonts, Vercel serverless hosting. Nothing here is scaffolded yet — verify against the repo, not this note, before assuming a file exists.

## Directory Structure

- `projectplan.md`, `whaz.md`, `design.md`, `tools.md`, `problemstatement`, `hld.txt` — business/design/architecture reference docs at repo root
- `docs/` — letterhead brand assets (`letterhead-skeleton.jpeg`, `reference-letter-head.pdf`)
- `.specify/memory/constitution.md` — project principles (ratified v1.0.0: Architecture Principles, Technology Constraints, Code Quality Standards, Security Requirements, Workflow Rules, Governance)
- `specs/<feature>/{spec,plan,tasks}.md` — created per-feature by `/sp.specify` → `/sp.plan` → `/sp.tasks` (none exist yet; no feature has been started)
- `history/prompts/` — Prompt History Records: `constitution/`, `<feature-name>/`, or `general/` (pre-feature work, like this planning phase, lives in `general/`)
- `history/adr/` — Architecture Decision Records (created only via `/sp.adr`, on user consent)
- `.specify/scripts/powershell/` — the only scripts implemented (Windows PowerShell); no `bash/` equivalents exist despite some command docs referencing `.sh` paths as a fallback pattern
- `.specify/templates/` — templates copied into place by the scripts above (spec, plan, tasks, checklist, ADR, PHR, agent-file)
- `.claude/commands/sp.*.md` — the SDD slash-command definitions (specify, plan, tasks, clarify, analyze, checklist, adr, implement, phr, constitution, reverse-engineer, taskstoissues, git.commit_pr)

## Key Commands

This is a planning-stage repo — there is no build/lint/test suite yet. The commands that exist today are the SpecKit Plus workflow itself, run as Claude Code slash commands (which internally call the PowerShell scripts below):

| Slash command | Underlying script | Purpose |
|---|---|---|
| `/sp.constitution` | — | Populate `.specify/memory/constitution.md` |
| `/sp.specify <description>` | `create-new-feature.ps1` | Create `specs/<NNN-name>/spec.md`, a matching git branch, and `history/prompts/<NNN-name>/` |
| `/sp.plan` | `setup-plan.ps1` | Copy `plan-template.md` into the current feature dir and drive the planning workflow |
| `/sp.tasks` | `check-prerequisites.ps1` | Generate `tasks.md` (requires `plan.md` to exist first) |
| `/sp.implement` | `check-prerequisites.ps1 -RequireTasks` | Execute `tasks.md` (requires `plan.md` + `tasks.md`) |
| `/sp.clarify`, `/sp.analyze`, `/sp.checklist` | — | Feature-spec quality passes |
| `/sp.adr <title>` | — | Create an ADR (only on explicit user consent, never automatic) |
| `/sp.phr` | (no `create-phr.sh` present) | Record a Prompt History Record — falls back to manual authoring per `.claude/commands/sp.phr.md` step 3b when the script is missing |
| `/sp.git.commit_pr` | — | Commit + open a PR |

Feature branches must be named `NNN-short-name` (enforced by `Test-FeatureBranch` in `common.ps1`); the PowerShell scripts fall back gracefully (with a warning) when run outside a Git repo or off a numbered feature branch.

## Important Notes

- **PHR script gap:** `.claude/commands/sp.phr.md` and `.specify/scripts/powershell/*` both assume a `.specify/scripts/bash/create-phr.sh` exists for PHR creation — it does not exist in this repo (PowerShell-only). Until it's added, PHRs must be hand-authored against `.specify/templates/phr-template.prompt.md`, matching its ID numbering and YAML frontmatter exactly.
- **Constitution is ratified policy (v1.0.0)** — cite `.specify/memory/constitution.md` as the authority on architecture, tech constraints, code quality, security, and workflow; `/sp.analyze` treats any conflict with it as automatically CRITICAL.
- **Brand fidelity is a hard requirement, not a nice-to-have** — the letterhead chrome (diagonal cuts, watermark, dot-grid) is intentionally planned as pre-exported image assets rather than hand-built CSS/SVG (see `projectplan.md` §9); don't propose recreating it in code without revisiting that decision explicitly.
- **No secrets/env infrastructure exists yet** — when implementation starts, hosting/API keys (if any) must go through `.env` per the Default Policies above, not be hardcoded.

## Keeping this file current

Whenever a spec, feature, plan, tasks file, the constitution, or another architecturally-defining artifact is added or changed, update this file in the same turn — don't let it drift into describing a stage the project has already moved past. Concretely, re-check the Project Overview, Current State & Tech Stack, Directory Structure, and Key Commands sections whenever: `/sp.specify` creates a new `specs/<feature>/` directory, `/sp.plan`/`/sp.tasks` moves a feature from planned to scoped, `/sp.constitution` populates the constitution template, real application code lands (invalidating the "greenfield, no package.json" note above), or new scripts/tooling are added (e.g. once a `create-phr.sh` exists, remove the "PHR script gap" note above).

## Code Standards
See `.specify/memory/constitution.md` (v1.0.0, ratified 2026-07-17) for code quality, testing, performance, security, and architecture principles — binding, not a template.
