# Project Plan: Whaz Proposal Letterhead Generator (v1)

> ## ⚠️ HISTORICAL RECORD — NOT THE SOURCE OF TRUTH
>
> **Status as of 2026-08-01: superseded. Do not treat anything below as current scope.**
>
> This document records how the **v1 MVP** was decided in 2026-07 — the business problem, the three
> options that were compared, and why one was chosen. It was accurate when written and it is kept as
> the provenance record for those decisions. It is **not** a specification, and it does **not**
> govern new work.
>
> **Known to be out of date.** §8/§9/§10 state that v1 has "no login, no database, no stored
> history," that every request is stateless, and that a DB/CMS is a v2 trigger conditioned on MVP
> validation. Constitution **v4.0.0** (2026-08-01) redefined Principle III and now *requires*
> authentication and persistence; feature `002-rbac-dashboard` is building them. §8/§9 also carried a
> since-falsified assumption that an editable vector letterhead source exists, and the service-count
> figure here is a known off-by-one against `tools.md`.
>
> **Where authority actually lives now:**
>
> | Question | Authoritative source |
> |---|---|
> | What is binding on any change | `.specify/memory/constitution.md` (v4.0.1) |
> | What a feature must do | `specs/<feature>/spec.md` |
> | How a PDF is produced | `docs/ARCHITECTURE.md` |
> | The service catalogue | `tools.md` |
> | Brand and letterhead | `design.md`, `docs/reference-letter-head.pdf` |
>
> New features are specified against the constitution and their own spec. They are **not** measured
> against this document's MVP scope, and nothing here blocks or bounds them.

## 1. Problem & Root-Cause Analysis

**Symptom:** The Whaz sales team generates client proposal letterheads daily by manually prompting general-purpose AI chat tools (ChatGPT, Gemini). About **70% of generated proposals fail** — meaning the rep has to re-prompt, edit, or abandon the attempt. Failure modes include: hallucinated business claims/figures, inconsistent visual layout between runs, the AI returning raw code/markdown instead of a finished document, no reliable path to a downloadable PDF, and hitting free-tier usage limits mid-workflow. The team has limited prompt-engineering skill, so they cannot reliably work around these failures.

**Root-cause ladder** (each cause below is a consequence of the one after it):

1. Proposals come out visually inconsistent → because there is no enforced design system in the AI's output.
2. The AI's output format is unpredictable (prose, markdown, code, or a broken PDF link) → because general chat LLMs are non-deterministic generators, not document-rendering engines.
3. Reps must repeatedly hand-write long prompts describing the same business/brand context → because there is no reusable structured input mechanism (form, template, schema).
4. Failures multiply under time pressure and usage limits → because the workflow depends on a shared, rate-limited, general-purpose tool rather than a dedicated one.
5. The team can't compensate through better prompting → because prompt engineering is a specialized skill the sales team was never meant to need.

**Core root cause:** A non-deterministic, general-purpose generative tool (LLM chat) is being used to perform what is fundamentally a **deterministic document-assembly task** — take structured inputs (client name, services, benefits) and place them into a fixed, branded layout. The fix is not "write better prompts." The fix is to remove the LLM from the layout/formatting/rendering path entirely and replace open-ended generation with a structured form feeding a fixed, testable template.

## 2. Stakeholders

| Stakeholder | Interest |
|---|---|
| Sales team (primary users) | Fast, reliable, non-technical way to produce a branded proposal per prospect |
| Whaz leadership | Consistent brand presentation, higher proposal-to-close conversion, low tool cost |
| Prospective clients (recipients) | Judge Whaz's professionalism partly from the polish/consistency of the proposal they receive |
| Tool builder/maintainer | Needs a codebase simple enough to maintain and extend without ongoing operational burden |

## 3. Functional & Non-Functional Requirements

**Functional requirements:**
- A form for entering client/business details (name, contact info, date, sender/rep name).
- A way to select the services/tools being proposed, sourced from the existing catalog in `tools.md` (9 free tools, 7 paid tools).
- A free-text field for custom notes, benefits, or context specific to that client.
- One-click generation of a PDF that reproduces the Whaz brand letterhead (per `docs/letterhead-skeleton.jpeg` / `docs/reference-letter-head.pdf`) exactly, with the dynamic content inserted into the body.
- Instant PDF download after generation — no extra steps.

**Non-functional requirements:**
- **Fidelity:** every generated PDF must visually match the brand letterhead — same header/footer chrome, colors (`#111111`, `#0a0436`, `#FFFFFF`, `#FFD700`/`#F3C623`), and fonts (Montserrat/Inter) per `design.md` — every single time (deterministic, not "usually close").
- **Usability:** operable by non-technical sales staff with no prompting or technical knowledge required.
- **Cost:** $0 or near-$0 recurring infrastructure cost at the team's current volume (~10-50 proposals/day).
- **Performance:** PDF generation completes within a few seconds of clicking "Generate."
- **Correctness:** zero hallucinated content — every fact in the output was typed or selected by the rep, never invented by AI.

## 4. Solution Options

