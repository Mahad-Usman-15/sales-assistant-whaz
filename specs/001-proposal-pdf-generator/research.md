# Phase 0 Research: Proposal Letterhead PDF Generator

**Feature**: `001-proposal-pdf-generator` | **Date**: 2026-07-19 (R1/R2/R4/R5 revised same day — see R1)

All Technical Context unknowns are resolved below. No `NEEDS CLARIFICATION` markers remain.

---

## R1. Letterhead chrome: rendered in HTML/CSS, not shipped as images

### Asset audit (measured, not assumed)

`docs/header.png` and `docs/footer.png` are both `1054 × 1492` RGBA PNGs. Alpha-channel analysis shows all non-transparent artwork confined to a horizontal band, with the rest of the canvas fully transparent:

| Asset | Canvas | Artwork rows | Band size | Band aspect |
|---|---|---|---|---|
| `header.png` | 1054 × 1492 | 607 – 883 | 1054 × 277 | 0.2628 |
| `footer.png` | 1054 × 1492 | 664 – 827 | 1054 × 164 | 0.1556 |

Three defects follow:

1. **The bands float mid-canvas** — 1054 × 1492 is A4 proportion, which invites using each file as a full-page background, but the artwork is vertically centred. Used that way, header and footer would stack in the middle of the page.
2. **Effective resolution is ~127 DPI** — 1054 px across A4's 210 mm (8.268 in). Well under the ~300 DPI print target in `projectplan.md` §9.
3. **Small text is baked into the raster** — `whazpk@gmail.com`, `AI + HUMAN MIND SYSTEM`, the footer tagline. At 127 DPI these print soft, and they are pixels rather than text: not selectable, not searchable, not accessible to a screen reader.

### The decisive constraint: there is no vector source

An initial decision (recorded earlier on 2026-07-19) was to re-export both bands at ~300 DPI from the source design file. **That decision was reversed the same day upon learning the letterhead was produced by an AI image generator.** There is no Figma/Illustrator/Canva document behind these PNGs — the raster *is* the original. Nothing can be re-exported, and no upscaler can manufacture the missing detail: interpolation only smooths, and a generative upscaler would invent letterforms in a rendered email address a client is expected to read.

This also **corrects a standing project assumption**: `projectplan.md` §9/§10 and the original planning session both recorded that an editable source design file existed elsewhere and could be re-exported at print resolution. That is false and those documents have been amended.

### Decision

**Rebuild the header and footer chrome as HTML/CSS/SVG inside the rendered document.** No brand raster is bundled or shipped; `docs/*.png` remain in the repo purely as the visual reference to match against.

Composition maps to standard primitives:

| Element | Implementation |
|---|---|
| Band background | `linear-gradient(#111111 → #0a0436)` (`design.md` §2) |
| Diagonal corner cut | `clip-path: polygon(...)` — mirrored between header and footer |
| Dot-grid texture (footer right) | repeating `radial-gradient` |
| WHAZ wordmark | **Montserrat Black**, per `design.md` §5, plus a small SVG star accent |
| Divider rules | `border-left` on flex children |
| Social / envelope icons | inline SVG (standard Instagram, LinkedIn, X marks) |
| Tagline, contact, label text | real HTML text in Inter / Montserrat |

### Rationale

Resolution-independence is the point: vector-and-text chrome is exact at any zoom or print size, which strictly beats the 300 DPI raster that was previously the goal. The contact email and taglines become real text — selectable, searchable, accessible — rather than pixels. It removes a blocking external dependency from the critical path, and it is fully deterministic (same CSS, same output, every time). The chrome also becomes maintainable: a brand tweak is a CSS edit, not a regeneration lottery.

### Constitution conflict — RESOLVED by amendment (constitution v2.0.0, 2026-07-19)

This decision contradicted **Principle II as ratified in v1.0.0**, which required the chrome be *"treated as pre-exported image assets sourced from the canonical design file, never hand-recreated as a CSS/SVG approximation."* Its rationale rested on two premises — that the chrome is *"hand-designed graphic art, not simple geometry"* and that a *"canonical design file"* exists. **Both were factually false**: the art is AI-generated, no source file exists, and the composition is ordinary CSS geometry.

Per Governance, the principle was **amended via `/sp.constitution` to v2.0.0** (a MAJOR bump — the normative rule inverted) rather than silently reinterpreted or diluted. v2.0.0 keeps the fidelity goal intact, mandates CSS-built chrome, forbids bundling the reference rasters, and *strengthens* verification by making side-by-side comparison a required review step. It also preserves the valid half of the old rule: genuinely bespoke artwork (the deferred watermark) still must not be hand-approximated.

