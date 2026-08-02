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

This repo is the **Whaz Proposal Letterhead Generator** — an internal tool for Whaz's sales team so they stop hand-prompting ChatGPT/Gemini (70% failure rate) to produce branded client proposals. **The MVP is built and passing tests**; work has moved on to feature `002-rbac-dashboard` (roles, sign-in, usage counts).

⚠️ **`projectplan.md` and `problemstatement` are HISTORICAL RECORDS, not the source of truth.** They record how the v1 MVP was decided in 2026-07 and are kept for provenance only. **Do not read current scope out of them, and do not measure new features against them** — several of their statements are now false (notably "no login, no database, no stored history in v1," which constitution v4.0.0 deliberately overrides). Both files carry a banner saying so. Authority for new work:

| Question | Authoritative source |
|---|---|
| What is binding on any change | `.specify/memory/constitution.md` (v4.0.1) |
| What a feature must do | `specs/<feature>/spec.md` |
| How a PDF is produced | `docs/ARCHITECTURE.md` |
| The service catalogue | `tools.md` |
| Brand / letterhead | `design.md`, `docs/reference-letter-head.pdf` |

**What the app does** (shipped; see `docs/ARCHITECTURE.md`): a Next.js form → API route that server-renders a fixed HTML template (dynamic body content over the approved letterhead raster painted full-bleed) → headless Chromium (Playwright + a serverless-trimmed Chromium build) → PDF streamed back for download. Fully deterministic, no AI in the render path. Host: Vercel free tier. The service/tool list is a hardcoded constant sourced from `tools.md`; moving it to a DB/CMS remains a separate, deliberate decision (Constitution Technology Constraints) — **not** something feature 002 pulls in as a side effect of adding a database.

Brand reference material (do not regenerate or approximate — treat as ground truth): `design.md` (color tokens, type scale, §5 letterhead spec), `tools.md` (the service catalog offered as checkboxes — **9 free + 8 paid = 17**; `tools.md` is authoritative, and the "7 paid" figure in the historical `projectplan.md` is simply wrong), `whaz.md` (company/audience context), `docs/header.png` + `docs/footer.png` (the exported letterhead bands), `docs/letterhead-skeleton.jpeg`, `docs/reference-letter-head.pdf` (**the approved finished proposal — see below, not a letterhead swatch**). ⚠️ `hld.txt` (previously cited here as the ASCII architecture diagram) **does not exist in the repo** — `docs/ARCHITECTURE.md` is the architecture/data-flow reference.

## Current State & Tech Stack

- **The app is implemented and passing tests** (feature 001, T001–T060 of 63). `app/`, `components/`, `lib/`, `assets/fonts/`, `tests/` all exist. Remaining: T059 (production timing measurement), T061–T062 (quickstart validation + Vercel deploy).
- `.specify/memory/constitution.md` is at **v4.0.1** (ratified 2026-07-17, last amended 2026-08-01) — six Architecture Principles (deterministic rendering, brand fidelity as ground truth, **additive extension**, spec-driven increments, cost ceiling, **server-enforced authorization**), Technology Constraints, Code Quality Standards, Security Requirements, and Workflow Rules are all binding; treat it as an authority, not a placeholder. Two principles have been redefined as facts arrived — read the Sync Impact Report before touching either area:
  - **Principle II inverted twice**: v1.0.0 required pre-exported images → v2.0.0 required CSS/SVG (no vector source exists) → **v3.0.0 requires embedding the approved raster** (the reference PDF turned out to be the approved finished proposal, and its artwork extracts losslessly). Unchanged in v4.0.0.
  - **Principle III was redefined in v4.0.0**: "stateless-by-default, no required database/auth/storage" → **"additive extension — identity wraps the render path, it does not rewrite it."** The RBAC dashboard requirement (`dashboard.txt`) makes auth and persistence mandatory. The *goal* is unchanged: the renderer still touches no database or network during a render; checks happen before it, writes after it, and a failed metric write never voids a delivered PDF. **"No database in v1" is withdrawn.**
