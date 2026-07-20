---
description: "Task list for Proposal Letterhead PDF Generator (MVP)"
---

# Tasks: Proposal Letterhead PDF Generator (MVP)

**Input**: Design documents from `/specs/001-proposal-pdf-generator/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: INCLUDED. `plan.md` specifies Vitest (unit) + `@playwright/test` (integration), and `contracts/generate-api.md` defines 9 named contract cases. Test tasks below map to those cases.

**Constitution**: v2.0.0. Two obligations bind this task list directly — the letterhead chrome MUST be built in HTML/CSS/SVG with reference rasters never bundled (Principle II), and its visual fidelity MUST be verified by explicit side-by-side comparison before merge (T034, a required review step, not a nicety).

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every task

## Path Conventions

Single Next.js App Router project at repository root (per `plan.md` Structure Decision): `app/`, `components/`, `lib/`, `assets/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — nothing exists yet; this repo is greenfield.

- [X] T001 Initialize Next.js 15 App Router + TypeScript project at repository root (`package.json`, `tsconfig.json`, `next.config.ts`), preserving existing repo files (`specs/`, `docs/`, `.specify/`, `history/`, all root `.md` docs)
- [X] T002 Install production dependencies in `package.json`: `next`, `react`, `react-dom`, `playwright-core`, `@sparticuz/chromium`, `zod`
- [X] T003 [P] Install dev dependencies in `package.json`: `playwright`, `vitest`, `@playwright/test`, `typescript`, `@types/node`, `@types/react`
- [X] T004 [P] Configure ESLint + Prettier in `eslint.config.mjs` and `.prettierrc`
- [X] T005 [P] Configure Vitest in `vitest.config.ts` (unit tests under `tests/unit/`)
- [X] T006 [P] Configure Playwright in `playwright.config.ts` (integration tests under `tests/integration/`, dev server auto-start)
- [X] T007 [P] Add npm scripts to `package.json`: `dev`, `build`, `start`, `lint`, `test:unit`, `test:integration`, `test`
- [X] T008 [P] Extend `.gitignore` with `node_modules/`, `.next/`, `test-results/`, `playwright-report/`
- [X] T009 [P] Download and commit self-hosted fonts to `assets/fonts/`: `Montserrat-Black.woff2` (weight 900 — load-bearing for the wordmark), `Inter-Regular.woff2`, `Inter-SemiBold.woff2` (both OFL-licensed; do **not** reference Google Fonts CDN)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core render infrastructure every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 [P] Implement `escapeHtml()` in `lib/escape.ts` — escape `&`, `<`, `>`, `"`, `'`; export a separate `escapeHtmlWithBreaks()` that escapes **first** then converts `\n` → `<br>` (order matters, research R6)
- [X] T011 [P] Write unit tests in `tests/unit/escape.test.ts` covering all five escaped characters, the escape-then-`<br>` ordering, empty input, and that `<script>` survives only as literal text (FR-008)
- [X] T012 [P] Implement font loading in `lib/fonts.ts` — read `.woff2` files from `assets/fonts/`, encode as base64 `data:` URIs, memoise in module scope, and export a `@font-face` CSS block (research R5)
- [X] T013 Implement browser lifecycle in `lib/pdf.ts` — `launchBrowser()` resolving `@sparticuz/chromium` when `process.env.VERCEL` is set and the dev-only `playwright` Chromium otherwise; `renderPdf(html)` that awaits `document.fonts.ready` before `page.pdf({ format: 'A4', printBackground: true })` and always closes the browser in a `finally` block (research R3)
- [X] T014 [P] Define page geometry constants in `lib/geometry.ts` — A4 210×297mm, header band 55.2mm, footer band 32.7mm, body padding top 68mm / bottom 42mm / sides 20mm (research R4)
- [X] T015 [P] Create `app/layout.tsx` and `app/globals.css` with the base application shell (browser UI only — distinct from the PDF document styles)
- [X] T016 Create the API route skeleton in `app/api/generate/route.ts` — `export const runtime = 'nodejs'`, `export const maxDuration = 60`, a `POST` handler stub, and a `405` response for all other methods (contract case 9)