**No exception or outstanding deviation remains** — the plan complies with the constitution as written.

### Alternatives considered

- *Re-export at 300 DPI from source* — **impossible**; no source exists. Was the prior decision; reversed on new information.
- *Ship the 127 DPI PNGs as-is* — zero work and screen-acceptable, but permanently caps print quality and leaves contact details as unsearchable pixels.
- *Regenerate with an image model at higher resolution* — non-deterministic (a visibly different letterhead each attempt, against Principle I's spirit), and small text is exactly where image models garble letterforms. Still yields a capped raster.
- *Upscale the existing PNGs (Lanczos or generative)* — interpolation adds no detail; a generative upscaler would hallucinate brand letterforms. Rejected on fidelity grounds.
- *Rebuild in CSS but keep the PNGs as a shipped fallback* — considered and set aside; two code paths for the same chrome doubles the drift surface for no runtime benefit.

### Consequence: fidelity must be verified by eye

Because there is no longer an authoritative raster in the output path, **visual fidelity becomes a review obligation**. Implementation must compare the rendered chrome side-by-side against `docs/header.png` / `docs/footer.png` and `docs/reference-letter-head.pdf`, specifically checking: gradient direction and endpoints, diagonal-cut angle and which corner it cuts, divider placement, icon shapes, dot-grid density and position, and Montserrat Black's match to the wordmark's letterforms. This belongs in `/sp.tasks` as an explicit verification task, not as an afterthought.

---

## R2. Body watermark

**Finding**: `design.md` §5 and FR-005 (as originally written) called for a low-opacity "Z" + arrow + starburst watermark in the body's lower-right. The alpha audit in R1 proves no such artwork exists in either supplied asset, and no separate watermark file is present.

**Decision**: **Defer the watermark out of v1** (unchanged by the R1 revision). FR-005 and `design.md` §5 were amended to record this.

**Rationale**: It is purely decorative; the header and footer carry the brand identity. Unlike the bands, the watermark is genuinely custom artwork rather than simple geometry, so the R1 argument for CSS reconstruction does **not** transfer to it — a hand-drawn approximation of a bespoke mark would be a real fidelity risk, not a win.

**Re-entry path**: supply a transparent `watermark.png`, add one absolutely-positioned element to the body layer, restore the FR-005 clause. No architectural change needed.

---

## R3. HTML → PDF rendering stack

**Decision**: `playwright-core` + `@sparticuz/chromium` on Vercel's **Node.js** runtime.

**Rationale**: Mandated by the constitution's Technology Constraints and confirmed appropriate. `@sparticuz/chromium` is a serverless-trimmed Chromium sized to fit Vercel Hobby's 250 MB unzipped function limit; `playwright-core` ships no browser of its own, so nothing redundant enters the bundle. Chromium's print engine is what makes the chrome reproduce faithfully — and under R1 that matters more, since gradients, `clip-path`, and webfont rendering must all print correctly.

**Alternatives considered**:
- *Full `puppeteer` / `playwright` with bundled Chromium* — forbidden by the constitution; ~300 MB+ bundle breaches the Hobby limit.
- *Pure-JS PDF libraries (`pdf-lib`, `pdfkit`, `jsPDF`)* — no CSS engine, so `clip-path` diagonal cuts and gradient bands would have to be drawn by hand in imperative drawing calls. Strictly worse now than under the image approach.
- *Hosted PDF API* — recurring cost (Principle V) and ships client proposal content to a third party.
- *Edge runtime* — cannot run Chromium.

**Local development note**: `@sparticuz/chromium` is a Linux/Lambda build and will not launch on Windows. `lib/pdf.ts` resolves the executable per environment — the dev-only full `playwright` package's Chromium locally, `@sparticuz/chromium` when `process.env.VERCEL` is set. This is the only intentional dev/prod divergence.

---

## R4. Repeating the chrome on every page

**Decision**: `@page { size: A4; margin: 0 }` with header and footer as `position: fixed` elements, body padding reserving their vertical space. Do **not** use Playwright's `displayHeaderFooter` / `headerTemplate`.

**Rationale**: Chromium repeats `position: fixed` elements on every printed page, satisfying FR-012 with no per-page bookkeeping. Playwright's native header/footer templates render in a *separate context that ignores the page's CSS and self-hosted fonts* — which under R1 is disqualifying, since the chrome now depends entirely on that CSS and on Montserrat Black.

**Layout geometry** (A4 = 210 × 297 mm) — band heights preserved from the reference artwork's proportions:

| Region | Extent |
|---|---|
| Header band | top 0 → 55.2 mm (full bleed) |
| Body content | top padding 68 mm, bottom padding 42 mm, side padding 20 mm |
| Footer band | bottom 32.7 mm → page bottom (full bleed) |

Extra clearance (68 mm vs 55.2 mm; 42 mm vs 32.7 mm) keeps body text off the diagonal cuts, which intrude further into the page than the bands' straight edges.

**Alternatives considered**: CSS Paged Media margin boxes / `position: running()` (poor Chromium support); manual per-page-break repetition (requires knowing break positions in advance — brittle).

---

## R5. Zero-network rendering (fonts)

**Decision**: Inline the `.woff2` faces as base64 `data:` URIs in the generated HTML, read from the server bundle and memoised in module scope. Await `document.fonts.ready` before `page.pdf()`.

**Required faces**: Montserrat **Black (900)** — the wordmark depends on it — plus Inter Regular and Inter SemiBold.

**Rationale**: The constitution forbids the render pipeline from fetching remote content, closing an SSRF/exfiltration path in the serverless step. Data URIs also eliminate the font-load race (`projectplan.md` §10, risk 2). Under R1 this becomes **load-bearing rather than merely prudent**: the wordmark is now type, not artwork, so a font that fails to load doesn't just restyle the letter — it visibly breaks the logo. `document.fonts.ready` is a correctness gate, not an optimisation.

**Bundle note**: R1 removes the brand PNGs from the payload entirely, so the inlined font faces are now the only binary content — a substantially smaller HTML string than the image-based design implied.

**Alternatives considered**: `file://` URLs (fragile paths inside bundled serverless output); serving assets from the app's own origin via `page.goto()` (a network fetch during render — exactly what's ruled out); Google Fonts CDN (explicitly forbidden).

