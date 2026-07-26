# Quickstart: Proposal Letterhead PDF Generator

**Feature**: `001-proposal-pdf-generator` | **Date**: 2026-07-19

How to get the feature running locally and verify it end-to-end. Nothing here is scaffolded yet — this describes the target state that `/sp.tasks` → `/sp.implement` will build.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | Matches the Vercel Node runtime |
| npm | Lockfile committed |
| Self-hosted fonts | See below — the only binary assets |
| No env vars | The MVP needs **zero** secrets; there is no `.env` to set up |

**One brand image asset is required and it is already committed**: `assets/brand/letterhead.png`, the full-page 1054x1492 composite (header band, body watermark, footer band) extracted losslessly from `docs/reference-letter-head.pdf`. It is inlined as a data URI at render time, so nothing is fetched over the network.

`docs/header.png` and `docs/footer.png` remain **visual reference only** and are never bundled. Do not attempt to re-export or upscale them: the letterhead is AI-generated, has no vector source, and generative upscaling was tried and empirically fails (see spec Clarifications 2026-07-26).

### Fonts

Place self-hosted `.woff2` faces in `assets/fonts/`:

| File | Used for |
|---|---|
| `Arimo-Regular.woff2` | Body text |
| `Arimo-Bold.woff2` | Headings, table headers, the bold recipient role lines |

Arimo is metric-compatible with the reference's Helvetica. It is self-hosted because `@sparticuz/chromium` ships no system fonts, so Helvetica cannot simply be named. It comes from `@fontsource/arimo`, **not** Google Fonts, which serves Arimo variable-only — and variable fonts must never be used here (Chromium converts them to Type3 and breaks text selection).

These two files are the entire contents of `assets/fonts/`; the Montserrat and Inter faces from the CSS-chrome era were removed once constitution v3.0.0 landed.

---

## Setup

```bash
npm install
npx playwright install chromium   # local browser for dev + tests only
npm run dev                       # http://localhost:3000
```

`@sparticuz/chromium` is a production dependency but **will not launch on Windows/macOS** — it is a Linux/Lambda build. Locally, `lib/pdf.ts` falls back to the Playwright-managed Chromium installed above; on Vercel (`process.env.VERCEL`) it uses `@sparticuz/chromium`. This is the only intentional dev/prod divergence.

---

## Verify it works

1. Open `http://localhost:3000`.
2. Fill recipient name, role line 1, and client company; leave the date as today. Optionally add role line 2.
3. Tick a few services from both the free and paid lists.
4. Click **Generate**. A spinner shows while rendering; a PDF download starts within a few seconds.

Open the PDF and confirm:

- [ ] Header band at top, footer band at bottom, watermark behind the body — all full-bleed
- [ ] Body text clears the diagonal cuts — nothing tucked under the chrome
- [ ] Document reads: **Executive Proposal** -> Prepared for -> intro -> table -> Why Whaz -> Next Step (FR-014)
- [ ] Only the ticked services appear, in catalog order, one row each
- [ ] Every table cell is a single line — a wrapped cell means catalog copy outgrew its column
- [ ] **No prices anywhere** (FR-015)
- [ ] Body text renders as Arimo, not a fallback serif — a serif means the font race lost
- [ ] Body text is selectable and searchable (the letterhead artwork is raster; the text must not be)

### Layout fidelity check (FR-005a) — do not skip

The reference is the acceptance criterion, and this check is **numeric, not visual** — eyeballing missed a 5mm error during implementation.

```bash
npx vitest run tests/unit/_dump-preview.test.ts   # writes tmp/preview.html and tmp/preview-all.html
```

Render `tmp/preview.html` to PDF, then compare the baseline of each fixed element against
`docs/reference-letter-head.pdf` (extract with any PDF text-position tool):

| Element | Reference baseline |
|---|---|
| `Executive Proposal` | 77.89mm |
| `Prepared for:` | 84.24mm |
| Role line 1 / 2 | 88.48mm / 92.71mm |
| Intro lines | 103.63 / 107.87 / 112.10mm |
| Table header | 122.47mm |
| Table row pitch | 6.35mm, uniform |

- [ ] Every fixed element within 0.5mm of the reference (current build: <=0.11mm)
- [ ] Table row pitch is exactly 6.35mm with no row wrapping to two lines

Then check the catalog copy still fits its columns:

```bash
npm run check:table-fit
```

### Multi-page check (FR-012)

Select **all 17 services** — the longest document the form can produce (`tmp/preview-all.html`).

- [ ] The PDF runs to 2 pages
- [ ] The letterhead (header band, watermark, footer band) is present on **both** pages
- [ ] Page 2 content starts below the header band, and page 1 content clears the footer band
- [ ] Nothing is truncated

### Determinism check (FR-007)

```bash
curl -s -X POST localhost:3000/api/generate -H 'Content-Type: application/json' -d @sample.json -o a.pdf
curl -s -X POST localhost:3000/api/generate -H 'Content-Type: application/json' -d @sample.json -o b.pdf
cmp a.pdf b.pdf && echo "deterministic ✅"
```

### Injection check (FR-008)

Put `<script>alert(1)</script>` and `<h1>BIG</h1>` in the recipient name and role fields. Both must appear in the PDF as **literal visible text**. Any rendering effect is a defect.

---

## Tests

```bash
npm run test:unit          # vitest — escaping, schema, catalog, template
npm run test:integration   # playwright — API contract + form flow
npm test                   # both
```

`tests/unit/catalog.test.ts` asserts the hardcoded catalog matches `tools.md` verbatim — if someone edits `tools.md`, that test is what fails and tells them to update `lib/catalog.ts`.

---

## Deploy

```bash
npx vercel        # preview
npx vercel --prod # production
```

Vercel Hobby, Node runtime, `maxDuration = 60`. No environment variables to configure. Expect the first request after idle to take ~3–8 s (Chromium cold start) and warm requests ~2–4 s — both inside the ≤30 s bar (SC-008).

**If the function fails to deploy or times out**, check in this order:
1. Bundle size against Hobby's 250 MB unzipped limit — a stray full `playwright`/`puppeteer` in `dependencies` (rather than `devDependencies`) is the usual cause.
2. `runtime = 'nodejs'` on the route — the Edge runtime cannot run Chromium.
3. Font subsetting — the inlined `.woff2` faces are now the only binary payload; if `setContent` is slow, subset them to the glyphs actually used rather than reintroducing any network fetch.
