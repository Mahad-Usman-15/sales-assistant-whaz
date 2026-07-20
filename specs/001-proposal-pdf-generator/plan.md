# Implementation Plan: Proposal Letterhead PDF Generator (MVP)

**Branch**: `001-proposal-pdf-generator` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-proposal-pdf-generator/spec.md`

## Summary

A rep fills one form (recipient, client company, proposal title, prepared-by, date, optional service selection, optional notes) and clicks Generate; the server assembles a fixed HTML letter, prints it to PDF with headless Chromium, and streams the file back for download. No AI, no database, no auth.

Technical approach: a single Next.js (App Router, TypeScript) application on Vercel. The form is a client component; `POST /api/generate` is a Node-runtime route handler that validates input with Zod, HTML-escapes every rep-supplied string, interpolates it into a server-built HTML string, and renders via `playwright-core` driving `@sparticuz/chromium`. The letterhead chrome is **built in HTML/CSS/SVG** (gradient bands, `clip-path` diagonal cuts, `radial-gradient` dot grid, Montserrat Black wordmark, inline SVG icons) as `position: fixed` header/footer elements, so Chromium repeats them on every printed page and they stay sharp at any resolution. Fonts are inlined as base64 data URIs so the render step performs **zero network fetches**. Output is a `%PDF` byte stream returned with `Content-Disposition: attachment`.

This approach is sanctioned by constitution **v2.0.0**, which amended Principle II on 2026-07-19 after its premises (hand-designed art, canonical design file) were found false. See research R1 and the Constitution Check below.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 (Vercel's Node runtime; **not** the Edge runtime — Chromium needs full Node)
**Primary Dependencies**: Next.js 15 (App Router), React 19, `playwright-core`, `@sparticuz/chromium`, `zod`. Dev-only: `playwright` (full package, for a local Chromium), `vitest`, `@playwright/test`
**Storage**: N/A — stateless per request; nothing is persisted (Constitution III)
**Testing**: Vitest for unit (escaping, schema, catalog, HTML assembly); `@playwright/test` for integration (form → download → PDF byte/structure assertions)
**Target Platform**: Vercel serverless (Hobby/Free tier), Node.js runtime, `maxDuration` raised for cold starts
**Project Type**: Web application (single Next.js app — frontend + API route colocated)
**Performance Goals**: PDF ready ≤30 s worst case including cold start (FR-016, SC-008); warm requests expected ~2–4 s
**Constraints**: $0 recurring cost (Constitution V); zero network fetches during render (Constitution Security); no AI in render path (Constitution I); Vercel Hobby function bundle ≤250 MB unzipped
**Scale/Scope**: ~10–50 proposals/day, single team, one letterhead template, 17-item service catalog, ~5 form fields

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial evaluation (pre-Phase 0): PASS** — re-verified post-Phase 1 design: **PASS** against constitution **v2.0.0**.

*History: the post-design re-check initially returned CONDITIONAL PASS, blocked on Principle II, which as ratified in v1.0.0 forbade CSS-built chrome. That principle was amended to v2.0.0 on 2026-07-19 after its premises were found false (no vector source exists). The block is cleared; no exception was granted and none is outstanding.*

| Principle | Verdict | How this plan satisfies it |
|---|---|---|
| **I. Deterministic Rendering — Zero AI in Render Path** | ✅ PASS | No model is invoked anywhere. Every PDF byte derives from rep input, the hardcoded catalog, or the fixed template. Same input → identical output (FR-007); no randomness, no timestamps beyond the rep-supplied date. CSS-built chrome strengthens this — it removes the last non-reproducible artifact from the pipeline. |
| **II. Brand Fidelity Is Ground Truth** | ✅ PASS | Under **v2.0.0** the chrome is built in HTML/CSS/SVG and reference rasters are never bundled — exactly what this plan does (research R1). The plan also satisfies the principle's binding consequences: chrome text renders as real selectable text, output is resolution-independent, the bespoke watermark is deferred rather than hand-approximated, and the mandatory side-by-side fidelity comparison is specified in `quickstart.md` and carried into `/sp.tasks`. |
| **III. Stateless-by-Default** | ✅ PASS | No DB, no auth, no session, no file writes. Request in → PDF out. Future history/AI-drafting can layer additively around `POST /api/generate` without touching it. |
| **IV. Small, Spec-Driven Increments** | ✅ PASS | Work is scoped to this spec's FR-001…FR-016 only. User stories P1/P2/P3 map to independently shippable slices; no speculative abstractions (no template engine, no plugin layer, no catalog CMS). |
| **V. Cost Ceiling** | ✅ PASS | Vercel Hobby ($0) at 10–50/day. No database, no third-party API, no paid service. `@sparticuz/chromium` chosen specifically to stay inside Hobby's bundle limit. |

**Technology Constraints compliance**: Vercel Hobby ✅ · `playwright-core` + `@sparticuz/chromium` (explicitly **not** full bundled Puppeteer) ✅ · Montserrat/Inter self-hosted `.woff2`, awaited via `document.fonts.ready` ✅ · no DB; catalog hardcoded from `tools.md` ✅ · PowerShell-only scripting, no new Bash path ✅

**Security Requirements compliance**: No secrets required at all in v1 — the MVP needs zero env vars, so nothing to leak ✅ · all rep input escaped server-side before HTML interpolation (FR-008) ✅ · render step fetches no remote content — fonts and images inlined as data URIs ✅

**Post-Design Re-check (after Phase 1)**: No violations. The design adds no storage, no external calls, and no credentials. The single prior deviation (CSS-built chrome) was resolved by amending Principle II rather than by granting an exception, so **Complexity Tracking is empty**.

## Project Structure

### Documentation (this feature)

```text
specs/001-proposal-pdf-generator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── generate-api.md  # POST /api/generate contract
├── checklists/
│   └── requirements.md  # From /sp.specify (passing)
└── tasks.md             # Phase 2 — created by /sp.tasks, NOT by this command
```

### Source Code (repository root)

```text
app/
├── layout.tsx                  # Root layout, font registration
├── page.tsx                    # Proposal form page (server shell)
├── globals.css
└── api/
    └── generate/
        └── route.ts            # POST → PDF (Node runtime, maxDuration set)

