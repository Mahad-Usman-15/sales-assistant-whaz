---
id: 0008
title: Match The Reference Proposal PDF Exactly
stage: refactor
date: 2026-07-26
surface: agent
model: claude-opus-5
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: none
labels: [brand-fidelity, letterhead, pdf, layout, constitution-conflict, breaking-change]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - assets/brand/letterhead.png
 - assets/fonts/Arimo-Regular.woff2
 - assets/fonts/Arimo-Bold.woff2
 - lib/brand.ts
 - lib/copy.ts
 - lib/chrome.ts
 - lib/geometry.ts
 - lib/catalog.ts
 - lib/schema.ts
 - lib/view-model.ts
 - lib/template.ts
 - lib/fonts.ts
 - components/ProposalForm.tsx
 - app/globals.css
 - scripts/check-table-fit.mjs
 - package.json
 - specs/001-proposal-pdf-generator/spec.md
 - specs/001-proposal-pdf-generator/quickstart.md
 - CLAUDE.md
 - lib/CLAUDE.md
tests:
 - tests/unit/template.test.ts
 - tests/unit/schema.test.ts
 - tests/unit/catalog.test.ts
 - tests/unit/_dump-preview.test.ts
 - tests/integration/generate.spec.ts
 - tests/integration/form.spec.ts
---

## Prompt

Currently the generated PDF is what the Whaz salesperson not wanted.But they liked the Idea. What they wanted is that the print should be according to the reference letterhead provided in the docs folder reference-letter-head.pdf The letter head is gemini generated which is not 300 dpi but we have to make the generated pdf like the reference one.What are the alternatives for the generation of pdf exactly like the reference.

(Subsequent turns in the same session: "I can try with gpt increasing the dpi of header and footer. Give me the exact prompt for increasing the dpi" / "save header-crop and footer-crop in the docs" / "Check the image header-upscaled-by-gpt" / "whats option A" / "Tell me the exact layout now the after phase 2 will be generated after Option A" / "The selected tools should come under the table with their Whaz Solution and Expected Benefit." / the expected-document transcript / "This is the format the reference letter showcases in which header,Executive Proposalheading,Why Whaz,Next Steps,footer will remain same only the company detail,info and tools list would be changes" / "Tell me first can you exactly see the reference pdf structure" / "tools can be changed later,I think that's not a blocker")

## Response snapshot

**The decisive finding was a correction to my own earlier reading.** I had described `docs/reference-letter-head.pdf` as a letterhead swatch — one full-page image with "a few Helvetica text runs stamped on top" — because I rendered its embedded image and never decoded its text layer. When the user asked whether I could actually see its structure, decoding object `9 0 obj` showed it is the **complete executive proposal**: title, recipient block, intro, three-column table, "Why Whaz", "Next Step". `CLAUDE.md` had propagated the same misread ("full letterhead reference"). Everything downstream changed once that was corrected — it is the acceptance criterion for layout and prose, not just chrome.

Enumerated the alternatives, then the user chose Option A: embed the approved raster. Two premises were established first:

1. **The approved artifact *is* the ~127 DPI raster.** This falsifies constitution Principle II's premise for the second time (v2.0.0 had already inverted it from "images" to "CSS/SVG").
2. **Generative upscaling cannot work.** The user wanted to try it anyway; rather than resisting I supplied the prompt plus three verification checks. It failed all three exactly as predicted — 1536x1024 instead of 2480x652, the tagline corrupted to "Better Decisions**,** Real Growth.", band colour `(2,1,9)` -> `(148,148,152)`, alpha destroyed at 96.29% transparent.

The full-page composite (both bands **and** the `design.md` §5 body watermark, previously deferred as unbuildable) turned out to be losslessly extractable from the reference's `3 0 obj` — so no regeneration was needed at all.

Rebuilt the document against measurements decoded from the reference content stream rather than estimates: `lib/chrome.ts` went from 472 lines of CSS band reconstruction to a full-bleed background layer plus reference typography; `lib/copy.ts` holds the fixed prose; `lib/catalog.ts` gained `challenge`/`benefit` for the table's outer columns; the schema dropped `proposalTitle`/`preparedBy`/`notes` and gained the two role lines. Helvetica cannot be named on `@sparticuz/chromium` (no system fonts), so body text is **Arimo** from `@fontsource/arimo` — Google Fonts serves Arimo variable-only, and variable fonts break text selection here.