**Checkpoint**: Render engine, escaping boundary, and fonts are ready — user stories can begin.

---

## Phase 3: User Story 1 - Generate a branded proposal PDF from a filled form (Priority: P1) 🎯 MVP

**Goal**: A rep fills the core fields, clicks Generate, and receives a downloadable PDF carrying the exact Whaz letterhead with their content in the body.

**Independent Test**: Fill the form with a minimal valid set of details, click Generate, and confirm a PDF downloads that opens correctly, visually matches the reference letterhead, and contains exactly the entered text. Fully testable without service selection or notes.

### Tests for User Story 1

> Write these first and confirm they FAIL before implementing.

- [X] T017 [P] [US1] Contract test in `tests/integration/generate.spec.ts` — valid full payload returns `200`, `Content-Type: application/pdf`, body starts with `%PDF-` (contract case 1)
- [X] T018 [P] [US1] Contract test in `tests/integration/generate.spec.ts` — `GET /api/generate` returns `405` (contract case 9)
- [X] T019 [P] [US1] Unit test in `tests/unit/template.test.ts` — rendered HTML contains salutation, intro, closing, and signature block in order, and omits the services and notes sections when empty (FR-014)
- [X] T020 [P] [US1] Integration test in `tests/integration/form.spec.ts` — fill required fields, submit, and assert a PDF download is triggered

### Implementation for User Story 1

- [X] T021 [P] [US1] Define the base Zod schema in `lib/schema.ts` — `recipientName` (1–120), `clientCompany` (1–160), `proposalTitle` (1–200), `preparedBy` (1–120), `proposalDate` (`YYYY-MM-DD`), `notes` (optional, ≤5000, default `''`); all strings trimmed and rejecting whitespace-only (data-model §2)
- [X] T022 [US1] Build the letterhead **header** band in `lib/chrome.ts` — `linear-gradient(#111111 → #0a0436)`, `clip-path` diagonal cut on the lower edge, WHAZ wordmark in Montserrat Black with SVG star accent, vertical divider rules, the `AI + HUMAN MIND SYSTEM` / `Better Decisions. Real Growth.` label stack, and the contact block (envelope SVG + `whazpk@gmail.com`, social SVG chips + `/thewhaz`) — per `design.md` §5 and research R1
- [X] T023 [US1] Build the letterhead **footer** band in `lib/chrome.ts` — mirrored gradient and `clip-path` cut on the upper edge, 4-point star SVG, divider, `CLARITY. STRATEGY. EXECUTION. RESULTS.` tagline with its two-line muted sub-line, and the `radial-gradient` dot-grid texture at bottom-right
- [X] T024 [US1] Export `CHROME_CSS` from `lib/chrome.ts` positioning both bands as `position: fixed` (top/bottom) so Chromium repeats them on every page, with `@page { size: A4; margin: 0 }` and body padding from `lib/geometry.ts` (research R4, FR-012)
- [X] T025 [US1] Implement `ProposalViewModel` derivation in `lib/view-model.ts` — pass-through fields, locale-independent `formattedDate` (e.g. `19 July 2026`), `notesHtml` via `escapeHtmlWithBreaks()`, and `hasNotes` (data-model §3)
- [X] T026 [US1] Implement `buildProposalHtml(vm)` in `lib/template.ts` — full HTML document assembling `@font-face` from `lib/fonts.ts`, `CHROME_CSS`, and the letter body (salutation → intro → notes → closing → signature block), escaping every rep value at interpolation (FR-014, FR-008)
- [X] T027 [US1] Wire `POST /api/generate` in `app/api/generate/route.ts` — parse JSON, validate with the schema, derive the view model, build HTML, render via `lib/pdf.ts`, return the PDF with `Content-Type: application/pdf`, `Content-Disposition: attachment`, and `Cache-Control: no-store`
- [X] T028 [US1] Implement the download filename slug in `lib/filename.ts` — `proposal-<client-company-slug>-<YYYY-MM-DD>.pdf`, lowercasing and stripping non-alphanumerics (contract §Responses)
- [X] T029 [P] [US1] Build `components/ProposalForm.tsx` — client component with the five core fields plus notes, date defaulting to today, submit handler POSTing to `/api/generate` and triggering the blob download
- [X] T030 [US1] Add the in-progress indicator to `components/ProposalForm.tsx` — visible from submit until the download begins, with the submit control disabled while pending (FR-016)
- [X] T031 [US1] Create the form page in `app/page.tsx` rendering `ProposalForm`
- [X] T032 [US1] Manually verify a generated PDF opens correctly and body text clears both diagonal cuts at top and bottom (adjust `lib/geometry.ts` padding if it collides)
- [X] T033 [US1] Verify chrome text is **real selectable text** in the output PDF — select and copy `whazpk@gmail.com` from the rendered file (Constitution v2.0.0 Principle II)
- [X] T034 [US1] ⚠️ **REQUIRED FIDELITY REVIEW** — compare the rendered chrome side-by-side against `docs/header.png`, `docs/footer.png`, and `docs/reference-letter-head.pdf`, checking gradient direction/endpoints, diagonal-cut corner and angle, divider positions, icon shapes, dot-grid density/placement, and Montserrat Black letterforms against the reference wordmark. Constitution v2.0.0 makes this a blocking review step — record the outcome before merge (`quickstart.md` checklist)

