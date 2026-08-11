# Feature Specification: Proposal Letterhead PDF Generator (MVP)

**Feature Branch**: `001-proposal-pdf-generator`  
**Created**: 2026-07-17  
**Status**: Draft  
**Input**: User description: "Deterministic proposal letterhead PDF generator: input form with client/business fields, service selection from the tools.md catalog, and free-text notes, rendered over the fixed brand letterhead chrome to a downloadable PDF with no AI in the render path"

## Overview

The Whaz sales team currently produces client proposal letterheads by hand-prompting general AI chat tools, which fail ~70% of the time (hallucinated content, inconsistent layout, code returned instead of a document, unreliable PDF export). This feature replaces that workflow with a purpose-built tool: a rep fills in a short form, selects the Whaz services being offered, adds any free-text notes, and receives a downloadable PDF that matches the Whaz letterhead exactly — every time. Every word in the output comes from what the rep typed or selected; nothing is generated or inferred. Scope for this feature is the full MVP as approved in `projectplan.md` §8 (form → branded PDF → download, stateless, no accounts or stored history).

## Clarifications

### Session 2026-07-17

- Q: Should the generated proposal include pricing/quote figures for the selected services? → A: No pricing in v1 — services show name + free/paid category only; pricing is a later phase.
- Q: Beyond the services list and free-text notes, what fixed sections should the proposal body contain? → A: Full letter structure — salutation, short intro, services section, notes/benefits, closing, and a sender signature block.
- Q: Adjust the default form field set (recipient name, client company, proposal title/subject, prepared-by, date)? → A: No — use the default set as-is (Whaz's own contact lives in the letterhead footer).
- Q: Maximum acceptable time from clicking Generate to the PDF being ready, worst case including a cold start? → A: Under 30 seconds.

### Session 2026-07-19

- Q: The supplied `docs/header.png` / `docs/footer.png` are ~127 DPI at A4 width, below the ~300 DPI print target — small baked-in text would print soft and be unsearchable. How should this be handled? → A: Re-export both bands at ~300 DPI (~2480px wide, cropped to the band) from the source design file before implementation.
- Q: The body watermark required by FR-005 and `design.md` §5 has no exported asset. How should v1 handle it? → A: Drop it from v1 and amend FR-005 and `design.md` §5 to match; it may return later as a drop-in asset.
- Q: **[Supersedes the 300 DPI answer above]** The letterhead was produced by an AI image generator, so no vector source exists to re-export from. How should the chrome be produced? → A: Rebuild the header/footer chrome in HTML/CSS/SVG — resolution-independent and with real selectable text. Requires amending Constitution Principle II, whose premises (hand-designed art, canonical design file) are factually false. See research R1.

### Session 2026-07-26

- Q: **[Supersedes the CSS/SVG answer above]** The Whaz salesperson rejected the CSS-reconstructed output; they want the generated PDF to match `docs/reference-letter-head.pdf` exactly. How should the chrome be produced? → A: Embed the approved letterhead raster. `reference-letter-head.pdf` embeds a full-page 1054×1492 composite (bands **and** the body watermark) that extracts losslessly; it is the client-approved artifact, so its ~127 DPI is the approved fidelity bar, not a defect. Requires amending Constitution Principle II again (v3.0.0), which currently forbids bundling rasters.
- Q: Attempting to raise the DPI with a generative "upscale" — viable? → A: No, empirically disproven. The attempt returned a 1536×1024 canvas (not 2480px-wide), corrupted the tagline glyphs ("Better Decisions**,** Real Growth." for "."), shifted the band colour from `(2,1,9)` to `(148,148,152)`, and destroyed the alpha channel (96.29% transparent). Generative models cannot preserve a fixed canvas or exact glyphs.
- Q: `reference-letter-head.pdf` was assumed to be a letterhead swatch. Is it? → A: No — its text layer decodes to the complete executive proposal (title, recipient block, intro, three-column table, "Why Whaz", "Next Step"). It is the acceptance criterion for layout and prose, not just chrome.
- Q: The document's prose and structure — rep-authored or fixed? → A: Fixed boilerplate. Only the recipient block and the selected-services table vary; the header, "Executive Proposal" heading, intro, "Why Whaz", "Next Step", and footer are identical on every proposal.
- Q: How should selected services be presented? → A: As the reference's three-column table — Mission Challenge / Whaz Solution / Expected Benefit — with the challenge and benefit lines sourced from the catalog, one fixed line per service.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a branded proposal PDF from a filled form (Priority: P1)

A sales rep opens the tool, enters the client/recipient details and the core proposal information, and clicks a single "Generate" action. Within a few seconds they receive a downloadable PDF that carries the exact Whaz letterhead (header band, footer band, watermark) with their entered content laid into the body. They save or send the PDF to the prospect.

**Why this priority**: This is the entire reason the tool exists — turning rep-entered details into a correctly-branded, downloadable document deterministically. On its own it already replaces the failing AI-chat workflow and delivers the core value.

**Independent Test**: Fill the form with a minimal valid set of details, click Generate, and confirm a PDF downloads that (a) opens correctly, (b) visually matches the reference letterhead, and (c) contains exactly the entered text with no added or altered content. Fully testable without service selection or notes being present.

**Acceptance Scenarios**:

1. **Given** a rep has entered all required client/proposal fields, **When** they trigger Generate, **Then** a PDF file downloads within the target time and its header, footer, and watermark match the reference letterhead pixel-for-pixel.
2. **Given** the same inputs are submitted twice, **When** both PDFs are generated, **Then** the two documents are visually identical (deterministic output — no run-to-run variation).
3. **Given** a rep's entered text contains ordinary punctuation, line breaks, and long words, **When** the PDF is generated, **Then** all entered text appears intact and correctly placed within the body area, never overlapping the header/footer chrome.

---

### User Story 2 - Select offered services from the Whaz catalog (Priority: P2)

While preparing a proposal, the rep selects which Whaz services are being offered to this client from the current catalog (the free and paid tools defined in `tools.md`), each shown with its name and short description. The selected services appear in the generated proposal body; unselected ones do not.

**Why this priority**: Service selection is what makes each proposal specific to a client and removes the most error-prone part of the old workflow (reps mistyping or misremembering service names/descriptions). It builds directly on top of P1's render capability.

**Independent Test**: Select a subset of catalog services, generate the PDF, and confirm only the chosen services appear in the body with their names and descriptions matching `tools.md` verbatim, in a stable order.

**Acceptance Scenarios**:

1. **Given** the full catalog is presented, **When** the rep selects several free and paid services and generates, **Then** exactly those services (name + description) appear in the PDF and none of the unselected ones do.
2. **Given** the rep selects no services, **When** they generate, **Then** the proposal still generates successfully with the services section empty or omitted (services are optional to the document).
3. **Given** a service's name or description in the catalog, **When** it is rendered into the PDF, **Then** the text matches the catalog source exactly, with no paraphrasing.

---

### User Story 3 - Be prevented from producing a broken or incomplete proposal (Priority: P3)

When a rep tries to generate a proposal with a required field missing or with input that could break the layout, the tool clearly tells them what to fix instead of producing a malformed or empty PDF. If generation fails for a system reason, the rep sees an understandable message and can retry, rather than being left with a broken download.

**Why this priority**: Reliability and trust are what will keep reps from reverting to the old AI-chat habit. Preventing silent failures protects the "it just works every time" promise, but depends on the P1/P2 flows existing first.

**Independent Test**: Submit the form with a required field blank and confirm generation is blocked with a specific, human-readable message; then submit valid input and confirm it succeeds. Separately, simulate a generation failure and confirm a clear retry path rather than a corrupt file.

**Acceptance Scenarios**:

1. **Given** a required field is empty, **When** the rep triggers Generate, **Then** generation is blocked and the specific missing field is identified in plain language.
2. **Given** input contains characters that could otherwise disrupt the document (e.g. angle brackets or markup-like text), **When** the PDF is generated, **Then** the characters appear as literal text and cannot alter the document's structure or styling.
3. **Given** the generation step fails after a valid submission, **When** the failure occurs, **Then** the rep sees an understandable error and can retry, and no partial/corrupt file is delivered.

---

### Edge Cases

- **All 17 services selected** — the longest document the form can produce: the table flows onto a second page with the letterhead present on every page, never truncated silently.
- **Empty optional fields** (no second role line, no services selected): the proposal generates cleanly, omitting the table and the empty role line rather than showing blank labels.
- **A catalog challenge/benefit line too wide for its column**: would wrap and break the reference's uniform 6.35mm row pitch. Guarded by `npm run check:table-fit`, which measures every string in a real browser and fails the build rather than shipping a misaligned table.
- **Special / non-Latin characters and emoji** in entered text: rendered faithfully in the brand fonts where glyphs exist; degrade to a readable fallback rather than corrupting the layout.
- **Rapid repeat submissions** (rep clicks Generate multiple times): each request yields its own correct PDF without cross-contaminating another request's content (each generation is independent and stateless).
- **Catalog text that is unusually long** for a service description: wraps within the body without pushing content under the footer band.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a single input form capturing, at minimum, the client/recipient identity, the offering/proposal summary, and the rep/sender identity needed to produce a complete proposal (see Assumptions for the concrete default field list).
- **FR-002**: The system MUST let the rep select zero or more services from the Whaz catalog defined in `tools.md`, displaying each service's name and short description exactly as written in that source. In the generated PDF the selected services MUST appear as the reference's three-column table (Mission Challenge / Whaz Solution / Expected Benefit), one row per service in canonical catalog order, with the challenge and benefit lines coming from the fixed catalog rather than rep input.
- **FR-003**: ~~The system MUST provide a free-text notes/benefits field whose content is placed into the proposal body verbatim.~~ **Withdrawn 2026-07-26** — the document's prose is fixed boilerplate (see FR-014 and Clarifications 2026-07-26); there is no free-text body field.
- **FR-004**: The system MUST generate a downloadable PDF on a single explicit user action, with no additional steps required to obtain the file.
- **FR-005**: The generated PDF MUST reproduce the Whaz letterhead — header band, footer band, and the `design.md` §5 body watermark — by embedding the client-approved artwork extracted from `docs/reference-letter-head.pdf`, painted full-bleed and repeated on every page. Because the approved artifact is itself a ~127 DPI raster, that resolution **is** the fidelity bar; the earlier "sharp at any zoom" and "chrome text must be selectable" requirements are withdrawn as unachievable against this source (see Clarifications 2026-07-26 — generative upscaling was tried and empirically fails). Body text remains real selectable text; only the letterhead artwork is raster.
- **FR-005a**: The generated PDF's body layout MUST match `docs/reference-letter-head.pdf`. Verification is numeric, not visual: the baseline position of every fixed element (title, "Prepared for" block, intro, table header, table row pitch) MUST agree with the reference to within 0.5mm.
- **FR-006**: Every piece of content in the generated PDF MUST originate solely from rep input (typed or selected) or the fixed catalog/template — the system MUST NOT generate, rephrase, summarize, or infer any proposal content.
- **FR-007**: Given identical inputs, the system MUST produce visually identical output on every generation (deterministic rendering).
- **FR-008**: The system MUST treat all rep-entered text as literal content, neutralizing any characters that could otherwise alter the document's structure or styling (no injection into the rendered document).
- **FR-009**: The system MUST validate required fields before generation and, when one is missing, block generation and identify the specific field(s) to fix in plain language.
- **FR-010**: On a generation failure after valid input, the system MUST show an understandable error and allow retry, and MUST NOT deliver a partial or corrupt file.
- **FR-011**: The system MUST NOT require the rep to create an account, sign in, or persist any proposal data to fulfill the core flow (stateless per request).
- **FR-012**: Proposal content that exceeds a single page MUST continue onto additional pages with the letterhead chrome present on every page and no silent truncation.
- **FR-013**: The service catalog presented to the rep MUST be sourced from `tools.md` as the single source of truth for v1 (hardcoded catalog; moving it to a managed data store is an explicit later phase, not part of this feature).
- **FR-014**: The proposal body MUST reproduce the structure of `docs/reference-letter-head.pdf` in this order: the centred "Executive Proposal" title, a "Prepared for:" block (recipient name plus one or two bold role lines), the fixed intro paragraph, the three-column services table, the "Why Whaz" section, and the "Next Step" section. All prose except the recipient block is **fixed boilerplate**, identical on every proposal. The services table is omitted cleanly when no services are selected; every other section is always present. *(Supersedes the 2026-07-17 "full client letter" structure — salutation, notes, closing, and signature block are withdrawn.)*
- **FR-015**: The system MUST NOT display or capture any pricing, quote, or monetary amount for services in v1; selected services are shown by name and free/paid category only.
- **FR-016**: Generation MUST complete — from the rep's Generate action to the PDF being ready to download — within 30 seconds in the worst case, including a cold start. While generation is in progress, the system MUST show a clear in-progress indicator so the rep knows the request is working.

### Key Entities *(include if feature involves data)*

- **Proposal Draft**: The transient set of rep-entered values for one generation — recipient name and role lines, client company, selected services, and proposal date. Exists only for the duration of a single request; not stored.
- **Service Catalog Item**: A single Whaz offering from `tools.md` — its name, short description, and free/paid category, plus the fixed `challenge` and `benefit` lines that fill the proposal table's outer columns (FR-002). Read-only reference data for v1. The challenge/benefit lines live with the catalog rather than in `tools.md`, whose one-description-per-entry format cannot carry them.
- **Generated Proposal Document**: The output PDF — the letterhead chrome plus the rep's content laid into the body as a full client letter (salutation → intro → services → notes → closing → signature block, per FR-014). A deliverable artifact, not persisted by the system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Proposal generation failure rate drops from ~70% (old AI-chat workflow) to under 5% of attempts.
- **SC-002**: A rep can go from opening the tool to a downloaded, brand-correct PDF in under 2 minutes for a typical proposal.
- **SC-003**: 100% of generated PDFs are visually indistinguishable from the reference letterhead on header, footer, and watermark (zero brand-fidelity defects in review).
- **SC-004**: 0% of generated PDFs contain content the rep did not type or select (no hallucinated or altered content across a review sample).
- **SC-005**: Given identical inputs, 100% of repeat generations produce identical output (deterministic).
- **SC-006**: At least 80% of the sales team adopts the tool for their proposals within 2 weeks of launch (measured by usage vs. reported proposals sent).
- **SC-007**: Recurring infrastructure cost stays at $0 (or an explicitly approved near-$0 figure) at the team's current volume of ~10–50 proposals/day.
- **SC-008**: 100% of generations deliver the PDF within 30 seconds of the Generate action, including worst-case cold starts; warm requests complete in a few seconds.

## Assumptions

- **Confirmed field set (FR-001)**: ~~Recipient/client name, Client company, Proposal title, Prepared-by, Proposal date, services, notes (2026-07-17).~~ **Revised 2026-07-26** — because the document is fixed boilerplate, the form captures only: Recipient name, Role line 1, Role line 2 (optional), Client company, Proposal date (defaulting to today), and the services selection. Proposal title, Prepared-by, and Notes are removed. Client company and Proposal date are **collected but not rendered**: the former is the download filename slug, the latter pins the PDF timestamps so identical input yields byte-identical output (FR-007). Recipient-side contact fields remain excluded since Whaz's contact lives in the letterhead footer.
- **No pricing in v1 (FR-015)**: Confirmed via clarification (2026-07-17) — the proposal lists selected services by name/description and free-vs-paid category only, with no monetary amounts. Pricing is out of scope for this feature.
- **Catalog size**: `tools.md` currently defines **9 free** and **8 paid** services (17 total). `projectplan.md`/`CLAUDE.md` describe this as "9 free + 7 paid" — an off-by-one; the spec treats `tools.md` itself as authoritative. This discrepancy is flagged for correction in those docs during planning.
- **Brand chrome as fixed assets**: The header/footer/watermark are treated as ground-truth brand artwork reproduced faithfully, not reinterpreted — consistent with the constitution's Brand Fidelity principle. How the chrome is technically reproduced is a planning decision, not a spec requirement.
- **Single template**: v1 offers one letterhead template. Multiple template variants are out of scope.

## Dependencies & Constraints

- **Source-of-truth documents**: `tools.md` (service catalog), `design.md` §5 (letterhead layout/tokens), `docs/letterhead-skeleton.jpeg` and `docs/reference-letter-head.pdf` (brand chrome), `whaz.md` (company/contact context). These are inputs to this feature and must not be regenerated or approximated.
- **Constitution**: Bound by `.specify/memory/constitution.md` **v4.0.0** — deterministic rendering (zero AI in the render path), brand fidelity as ground truth (the approved letterhead raster is embedded rather than reconstructed, never upscaled or regenerated, with fidelity verified numerically to a 0.5mm baseline tolerance), additive extension (the render path touches no datastore during a render), and the $0 cost ceiling all apply directly to this feature. *FR-011's "no account, no sign-in" requirement was written under v3.0.0's stateless mandate and is superseded by the RBAC feature (`dashboard.txt`); it remains an accurate record of the MVP scope decision.*
- **Out of scope (future phases)**: proposal history/storage, multiple templates, AI-assisted narrative drafting, e-signature, CRM integration, user accounts/roles, analytics.