- **Node runtime required everywhere, never Edge** — `playwright-core` + `@sparticuz/chromium` don't run on Edge, and (once auth lands) neither does the DB driver. (`plan.md` says Next 15 — 16 was used per explicit user instruction to take the latest; check `package.json` for exact current versions.)
- **Key commands**: `npm run dev` · `npm run dev:clean` · `npm run build` · `npm run test:unit` · `npm run test:integration` · `npm test` · `npm run check:table-fit`. First run also needs `npx playwright install chromium`.
- Dev-server blank-page symptoms and the `app/global-error.tsx` Turbopack workaround now live in `app/CLAUDE.md` (loads automatically when working under `app/`).
- ⚠️ **Integration tests run against a production build** (`npm run build && npm start`), because `next dev` proved unreliable under sustained PDF rendering. Consequence: **the suite does not cover dev-mode-only breakage** — the hydration bug above passed all 13 tests. When touching client components or app-router files, load the page in a real browser before declaring it working.
- **The letterhead is AI-generated — there is NO vector/editable source file.** This falsified a long-standing project assumption (the historical `projectplan.md` §8/§9/§10 still assumes an editable source; it is not maintained and is not authoritative). `docs/header.png` and `docs/footer.png` are ~127 DPI with the artwork floating mid-canvas on a padded 1054×1492 page (verified via alpha channel: header rows 607–883, footer rows 664–827). They cannot be re-exported and cannot be meaningfully upscaled. **They are visual reference only — never bundle them.**
- Chrome build technique, the chrome-repetition mechanism, font requirements, PDF determinism pinning, and the module map now live in `lib/CLAUDE.md` (loads automatically when working under `lib/`).
- ⚠️ **`docs/reference-letter-head.pdf` is the complete approved proposal, not a letterhead reference.** Its text layer (object `9 0 obj`) decodes to the whole document: centred "Executive Proposal", "Prepared for" block, intro paragraph, the three-column Mission Challenge / Whaz Solution / Expected Benefit table, "Why Whaz", "Next Step". It is the acceptance criterion for both layout and prose — measure against it, don't eyeball it.
- **The chrome ships as the approved raster** (2026-07-26): `reference-letter-head.pdf` embeds a single full-page 1054×1492 RGB image (object `3 0 obj`, ASCII85+Flate) carrying both bands *and* the `design.md` §5 body watermark. It is extracted losslessly to `assets/brand/letterhead.png` and painted full-bleed — this is the shipped artwork and supersedes both the CSS/SVG reconstruction and the "watermark deferred out of v1" note. `header.png`/`footer.png` contain the bands only (alpha bboxes rows 607–884 and 664–828) and remain reference-only.

## Directory Structure