**Checkpoint**: US1 is fully functional — a rep can produce a correctly branded PDF. **This is the demoable MVP.**

---

## Phase 4: User Story 2 - Select offered services from the Whaz catalog (Priority: P2)

**Goal**: The rep picks which Whaz services this proposal offers; only those appear in the PDF, with names and descriptions matching `tools.md` verbatim.

**Independent Test**: Select a subset of services, generate, and confirm only the chosen ones appear with exact catalog text in a stable order.

### Tests for User Story 2

- [X] T035 [P] [US2] Unit test in `tests/unit/catalog.test.ts` — the catalog constant matches `tools.md` character-for-character, contains exactly 9 `free` + 8 `paid` = 17 items, and has unique ids (data-model §1, research R8)
- [X] T036 [P] [US2] Contract test in `tests/integration/generate.spec.ts` — an unknown service id returns `400`, never a silent drop (contract case 5)
- [X] T037 [P] [US2] Contract test in `tests/integration/generate.spec.ts` — a payload with no services and no notes returns `200` with those sections absent (contract case 2)
- [X] T038 [P] [US2] Unit test in `tests/unit/template.test.ts` — selected services render in canonical catalog order regardless of input order, and **no monetary amount appears anywhere** (FR-007, FR-015)

### Implementation for User Story 2

- [X] T039 [P] [US2] Create `lib/catalog.ts` — `SERVICE_CATALOG` typed as `ServiceCatalogItem[]` (`id`, `name`, `description`, `tier`), transcribed verbatim from `tools.md`: 9 free, then 8 paid, in file order. Note `tools.md`'s "Build OS" entry is missing its leading `- ` bullet but is a real service (research R8). **No price field** (FR-015)
- [X] T040 [US2] Extend `lib/schema.ts` with `selectedServiceIds: string[]` — default `[]`, each id validated against `SERVICE_CATALOG`, duplicates rejected
- [X] T041 [US2] Extend `lib/view-model.ts` to resolve `selectedServiceIds` into catalog items **re-sorted into canonical catalog order** (not click order, which would break determinism) and set `hasServices` (data-model §3)
- [X] T042 [US2] Add the services section to `lib/template.ts` — render each selected service's name and description verbatim with its free/paid tier, omitting the whole section when none are selected (FR-002, FR-014)
- [X] T043 [P] [US2] Build `components/ServicePicker.tsx` — checkbox groups for Free and Paid tiers showing each service's name and description
- [X] T044 [US2] Integrate `ServicePicker` into `components/ProposalForm.tsx` and include `selectedServiceIds` in the submitted payload