**Verification was numeric, not visual, and that mattered.** Eyeballing the first render looked "very close"; extracting text baselines showed the "Prepared for" block was 5.1mm low and the table 2.7mm low. Iterating against measured baselines brought every fixed element to **<=0.11mm** of the reference. Two defects only the measurement caught: the `<h2>` section headings were inheriting the UA's 1.5em (so "Next Step" rendered at 15pt instead of the reference's 10pt), and table rows were 6.61mm instead of 6.35mm because Chromium rounds the collapsed 0.4pt rules up to a whole device pixel.

Found and fixed two further issues the reference could not answer: with all 17 services the last line of page 1 cleared the footer band by only 1.8mm (bottom reserve 34mm -> 37mm), and four catalog strings were wide enough to wrap a table cell, which would break the uniform row pitch. Added `npm run check:table-fit` to measure every catalog string in a real Chromium and fail rather than ship a misaligned table.

Separately, `git status` failed mid-session with `index file corrupt` — the index was 10838 zero bytes and dated four days earlier, i.e. an unclean write unrelated to this work. HEAD and the object database were intact and nothing was staged, so it was backed up and rebuilt with `git read-tree HEAD`; no working-tree file was touched.

## Outcome

- ✅ Impact: Generated PDF now reproduces `docs/reference-letter-head.pdf` — every fixed element within 0.11mm, table row pitch exactly 6.35mm, watermark shipped rather than deferred. Chrome approach inverted from CSS/SVG back to an embedded raster.
- 🧪 Tests: 83 unit pass (was 82; added a challenge/benefit invariant), 13 integration pass against the production build, typecheck + production build clean, `check:table-fit` green for all 17 services. Also loaded the app under `next dev` in a real browser and completed the form flow, per the standing warning that the integration suite only covers production builds.
- 📁 Files: new `assets/brand/letterhead.png`, `lib/brand.ts`, `lib/copy.ts`, `scripts/check-table-fit.mjs`, Arimo faces; rewritten `lib/chrome.ts`, `lib/geometry.ts`, `lib/schema.ts`, `lib/view-model.ts`, `lib/template.ts`, `lib/fonts.ts`; `lib/catalog.ts` +2 fields x17; form and all affected specs/tests; `spec.md` FR-002/003/005/005a/014 and quickstart fidelity checklist rewritten.
- 🔁 Next prompts: **Constitution amendment to v3.0.0 via `/sp.constitution` is outstanding and the code is ahead of it** — Principle II still mandates CSS/SVG chrome and forbids bundling rasters. User sign-off still wanted on the 17 client-facing challenge/benefit lines. T059 (production timing) and T062 (Vercel deploy) remain.
- 🧠 Reflection: I reported on the reference PDF's contents having only looked at its image layer, and that wrong summary sat in `CLAUDE.md` shaping the plan until the user asked a direct question about it. Rendering an artifact is not the same as reading it. The user's "can you exactly see the reference pdf structure" was worth more than several turns of my own analysis.

## Evaluation notes (flywheel)

- Failure modes observed: (1) Partial inspection reported as complete understanding — decoded the image stream, never the text stream, then described the whole file. (2) Visual comparison read as verification; a 5mm offset looked fine at screenshot scale and only fell out of baseline extraction. (3) Test assertions written against the whole HTML document matched the `<style>` block instead of the markup (class names and section headings appear in CSS comments), producing five failures that were defects in my tests, not the template.
- Graders run and results (PASS/FAIL): Baseline delta vs reference PASS (<=0.11mm, bar 0.5mm). Unit 83/83 PASS. Integration 13/13 PASS. Typecheck/build PASS. `check:table-fit` PASS (17/17). Dev-mode browser flow PASS (PDF downloaded, no console errors).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Promote the baseline-delta check from a manual quickstart step to an automated test — extract text positions from a rendered PDF and assert each fixed element against the reference table. It is the only check that caught the real layout defects, and it is currently the one step a future change can silently skip.
