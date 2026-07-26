---
id: 0006
title: Implement Proposal PDF Generator MVP
stage: green
date: 2026-07-20
surface: agent
model: claude-opus-4-8
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.implement
labels: [implement, mvp, nextjs, pdf, chromium, css-chrome]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - package.json
 - next.config.ts
 - tsconfig.json
 - playwright.config.ts
 - vitest.config.ts
 - eslint.config.mjs
 - app/layout.tsx
 - app/page.tsx
 - app/globals.css
 - app/api/generate/route.ts
 - components/ProposalForm.tsx
 - components/ServicePicker.tsx
 - components/FieldError.tsx
 - lib/escape.ts
 - lib/schema.ts
 - lib/catalog.ts
 - lib/view-model.ts
 - lib/chrome.ts
 - lib/template.ts
 - lib/fonts.ts
 - lib/pdf.ts
 - lib/geometry.ts
 - lib/filename.ts
 - assets/fonts/
 - tests/unit/
 - tests/integration/
 - scripts/preview-chrome.mjs
 - README.md
 - CLAUDE.md
 - specs/001-proposal-pdf-generator/tasks.md
tests:
 - tests/unit/escape.test.ts
 - tests/unit/schema.test.ts
 - tests/unit/catalog.test.ts
 - tests/unit/template.test.ts
 - tests/integration/generate.spec.ts
 - tests/integration/form.spec.ts
---

## Prompt

/sp.implement

#Use latest version for Next JS.

## Response snapshot

Checklist gate passed (requirements.md 16/16). Verified latest versions from npm rather than trusting training data: **Next.js 16.2.10**, not the 15 recorded in `plan.md` — used 16 per the explicit instruction and recorded the deviation. Confirmed via context7 that `runtime = 'nodejs'` and `maxDuration` are unchanged in 16, so the plan's approach held.

Executed T001–T060 of 63. Phases 1–2 (setup, foundational) then US1/US2/US3, TDD throughout — tests written first and confirmed RED before implementing.

**Four real defects were found and fixed during implementation, none of which were visible from the plan:**

1. **Page 2+ content rendered underneath the header band.** `body { padding-top }` applies only to the first page, so overflow content started at the sheet top and was invisible. Caught by extracting text coordinates from the PDF (signature block at y=3.1mm, inside the 0–55.2mm band). Tried `@page` margins with negative band offsets — that broke fixed positioning outright, leaving bands floating mid-content. Landed on the reliable technique: `position: fixed` *paints* the bands, and a `<table>` with empty `thead`/`tfoot` *reserves* the space on every page. Both mechanisms are required; removing either breaks multi-page output silently.

2. **Variable fonts broke the PDF text layer.** Inter ships from Google Fonts as a variable font, and Chromium converts variable fonts to Type3 in PDF output, dropping the ToUnicode map — chrome text was selectable on page 1 but not page 2. Re-downloaded static Inter Regular/SemiBold instances (via a legacy user-agent, which makes Google serve statics) and the fonts now embed properly as Inter-Regular/Inter-SemiBold.

3. **Output was not byte-deterministic.** Chromium stamps `/CreationDate` and `/ModDate` at second resolution, so two renders straddling a second boundary differed — a genuine FR-007/SC-005 violation that only appeared through the HTTP path (direct back-to-back renders landed in the same second and passed). `lib/pdf.ts` now pins both timestamps to the rep-supplied proposal date, with the replacement deliberately the same byte length because PDF xref tables store absolute byte offsets.

4. **Integration tests were failing against `next dev`.** After a run of heavy PDF renders the dev server stopped serving page requests; two US3 tests failed even on retry. Switched the Playwright `webServer` to a production build (`npm run build && npm start`) — more stable, and the observed timings now reflect what actually ships.

**Fidelity review (T034, constitution-mandated):** rendered the document to PNG and compared against `docs/header.png`/`docs/footer.png`. Match on gradient, diagonal-cut geometry (clip-path polygons derived from measured artwork rows), wordmark, dividers, icon chips, dot grid. Found and fixed one gap — a missing vertical divider before the contact block. The one knowing deviation is the reference's arrow-styled "A" in WHAZ, which is AI-art detail that type cannot reproduce.

**Verified against the constitution, not just the tests:** the output PDF contains **0 embedded images** (proving no raster chrome ships), no source file references the brand PNGs, and no remote URL appears anywhere in the render path.

Also created `lib/catalog.ts` earlier than its task position (T039) because `lib/view-model.ts` needs its types — the US1/US2 file coupling flagged in `tasks.md`. `tests/unit/catalog.test.ts` parses `tools.md` directly and asserts all 17 services match verbatim, so the constant cannot drift silently.

## Outcome

- ✅ Impact: Working MVP. Form → validated payload → CSS-built letterhead → Chromium → downloadable PDF, deterministic and stateless. 58/63 tasks complete; remaining are T059 (production timing), T061–T062 (quickstart validation + Vercel deploy), T063 (done as part of this session).
- 🧪 Tests: **78 unit** (escape, schema, catalog, template) + **13 integration** (9 API contract cases + 4 form flows). All 9 contract cases pass including byte-level determinism, injection, and multi-page chrome.
- 📁 Files: ~30 created — full `app/`, `components/`, `lib/`, `assets/fonts/`, `tests/`, plus `README.md` and config. `CLAUDE.md` and `tasks.md` updated.
- 🔁 Next prompts: `npx vercel` to deploy (T062), then re-run quickstart against the deployed URL (T061). `/sp.analyze` should now come back clean. The PDF-rendering ADR remains un-consented.
- 🧠 Reflection: The plan's research R4 asserted that `position: fixed` alone would satisfy FR-012. It was half right — fixed elements do repeat, but nothing reserves their space on later pages, and the failure is invisible unless you inspect page 2 specifically. Extracting text coordinates from the PDF rather than eyeballing a screenshot is what caught it; a visual check of page 1 would have passed.

## Evaluation notes (flywheel)

- Failure modes observed: (1) Guessed dependency versions that don't exist (`eslint@^9.40.0`; 9 tops out at 9.39.5) — should query npm before writing a manifest. (2) Turbopack's dev server entered a bad state after edits (`ComponentMod.handler is not a function`) and later stopped serving pages entirely under load; a production build is the more reliable test target. (3) Screenshot-based verification of a *paginated* document is misleading — `position: fixed` renders at viewport bottom on screen but paginates in print, so page-1 screenshots looked fine while page 2 was broken.
- Graders run and results (PASS/FAIL): Unit suite PASS (78/78). Contract cases 1–9 PASS. Constitution checks PASS — 0 embedded images, no raster references, no network in render path, chrome text selectable. Fidelity review PASS with one fix applied.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add a unit-level assertion on rendered page count and per-page text bounds (parse the PDF, assert no text sits inside the band regions) so the page-2-under-header class of bug fails a fast test instead of requiring manual PDF inspection.