**Checkpoint**: US1 and US2 both work independently — proposals are now client-specific.

---

## Phase 5: User Story 3 - Be prevented from producing a broken or incomplete proposal (Priority: P3)

**Goal**: Invalid input is blocked with a specific, plain-language message; system failures are understandable and retryable; no partial or corrupt file is ever delivered.

**Independent Test**: Submit with a required field blank and confirm generation is blocked naming that field; then submit valid input and confirm success. Separately, force a render failure and confirm a clear retry path rather than a broken download.

### Tests for User Story 3

- [X] T045 [P] [US3] Contract test in `tests/integration/generate.spec.ts` — missing `recipientName` returns `400` with `fields.recipientName` populated (contract case 3)
- [X] T046 [P] [US3] Contract test in `tests/integration/generate.spec.ts` — multiple invalid fields are **all** reported in one response, not just the first (contract case 4)
- [X] T047 [P] [US3] Contract test in `tests/integration/generate.spec.ts` — `notes` containing `<script>alert(1)</script>` returns `200` and the text appears literally in the PDF with no markup effect (contract case 6, FR-008)
- [X] T048 [P] [US3] Integration test in `tests/integration/form.spec.ts` — submitting with a blank required field is blocked client-side with an inline field-level message
- [X] T049 [P] [US3] Unit test in `tests/unit/schema.test.ts` — whitespace-only rejection, max-length boundaries, malformed date, and unknown service id

### Implementation for User Story 3

- [X] T050 [US3] Implement the `400` error shape in `app/api/generate/route.ts` — `{ error: 'validation_failed', message, fields }`, flattening the Zod issue list so every failing field is reported at once (contract §400)
- [X] T051 [US3] Implement the `500` handler in `app/api/generate/route.ts` — wrap render in try/catch returning `{ error: 'generation_failed', message, retryable: true }` as JSON, guaranteeing no partial byte stream is emitted (FR-010)
- [X] T052 [P] [US3] Create `components/FieldError.tsx` for inline, plain-language field-level messages
- [X] T053 [US3] Wire client-side validation in `components/ProposalForm.tsx` using the **same** `lib/schema.ts` — block submission and surface per-field errors, while the server re-validates independently (FR-009, research R6)
- [X] T054 [US3] Handle API error responses in `components/ProposalForm.tsx` — map `400` `fields` onto inline errors, show a retryable message for `500`, and clear the in-progress indicator on every failure path

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T055 [P] Determinism test in `tests/integration/generate.spec.ts` — submit an identical payload twice and assert the two PDF buffers are byte-comparable (contract case 7, FR-007, SC-005)
- [X] T056 [P] Multi-page test in `tests/integration/generate.spec.ts` — notes long enough to overflow one page produce a >1-page PDF with header and footer chrome on **every** page and no truncation (contract case 8, FR-012)
- [X] T057 [P] Edge-case tests in `tests/unit/template.test.ts` — very long service descriptions wrap without pushing content under the footer; special/non-Latin characters render without breaking layout (spec Edge Cases)
- [X] T058 Verify no network request occurs during render — assert fonts are inlined and no brand raster is bundled or fetched (Constitution v2.0.0 Security Requirements + Technology Constraints)
- [X] T059 Measure cold-start and warm generation timings against the ≤30 s worst case; confirm `maxDuration = 60` headroom is sufficient (FR-016, SC-008) — **measured on a production build: cold 9.3 s, warm 1.2–3.4 s. Both inside the 30 s bar.**
- [X] T060 [P] Write `README.md` — setup, scripts, deploy, and the note that `docs/*.png` are visual reference only and must never be bundled
- [X] T061 Run the full `quickstart.md` verification checklist end-to-end, including the determinism, injection, and multi-page checks
- [ ] T062 Deploy to Vercel (Hobby, Node runtime) and re-run the quickstart verification against the deployed URL
- [X] T063 Update `CLAUDE.md` — flip "greenfield, no `package.json`" to reflect the implemented app, and record the real build/test/deploy commands (Constitution v2.0.0 Workflow Rules)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–5)**: All depend on Foundational; can then proceed in parallel or in priority order P1 → P2 → P3
- **Polish (Phase 6)**: Depends on the user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. Delivers the MVP alone.
- **US2 (P2)**: Depends on Foundational. Extends `lib/schema.ts`, `lib/view-model.ts`, `lib/template.ts`, and `ProposalForm.tsx` from US1 — so if US1 and US2 are worked in parallel, coordinate on those four files.
- **US3 (P3)**: Depends on Foundational. Touches `app/api/generate/route.ts` and `ProposalForm.tsx`. Its schema unit tests (T049) are strongest once US2's catalog validation exists, but the story is independently demoable without it.

