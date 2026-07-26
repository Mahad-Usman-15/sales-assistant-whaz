# ADR-0001: Letterhead Chrome Strategy

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2026-07-26
- **Feature:** 001-proposal-pdf-generator
- **Context:** How the Whaz letterhead is reproduced in generated PDFs, how the document body is
  positioned against it, and how fidelity to the approved artwork is verified.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Context

Generated proposals must carry the Whaz letterhead with no perceptible drift from the approved
material — a hard business requirement, since the tool exists to replace a hand-prompted AI workflow
whose main failure was inconsistent branding.

This decision has been **reversed twice**, each time because a factual premise turned out to be false,
and each reversal forced a MAJOR constitution amendment. That history is the main reason this ADR
exists: the *pattern* is more reusable than any single verdict.

| Version | Mandate | Premise that failed |
|---|---|---|
| Constitution v1.0.0 | Ship pre-exported images from the canonical design file | No canonical design file exists — the letterhead is AI-generated (Gemini) |
| Constitution v2.0.0 | Rebuild the chrome in HTML/CSS/SVG | Assumed no usable raster of the approved artwork existed; the Whaz salesperson then rejected the CSS-built output |
| Constitution v3.0.0 | Embed the approved raster | *(current)* |

The decisive fact arrived late and only because the user asked a direct question ("can you exactly see
the reference pdf structure"): **`docs/reference-letter-head.pdf` is not a letterhead swatch — it is
the client-approved finished proposal.** Its text layer (object `9 0 obj`) decodes to the complete
document, and its image layer (object `3 0 obj`, ASCII85+Flate) is a full-page 1054×1492 composite
carrying both bands *and* the body watermark, extractable losslessly.

Two consequences follow, and together they settle the strategy:

1. The client-approved artifact **is** that ~127 DPI raster. Its resolution is therefore the fidelity
   bar, not a defect to engineer around. Earlier work treated "reach ~300 DPI" as a requirement; no
   stakeholder ever asked for it.
2. Reproducing the approved artwork is strictly more faithful than reconstructing it, and it also
   supplies the body watermark that had been deferred out of v1 as unbuildable.

Constraints in force: zero network fetches at render time (constitution Security); Vercel Hobby
bundle limits (Principle V); `@sparticuz/chromium` ships **no system fonts**; and the render must be
deterministic (FR-007).

## Decision

Adopt an **embed-the-approved-artwork** strategy. The components change together and are treated as
one cluster:

- **Chrome source**: `assets/brand/letterhead.png` — the full-page 1054×1492 composite extracted
  losslessly from `docs/reference-letter-head.pdf` (`3 0 obj`). Never reconstructed in code, never
  regenerated, never upscaled.
- **Delivery**: inlined as a base64 data URI by `lib/brand.ts` (memoised), painted as a full-bleed
  `position: fixed` background layer. Inlining satisfies the zero-network-fetch requirement.
- **Page repetition**: two cooperating mechanisms — `position: fixed` *paints* the artwork on every
  printed page; a `<table class="wz-doc">` with empty `thead`/`tfoot` *reserves* the vertical space.
  Neither alone is sufficient (body padding applies only to page 1; `@page` margins break fixed
  positioning outright).
- **Geometry**: every value in `lib/geometry.ts` and every margin in `lib/chrome.ts` is measured from
  the reference's decoded content stream, not estimated or eyeballed.
- **Body font**: **Arimo**, static per-weight `.woff2` from `@fontsource/arimo`, self-hosted and
  inlined. Chosen for metric compatibility with the reference's Helvetica, which cannot be named
  directly because the serverless Chromium has no system fonts. Variable fonts are excluded — Chromium
  converts them to Type3, dropping the ToUnicode map and breaking text selection.
- **Fidelity verification**: **numeric, not visual.** Every fixed element's baseline must agree with
  the reference to within 0.5mm (current build: ≤0.11mm). A side-by-side look is permitted as an extra
  check but may not be the basis of a fidelity claim.
- **Copy guard**: `npm run check:table-fit` measures every catalog `challenge`/`benefit`/`name` in a
  real headless Chromium and fails if one would wrap, since a wrapped cell breaks the reference's
  uniform 6.35mm row pitch.

Ratified as constitution **v3.0.0**, Principle II.

## Consequences

### Positive

- **Exact fidelity to what the client approved**, by construction rather than by careful imitation.
  The rejection risk that killed the CSS approach is eliminated.
- **The body watermark ships.** It was deferred out of v1 as bespoke artwork that must not be
  hand-drawn; it arrives free inside the composite, closing research R2.
- **Far less code to own**: `lib/chrome.ts` went from ~472 lines of gradient/clip-path/dot-grid/SVG
  reconstruction to a background layer plus typography. Brand chrome is no longer a maintenance
  surface with its own bug class.
- **Verification became objective and cheap.** A measured tolerance replaced a subjective review —
  and immediately caught two defects visual review had passed (a 5.1mm block misplacement, and `<h2>`
  headings silently inheriting the UA's 1.5em).
- **Determinism is unaffected**: a static asset plus pinned PDF timestamps still yields byte-identical
  output for identical input.

### Negative

- **Locked to ~127 DPI.** The letterhead will look soft under magnification or high-quality print.
  Accepted deliberately: it is what the client approved, and no higher-resolution version can exist.
- **Chrome text is pixels.** The footer contact email and taglines are no longer selectable,
  searchable, or reachable by a screen reader — a genuine regression against the CSS approach, and
  the reason two v2.0.0 requirements had to be withdrawn rather than merely restated. Body text
  remains real text.
- **Payload cost.** A 432KB PNG becomes ~576KB of base64 in every rendered HTML document; output PDFs
  are ~530KB versus tens of KB before. Comfortably inside Vercel limits, but no longer negligible.
- **The artwork is unmaintainable by us.** Any brand refresh requires a newly approved asset from the
  design owner; there is no editable source and nothing in the repo can be tweaked.
- **Layout margins are empirically tuned against Chromium's rasterisation** (e.g. `padding: 0.86mm`,
  `margin: 4.93mm` — chosen because Chromium rounds the collapsed 0.4pt table rules up to a whole
  device pixel). A Chromium upgrade could shift baselines. The numeric check is the guard, which is
  precisely why it must run on every layout change.
- **Catalog copy is constrained by column width.** Four service strings had to be shortened to avoid
  wrapping. Client-facing wording is now partly governed by typography, which will surprise whoever
  next edits the catalog. `check:table-fit` makes the constraint fail loudly instead of silently.

## Alternatives Considered

**Alternative A — Pre-exported images from the canonical design file** *(constitution v1.0.0 mandate)*
Ship the bands as high-resolution PNGs re-exported from the source artwork.
*Rejected: impossible, not merely inferior.* The letterhead was produced by an AI image generator;
no vector or editable source exists, so there is nothing to re-export from at any resolution.

**Alternative B — Rebuild the chrome in HTML/CSS/SVG** *(constitution v2.0.0; built and shipped)*
Gradient bands, `clip-path` diagonal cuts, `radial-gradient` dot grid, WHAZ wordmark in Montserrat
Black, inline SVG icons.
*Pros:* resolution-independent; contact text stays real selectable text; no bundled asset; brand
tweaks become CSS edits.
*Rejected:* **the Whaz salesperson rejected the output.** It optimised for resolution independence —
something no stakeholder requested — at the cost of matching the artifact the client actually
approved. It also could not supply the bespoke body watermark, and it made fidelity a permanent,
subjective review obligation. Retained in `research.md` R1 as the record of how it was reached.

**Alternative C — Generative upscale of the bands to ~300 DPI**
Attempted at the user's request despite a stated prediction it would fail, with three verification
checks defined in advance. *Empirically disproven — failed all three:* returned a 1536×1024 canvas
instead of 2480px-wide; corrupted the tagline to "Better Decisions**,** Real Growth." (comma for
period); shifted the band colour from `(2,1,9)` to `(148,148,152)`; destroyed the alpha channel
(96.29% transparent). Generative models cannot hold a fixed canvas or exact glyphs — they produce a
*different* image, not a sharper one.

**Alternative D — Auto-trace / vectorise the raster**
Convert the composite to SVG with a tracing tool to gain resolution independence without hand-drawing.
*Rejected without implementation:* the artwork is gradient-heavy with a dot-grid texture and
antialiased type — exactly the content tracers reproduce worst — so it would yield a *third* rendition
differing from the approved one, reintroducing Alternative B's core failure while adding a lossy,
hard-to-review conversion step. It also optimises for the same unrequested goal (resolution) that
sank B.

**Alternative E — Embed the approved artwork** *(chosen)*
See Decision above.

## References

- Feature Spec: `specs/001-proposal-pdf-generator/spec.md` (FR-005, FR-005a, FR-014; Clarifications
  Session 2026-07-26)
- Implementation Plan: `specs/001-proposal-pdf-generator/plan.md` (Constitution Check, Principle II row)
- Research: `specs/001-proposal-pdf-generator/research.md` R1 (superseded, retained with audit) and
  R2 (resolved — watermark ships)
- Verification procedure: `specs/001-proposal-pdf-generator/quickstart.md` (baseline table, 0.5mm bar)
- Governing principle: `.specify/memory/constitution.md` v3.0.0, Principle II + Technology Constraints
- Related ADRs: none (first ADR in this repo)
- Evaluator Evidence: `history/prompts/001-proposal-pdf-generator/0008-match-reference-proposal-exactly.prompt.md`
  (implementation, graders and measured outcomes) and
  `history/prompts/constitution/0003-amend-principle-ii-approved-raster.prompt.md` (amendment rationale)