components/
├── ProposalForm.tsx            # Client component: fields, submit, loading state
├── ServicePicker.tsx           # Free/paid catalog checkboxes
└── FieldError.tsx              # Inline validation messaging (FR-009)

lib/
├── catalog.ts                  # SERVICE_CATALOG — hardcoded from tools.md (FR-013)
├── schema.ts                   # Zod schema; single source of validation truth
├── escape.ts                   # escapeHtml — the FR-008 boundary
├── template.ts                 # buildProposalHtml(data) → full HTML string
├── chrome.ts                   # Letterhead header/footer markup + CSS (research R1)
├── fonts.ts                    # Loads .woff2 as base64 data URIs (cached, module-scope)
└── pdf.ts                      # launchBrowser() + renderPdf(html)

public/
└── (static app assets only — fonts are bundled for the server, see fonts.ts)

assets/
└── fonts/
    ├── Montserrat-Black.woff2  # wordmark depends on weight 900
    ├── Inter-Regular.woff2
    └── Inter-SemiBold.woff2

tests/
├── unit/
│   ├── escape.test.ts          # injection / literal-text cases (FR-008)
│   ├── schema.test.ts          # required-field + edge validation (FR-009)
│   ├── catalog.test.ts         # catalog matches tools.md verbatim (FR-002)
│   └── template.test.ts        # section presence/omission (FR-014), no-pricing (FR-015)
└── integration/
    ├── generate.spec.ts        # API: valid → %PDF; invalid → 400; determinism (FR-007)
    └── form.spec.ts            # UI: fill → download; blocked on missing field
```

**Structure Decision**: Single Next.js App Router project at the repository root (the "web application" option, collapsed to one deployable since the API route is colocated with the UI — no separate backend). Rendering logic lives in `lib/` as plain, framework-free modules so it is unit-testable without booting Next.js or Chromium; `app/api/generate/route.ts` stays a thin HTTP adapter over `lib/`. Fonts live in `assets/` (server-bundled, read at runtime and inlined) rather than `public/` deliberately — they must never be fetched over the network during render, per the constitution's Security Requirements.

The letterhead chrome is isolated in `lib/chrome.ts` rather than inlined into `template.ts`. It is the one part of the document with a visual-fidelity obligation against an external reference (`docs/header.png`, `docs/footer.png`, `docs/reference-letter-head.pdf`), so keeping it in a single named module makes that obligation reviewable and gives the watermark a clear later home.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations. The one prior entry — CSS-built chrome deviating from Principle II — was **retired on 2026-07-19** when Principle II was amended to v2.0.0 to match reality. The plan now complies with the constitution as written, with no outstanding exception. Reasoning and rejected alternatives are preserved in `research.md` R1 and the constitution's Sync Impact Report.*