### Within Each User Story

- Tests are written and confirmed failing before implementation
- Schema/data before view model → view model before template → template before route wiring
- Chrome (T022–T024) is the critical path for US1 and gates the fidelity review (T034)

### Parallel Opportunities

- Setup: T003–T009 all `[P]`
- Foundational: T010, T011, T012, T014, T015 all `[P]` (T013 depends on T012; T016 is standalone)
- All test tasks within a story are `[P]` — different assertions, and integration tests share a file but are independent cases
- US1: T021 and T029 are `[P]`; T022/T023 are the same file (`lib/chrome.ts`) so are **not** parallel with each other
- US2: T035–T038 `[P]`; T039 and T043 `[P]`
- US3: T045–T049 `[P]`; T052 `[P]`
- Polish: T055, T056, T057, T060 all `[P]`

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests together first (expect failures):
Task: "Contract test — valid payload returns 200 %PDF in tests/integration/generate.spec.ts"
Task: "Contract test — GET returns 405 in tests/integration/generate.spec.ts"
Task: "Unit test — letter section order and omission in tests/unit/template.test.ts"
Task: "Integration test — form fill triggers PDF download in tests/integration/form.spec.ts"

# Then the independent implementation pieces:
Task: "Define base Zod schema in lib/schema.ts"
Task: "Build ProposalForm client component in components/ProposalForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T009)
2. Phase 2: Foundational (T010–T016) — **blocks everything**
3. Phase 3: User Story 1 (T017–T034)
4. **STOP and VALIDATE** — including the required fidelity review (T034)
5. Demo to the sales team: a rep can produce a correctly branded PDF

### Incremental Delivery

1. Setup + Foundational → render engine ready
2. + US1 → **MVP**, demoable, deployable
3. + US2 → proposals become client-specific
4. + US3 → hardened against bad input and failures
5. + Polish → determinism, multi-page, performance, deploy

### Parallel Team Strategy

With multiple developers, after Foundational completes:

- Developer A: US1 (largest — owns `lib/chrome.ts`, the critical path)
- Developer B: US2 (start with `lib/catalog.ts` + `ServicePicker.tsx`, both independent of US1's files)
- Developer C: US3 (start with error-shape tests and `FieldError.tsx`)

Coordinate on the four shared files noted under User Story Dependencies.

---

## Notes

- **T034 is a constitutional requirement, not a courtesy** — Principle II (v2.0.0) makes the fidelity comparison a blocking review step, because the CSS chrome has no authoritative raster backing it in the output path.
- **Never bundle `docs/header.png` / `docs/footer.png`** — they are visual reference only (Technology Constraints).
- `[P]` tasks touch different files with no incomplete dependencies.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