---

## R6. Input validation and injection safety

**Decision**: A single Zod schema in `lib/schema.ts` is the one source of validation truth, shared by client form and API route. Every rep-supplied string passes through `escapeHtml()` in `lib/escape.ts` at the point of interpolation — escaping `&`, `<`, `>`, `"`, `'`.

**Rationale**: FR-008 requires rep input to be literal text that cannot alter document structure. Since the template is assembled as a server-side HTML string, escaping is the correct boundary — applied at interpolation, not at input, so there is exactly one place to audit and no double-escaping. Sharing the schema keeps client messaging (FR-009) aligned with server enforcement; the server re-validates regardless, since the client is not a trust boundary.

**Alternatives considered**: HTML sanitiser allowlists (DOMPurify) — wrong tool; reps enter plain text, so escaping everything is stricter and simpler. Client-only validation — trivially bypassable. Escaping on input — corrupts values and invites double-encoding bugs.

**Newline handling**: escape first, then convert `\n` → `<br>`. Never the reverse.

---

## R7. Cold starts and the 30-second budget

**Decision**: `export const maxDuration = 60` and `export const runtime = 'nodejs'` on the generate route; a persistent in-progress indicator in the UI from submit until download begins (FR-016).

**Rationale**: Chromium cold-starts in ~3–8 s on Vercel; warm renders take ~2–4 s. Both sit inside the agreed ≤30 s worst case (SC-008). `maxDuration = 60` is headroom against a pathological cold start, not a target. The UI indicator is what makes a 6-second wait feel intentional rather than broken — directly relevant to adoption (SC-006).

**Alternatives considered**: cron keep-warm pings (complexity and Hobby cron limits, to optimise a bound already met); background job + polling (introduces state, violating Principle III, for a seconds-long workload).

---

## R8. Service catalog sourcing

**Decision**: Hardcode the catalog as a typed constant in `lib/catalog.ts`, transcribed verbatim from `tools.md`, with a unit test asserting names and descriptions match that file exactly.

**Rationale**: FR-013 mandates `tools.md` as the single source of truth for v1, and the constitution names a DB/CMS migration as an explicit v2 decision not to be pre-built. The test is what stops the constant from silently drifting when someone edits `tools.md`.

**Data note**: `tools.md` defines **9 free + 8 paid = 17** services. `projectplan.md` and `CLAUDE.md` say "9 free + 7 paid" — an off-by-one in those docs, not the catalog. `tools.md` is authoritative.

**Structural note**: `tools.md`'s "Build OS" entry is missing the leading `- ` bullet every other entry has. It is unambiguously a service and is included; a future parser must not assume uniform bullet formatting.