- `whaz.md`, `design.md`, `tools.md` — live reference docs at repo root (company/audience context; brand tokens and letterhead spec; the service catalogue). `hld.txt` is referenced by older docs but is absent.
- `projectplan.md`, `problemstatement` — ⚠️ **historical records of the 2026-07 MVP decision, superseded and banner-marked. Not source of truth; do not derive current scope from them.** `problemstatement` is the original planning *prompt* that produced `projectplan.md`.
- `docs/ARCHITECTURE.md` — **the architecture and data-flow reference**: 11 Mermaid diagrams covering the end-to-end request flow, what Chromium's role is and why, HTML assembly, the two-mechanism letterhead repetition, determinism, and error paths. Start here to understand how a PDF is produced.
- `README.md` — **non-technical product overview** (audience: sales team and stakeholders); `docs/DEVELOPMENT.md` holds the engineering content that used to live there (setup, scripts, architecture, blank-page troubleshooting, chrome-repetition and fidelity gotchas, determinism, deploy). Keep dev notes out of the README.
- `WEB_DESIGN.md` — extracted design tokens for the **browser form UI only**, transcribed into `app/globals.css`'s `:root`. Unrelated to the PDF, which is measured from `docs/reference-letter-head.pdf`.
- `assets/brand/letterhead.png` — the **shipped** letterhead: the full-page 1054×1492 composite extracted losslessly from `docs/reference-letter-head.pdf`. Inlined as a data URI by `lib/brand.ts`. This is the only brand raster that is bundled.
- `assets/fonts/` — `Arimo-Regular/Bold.woff2` only (the shipped body font, metric-compatible with the reference's Helvetica). Static per-weight files, never variable fonts.
- `scripts/` — `preview-chrome.mjs` (screenshots the preview docs), `check-table-fit.mjs` (`npm run check:table-fit`; fails if catalog copy would wrap a table cell)
- `docs/` — letterhead brand assets, **reference only, never bundled** (`header.png`, `footer.png` — see the re-export caveat above; `header-crop.png` 1054×277 / `footer-crop.png` 1054×164 — the same artwork with the transparent padding trimmed to its alpha bbox, regenerable from the originals; `letterhead-skeleton.jpeg`, `reference-letter-head.pdf`, `dataflow.png`). `header300.png`/`footer300.png` are **not** higher resolution — identical 1054×1492 pixels with only the DPI metadata tag rewritten.
- `.specify/memory/constitution.md` — project principles (v4.0.1: Architecture Principles, Technology Constraints, Code Quality Standards, Security Requirements, Workflow Rules, Governance)
- `specs/<feature>/{spec,plan,tasks}.md` — created per-feature by `/sp.specify` → `/sp.plan` → `/sp.tasks`.
  - `specs/001-proposal-pdf-generator/` — `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/generate-api.md`, `quickstart.md`, `checklists/requirements.md`, `tasks.md`. Implementation status: see Current State & Tech Stack above.
  - `specs/002-rbac-dashboard/` — `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/auth-and-admin.md`, `quickstart.md`, `tasks.md`, `checklists/requirements.md` (2026-08-01, **scoped — 103 tasks, T001–T103, none started; no code yet**). ⚠️ **T001–T005 gate the whole feature** (the `/tmp` sustained-generation fix); **T011–T014 are Supabase dashboard configuration, not code** — they produce no diff and are the steps most likely to be skipped. Sign-in gating the whole app, two roles (Admin/Sales), invitation-only access, reversible removal, the at-least-one-active-Admin guarantee, and per-member / org-wide generation counts. 45 FRs, 14 SCs, 14 assumptions, 5 clarifications. Source: `dashboard.txt`. Constitution Check **PASS against v4.0.1**. Three findings worth knowing before touching this: **FR-042 (sign-in throttling) is satisfied by Supabase config, not code** (`otp.period` per address + `otp.requests_per_hour`); **FR-041's 30-day session had to move into application code** because Supabase's session controls are Pro-only and buying them breaches Principle V; and **FR-043 forces `shouldCreateUser: true`** — the intuitive `false` makes the provider error on unknown addresses, turning the sign-in form into a staff enumerator. ⚠️ Audience note: `whaz.md`'s "Target Audience" describes Whaz's *clients* and is **not** this tool's users — internal-only, two roles, no client-facing surface.
- `history/prompts/` — Prompt History Records: `constitution/`, `<feature-name>/`, or `general/` (pre-feature work, like this planning phase, lives in `general/`)
- `history/adr/` — Architecture Decision Records (created only via `/sp.adr`, on user consent). ⚠️ No `create-adr` script exists in `.specify/scripts/powershell/` — ADRs are hand-authored against `.specify/templates/adr-template.md` (same gap as the PHR script).
  - **ADR-0001 Letterhead Chrome Strategy** — why the PDF chrome is the embedded approved raster, the four rejected alternatives (two of which were actually built), and the accepted downsides. Read before proposing any change to how the letterhead is produced.
  - **ADR-0002 Identity and Authorization Architecture** — Supabase Auth + Prisma/Postgres + a TypeScript guard with branded actor types + RLS as a deny-all backstop. Nine alternatives rejected, including JWT role claims, `user_metadata`, RLS-as-authorization, and buying Supabase Pro.
  - **ADR-0003 Last-Admin Invariant and Concurrency Control** — ⚠️ **read before touching any admin mutation.** Why `count() > 1` is wrong (write skew under READ COMMITTED), why `SELECT … FOR UPDATE` doesn't help, and why it must be `pg_advisory_xact_lock` and never the session-scoped `pg_advisory_lock`. The naive version passes every single-threaded test.
  - **ADR-0004 Dashboard UI Stack and Design-System Coexistence** — Tailwind v4 with Preflight omitted + `source(none)`, a non-inline `@theme` bridge to `globals.css`, and vendored Tremor Raw. Six alternatives rejected. Explains why `app/globals.css` is never touched and cannot be restyled by accident.
- `.specify/scripts/powershell/` — the only scripts implemented (Windows PowerShell); no `bash/` equivalents exist despite some command docs referencing `.sh` paths as a fallback pattern
- `.specify/templates/` — templates copied into place by the scripts above (spec, plan, tasks, checklist, ADR, PHR, agent-file)
- `.claude/commands/sp.*.md` — the SDD slash-command definitions (specify, plan, tasks, clarify, analyze, checklist, adr, implement, phr, constitution, reverse-engineer, taskstoissues, git.commit_pr)
- `lib/CLAUDE.md`, `app/CLAUDE.md` — subdirectory-scoped implementation gotchas (chrome rendering, fonts, PDF determinism, dev-server/Turbopack quirks), loaded only when working under those directories

## Key Commands

App build/test commands are in `package.json` (see also Current State & Tech Stack above for the non-standard ones). The SpecKit Plus workflow commands (`/sp.specify`, `/sp.plan`, `/sp.tasks`, `/sp.implement`, `/sp.clarify`, `/sp.analyze`, `/sp.checklist`, `/sp.adr`, `/sp.phr`, `/sp.git.commit_pr`, `/sp.constitution`) are documented in their own `.claude/commands/sp.*.md` files and as skills.

Feature branches must be named `NNN-short-name` (enforced by `Test-FeatureBranch` in `common.ps1`); the PowerShell scripts fall back gracefully (with a warning) when run outside a Git repo or off a numbered feature branch.

## Important Notes

- **PHR script gap:** `.claude/commands/sp.phr.md` and `.specify/scripts/powershell/*` both assume a `.specify/scripts/bash/create-phr.sh` exists for PHR creation — it does not exist in this repo (PowerShell-only). Until it's added, PHRs must be hand-authored against `.specify/templates/phr-template.prompt.md`, matching its ID numbering and YAML frontmatter exactly.
- **The `.specify/` PowerShell scripts run under Windows PowerShell 5.1, not PowerShell 7.** `Join-Path` there takes exactly two paths; the 3-argument form binds the third as a positional parameter and throws. This broke `create-new-feature.ps1` partway through (branch and `specs/` created, `history/prompts/<branch>/` not) and is fixed at its one call site. Check for the same pattern before trusting any other script in that directory.
- **`update-agent-context.ps1` is a no-op against this file.** It reports "Updated existing Claude Code context file" but writes nothing, because it looks for generated marker sections (`## Active Technologies`, `## Recent Changes`) that this hand-written `CLAUDE.md` does not have. Its parsing is also line-based and truncates mid-sentence. **Update `CLAUDE.md` by hand after `/sp.plan`** — do not trust the script's success message.
- **Constitution is ratified policy (v4.0.1)** — cite `.specify/memory/constitution.md` as the authority on architecture, tech constraints, code quality, security, and workflow; `/sp.analyze` treats any conflict with it as automatically CRITICAL. When new information falsifies a premise a principle rests on, **amend it via `/sp.constitution`** — never silently reinterpret it (this is itself a Workflow Rule, added after Principle II had to be corrected).
- **Authorization rules are constitutional, not implementation preference (Principle VI, new in v4.0.0).** Binding, and each closes a specific silent-failure mode: role and active/inactive status are re-read from the app's own user table on *every* protected request (a token claim is UX only — revocation that waits for token expiry is not revocation); a role is **never** sourced from auth-provider user metadata, which the subject can write (that is full privilege escalation) — a server-owned invitation record is the only trusted carrier; route middleware is a redirect convenience, never a security boundary, and every protected surface re-checks; **Server Actions are public HTTP endpoints** and each begins with its own check; data-access functions take the authorized actor as a typed first parameter so a missing check fails the build; cross-row invariants (**"at least one active Admin"**) are enforced under an explicit lock or a serializable transaction and tested with two concurrent connections — a `count() > 1` read-then-write permits write skew and passes every single-threaded test; RLS is enabled default-deny but is a blast-radius limiter for key leakage, **not** the authorization model (a privileged ORM connection bypasses it).
- **Brand fidelity is a hard requirement, not a nice-to-have.** As of 2026-07-26 it is achieved by **embedding the approved letterhead raster** (`assets/brand/letterhead.png`), not by reconstructing it in CSS/SVG: the salesperson rejected the CSS-built output, and the client-approved artifact *is* that ~127 DPI raster. Fidelity is verified **numerically, not visually** — render a proposal and compare text baselines against `docs/reference-letter-head.pdf` (checklist in `specs/001-proposal-pdf-generator/quickstart.md`); constitution Principle II sets the bar at 0.5mm and the fixed elements currently agree to ≤0.11mm. A visual look is an extra check, never the basis of a fidelity claim — visual review passed a 5.1mm error during implementation. This inverted Principle II a second time and is **ratified in constitution v3.0.0** (2026-07-26); the code is no longer ahead of the constitution.
- **No secrets/env infrastructure exists yet** — the shipped app still needs zero env vars. Constitution v4.0.0 authorizes Supabase Auth + Postgres, so the first keys land with the RBAC work: they go through `.env` (untracked) with `.env.example` documenting them, never hardcoded, and a privileged service key is confined to one server-only module and **never** carries a `NEXT_PUBLIC_` prefix.

## Keeping this file current

Whenever a spec, feature, plan, tasks file, the constitution, or another architecturally-defining artifact is added or changed, update this file in the same turn — don't let it drift into describing a stage the project has already moved past. Concretely, re-check the Project Overview, Current State & Tech Stack, Directory Structure, and Key Commands sections whenever: `/sp.specify` creates a new `specs/<feature>/` directory, `/sp.plan`/`/sp.tasks` moves a feature from planned to scoped, `/sp.constitution` populates the constitution template, real application code lands (invalidating the "greenfield, no package.json" note above), or new scripts/tooling are added (e.g. once a `create-phr.sh` exists, remove the "PHR script gap" note above).

## Code Standards
See `.specify/memory/constitution.md` (v4.0.1, ratified 2026-07-17, last amended 2026-08-01) for code quality, testing, performance, security, and architecture principles — binding, not a template.