**Option A — Google Workspace Automation**
Google Form for input → Google Apps Script → merges data into a Google Docs template → exports natively to PDF. Zero custom hosting; runs entirely on Google's infrastructure.

**Option B — Custom Lightweight Web App** *(refines the user's original idea)*
A small form (client details + service checkboxes + notes) submits to a server-rendered HTML template matching the brand letterhead, which is converted to PDF server-side via a headless browser, then streamed back for download. Hosted on Vercel's free tier. No AI anywhere in the render path.

**Option C — No-Code Document-Automation SaaS**
A form tool (Tally/Typeform) feeds a third-party document-merge service (e.g., Docupilot, PDFMonkey, PandaDoc-style) that holds the branded template and produces the PDF.

*(A fourth, informal "baseline" — reps manually duplicating a Canva/Docs template per proposal with no AI at all — was considered but rejected as a formal option: it removes the AI-hallucination problem but keeps 100% of the manual repetitive-entry burden, so it doesn't actually solve the productivity half of the problem.)*

## 5. Evaluation Matrix

Scored 1–5 (5 = best) for this specific use case:

| Criterion | A: Google Workspace | B: Custom Web App | C: No-Code SaaS |
|---|---|---|---|
| Complexity (lower build effort = higher score) | 5 — no code, pure configuration | 3 — requires building/hosting a small app | 4 — mostly configuration, some integration glue |
| Usability (for this brand specifically) | 2 — Docs can't natively reproduce the diagonal-cut bands/watermark/dot-grid; would need an image-in-doc workaround that erodes the "easy to edit" benefit | 5 — form and output are purpose-built for this exact brand | 3 — decent form UX, but template editor is a foreign tool the team must also learn |
| Reliability of output | 4 — Google's PDF export is rock-solid, but layout correctness for this brand's graphics is the risk | 5 — deterministic render pipeline, no AI, tested once and stable forever | 4 — reliable rendering, but dependent on a third-party service's uptime/behavior |
| Maintainability (by this team, over time) | 3 — good for editing merge-field text in Docs UI, poor for touching the visual chrome | 4 — template lives in code; visual chrome re-exported as images when brand assets change, no code change needed for that | 2 — locked into the vendor's template system and pricing/feature changes |
| Cost | 5 — completely free within normal Workspace use | 5 — $0 on Vercel free tier at this volume | 2 — per-document or per-seat fees at 10–50 proposals/day add up and violate the low-cost constraint |
| Scalability / extensibility | 2 — Apps Script + Sheets doesn't extend cleanly into a database, history view, or later AI-assisted drafting | 5 — clean path to add storage, auth, multiple templates, or guarded AI features later | 3 — bounded by whatever the SaaS platform's roadmap supports |
| **Total** | **21/30** | **27/30** | **18/30** |

## 6. Trade-off Analysis

Option A (Google Workspace) is tempting because it requires zero hosting and is familiar to non-technical staff — but it loses specifically on **this brand's** graphic complexity. Rendering `docs/letterhead-skeleton.jpeg` directly confirms the letterhead isn't a simple bordered page: it has diagonal-cut gradient header/footer bands, a large faint "Z" + arrow + starburst watermark, a dot-grid texture, and icon chips — none of which are native Google Docs constructs. Reproducing them would mean inserting the chrome as a static image inside the Doc anyway, which cancels out the "edit it like a normal document" advantage the option is chosen for in the first place.

Option C (No-code SaaS) is the fastest to stand up, but it trades cost and control for speed. At 10–50 proposals/day, per-document or per-seat pricing on a document-automation platform stops being "low/no-cost" fairly quickly, and the team would be dependent on a vendor's template editor, pricing changes, and feature roadmap rather than owning the tool outright.

Option B (Custom web app) is the only option that satisfies both the non-negotiable brand-fidelity requirement *and* the low-cost constraint *and* leaves a clean runway for future extensibility (proposal history, later guarded AI-assisted drafting) without needing to re-platform. Its one real cost — an initial build — is a one-time cost, not a recurring one, which is the right trade given the constraints.

## 7. Final Recommendation

**Build Option B: a custom lightweight web app**, for four reasons:
1. Brand fidelity is non-negotiable per the design system and letterhead assets, and only a real HTML/CSS render pipeline reproduces the diagonal-cut chrome and watermark exactly, every time.
2. It holds to $0 recurring cost on Vercel's free tier at the team's current volume.
3. It is fully deterministic — no AI anywhere in the rendering path — which directly eliminates the confirmed root cause (a generative tool being used for a deterministic task).
4. It has a clean extensibility path (proposal history, multiple templates, an eventual guarded/human-reviewed AI drafting assist) that the other two options don't offer without a rebuild.

## 8. MVP Scope

**In scope:**
- One form: client/business fields, service checkboxes sourced from `tools.md` (hardcoded list, not a database), a free-text notes/benefits field.
- One fixed letterhead template. ~~Header/footer chrome exported as high-resolution image assets from the existing external design source (Figma/Canva/Illustrator).~~ **Superseded 2026-07-19** — no such design source exists (the letterhead is AI-generated); the chrome is built in HTML/CSS/SVG instead. See the correction in §9.
- Server-side PDF rendering via a headless browser (Playwright + a serverless-trimmed Chromium build) running as a Vercel serverless function.
- Instant, stateless PDF download — no login, no database, no stored history in v1.

**Out of scope (deliberately deferred to v2+):**
- Proposal history / storage / a dashboard of past proposals.
- Multiple template variants for different service bundles.
- Optional AI-assisted narrative drafting — if reintroduced later, it must be guarded (human-reviewed, constrained to specific text fields, never touching layout).
- E-signature, CRM integration, user accounts/roles, usage analytics.
- Moving the service list from a hardcoded constant into a database/CMS — this is the intended **first post-MVP upgrade**, once the team has used and validated the MVP.

## 9. High-Level Architecture

```
Sales rep → Form (Next.js page)
              │  (client fields, selected services, notes)
              ▼
        API route (Vercel serverless function)
              │  server-renders an HTML string:
              │   - dynamic body content (client info, selected services, notes)
              │   - letterhead chrome built in HTML/CSS/SVG (see correction below)
              │   - styled with design.md tokens, self-hosted Montserrat/Inter fonts
              │   - waits on document.fonts.ready before printing
              ▼
        Headless Chromium (Playwright + serverless-trimmed Chromium)
              │  page.pdf()
              ▼
        PDF streamed back to the browser → instant download
```

No database, no auth, no persistent storage in v1 — every request is stateless.

> ### ⚠️ Correction (2026-07-19) — chrome is built in CSS, not shipped as images
>
> This section originally recorded the key architectural decision as treating the header/footer chrome as **flattened, pre-exported image assets**, on the premise that a designer could re-export two PNGs from an editable source file whenever the brand changed.
>
> **That premise was wrong.** The letterhead was produced by an AI image generator; there is no Figma/Canva/Illustrator source. The only available rasters (`docs/header.png`, `docs/footer.png`) are ~127 DPI with the contact email and taglines baked in as pixels, and nothing can re-export or genuinely upscale them.
>
> The chrome is therefore **rebuilt in HTML/CSS/SVG** — gradient bands, `clip-path` diagonal cuts, `radial-gradient` dot grid, Montserrat Black wordmark, inline SVG icons. This is resolution-independent and makes the contact details real selectable text, which is *better* fidelity than the raster route it replaces. The PNGs remain in `docs/` as visual reference only.
>
> Full reasoning and rejected alternatives: `specs/001-proposal-pdf-generator/research.md` R1. This also requires amending Constitution Principle II, whose rationale rests on the same false premise.

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Headless-Chromium cold start (3–8s) on serverless | Acceptable at 10–50 proposals/day; show a "Generating..." spinner; raise `maxDuration` on the function |
| PDF snapshotted before Montserrat/Inter fonts finish loading, silently falling back to a system font | Self-host font files, explicitly await `document.fonts.ready` before calling `page.pdf()` |
| Serverless function bundle-size/memory limits on Vercel's free tier | Use a serverless-trimmed Chromium build (not a full Puppeteer bundle) |
| Team drifts back to prompting ChatGPT out of habit | Make the tool visibly faster than prompting; short onboarding walkthrough at launch |
| ~~Someone updates the brand chrome in the source design file but forgets to re-export/update the PNGs~~ **No longer applicable** — there is no source design file, and the chrome lives in code | Superseded by a different risk: the CSS chrome can drift from the reference PNGs. Mitigation: an explicit visual-fidelity comparison against `docs/header.png` / `docs/footer.png` during implementation review (see `quickstart.md`) |

## 11. Success Metrics

- Proposal failure rate: **70% → target under 5%**.
- Time to produce one proposal (form open → PDF in hand): **target under 2 minutes**.
- Team adoption: **>80%** of sales team using the tool for new proposals within 2 weeks of launch.
- Recurring infrastructure cost: **$0**, maintained at current volume (10–50/day).

## Acceptance Checks

- [x] Root-cause analysis identifies a single, falsifiable core cause (not just "AI is bad")
- [x] At least 3 distinct solution options evaluated
- [x] Evaluation matrix scores Complexity, Usability, Reliability, Maintainability, Cost, Scalability
- [x] Final recommendation is explicitly justified against the stated constraints (non-technical-friendly, low/no-cost, reliable PDF, extensible MVP)
- [x] MVP scope has explicit In/Out lists
- [x] Architecture, risks, and success metrics are stated concretely, not as placeholders

## Follow-ups & Risks

- ~~First task at MVP kickoff: open the external design source file and test-export the header/footer bands as clean, print-resolution (~300dpi) transparent PNGs before any app code is written.~~ **Resolved 2026-07-19 — the assumption failed.** There is no external design source file; the letterhead is AI-generated and the only PNGs are ~127 DPI. The chrome is built in CSS/SVG instead (see §9 correction), which removes this blocking prerequisite from the critical path entirely.
- Confirmed: MVP hardcodes the service list from `tools.md`; migrating to a DB/CMS is an explicit v2 trigger once the team validates the MVP.
- The PDF-rendering approach (headless Chromium + image-based chrome vs. Google Docs merge vs. a pure-JS PDF library) is an architecturally significant decision worth recording — see suggestion below.
