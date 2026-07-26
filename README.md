# Whaz Proposal Letterhead Generator

An internal tool for the Whaz sales team: fill in a short form, pick the services being offered,
and get a branded proposal PDF. Deterministic by design — **no AI runs in the render path**, and
every word in the output comes from what the rep typed or selected.

Replaces a hand-prompted ChatGPT/Gemini workflow that failed roughly 70% of the time.

## Quick start

```bash
npm install
npx playwright install chromium   # local browser for dev + tests only
npm run dev                       # http://localhost:3000
```

No environment variables. No database. No accounts. There is nothing to configure.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run dev:clean` | Dev server after clearing `.next` — **use this if the page renders blank** |
| `npm run clean` | Delete the `.next` build cache |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test:unit` | Vitest — escaping, schema, catalog, template |
| `npm run test:integration` | Playwright — API contract + form flow |
| `npm test` | Both suites |

## How it works

```
Form (client component)
   └─ POST /api/generate  (Node runtime — never Edge; Chromium needs full Node)
        ├─ zod validation           lib/schema.ts     — shared with the client
        ├─ HTML escaping            lib/escape.ts     — the single injection boundary
        ├─ view model               lib/view-model.ts — resolves services, roles
        ├─ HTML assembly            lib/template.ts   — document body
        │    ├─ fixed copy          lib/copy.ts       — boilerplate prose
        │    ├─ letterhead          lib/brand.ts      — approved raster, inlined
        │    ├─ layout + type       lib/chrome.ts     — measured from the reference
        │    └─ fonts               lib/fonts.ts      — .woff2 inlined as base64
        └─ headless Chromium        lib/pdf.ts        — page.pdf() → PDF bytes
```

The render step makes **zero network requests** — the fonts and the letterhead are both inlined as
data URIs, so nothing is fetched while a proposal is being built.

## Troubleshooting

### The page is blank / the Generate button does nothing

Almost always a corrupted Turbopack cache. Fix:

```bash
npm run dev:clean
```

What happens: `.next` gets into a state where the React Client Manifest is written empty. The
server still sends correct HTML — you can `curl localhost:3000` and see the whole form — but the
browser throws `Could not find the module ... in the React Client Manifest` or `Manifest file is
empty`, which kills React hydration. The form is then inert: it looks present in the page source
but no event handler is attached, so clicking Generate does nothing.

Because the HTML looks fine, this is easy to misdiagnose as a PDF-generation bug. Check the
**browser console** first — if there's a hydration error there, the problem is the cache, not the
renderer. To confirm the API itself is healthy, bypass the UI:

```bash
curl -X POST localhost:3000/api/generate -H 'Content-Type: application/json' \
  -d '{"recipientName":"A","clientCompany":"B","proposalTitle":"C","preparedBy":"D","proposalDate":"2026-07-20"}' \
  -o out.pdf -w '%{http_code} %{content_type}\n'
```

A `200 application/pdf` there with a broken page means hydration, not rendering.

### Related: a stray lockfile outside the project

If a `package-lock.json` exists in a parent directory (e.g. your home folder), Next infers the
workspace root from it and module paths resolve wrongly. `next.config.ts` pins `turbopack.root`
to this directory to prevent that — don't remove it.

## Two things that will bite you if you don't know them

### 1. `docs/reference-letter-head.pdf` is the approved *document*, not a letterhead swatch

Its text layer decodes to the whole proposal — title, recipient block, intro, the three-column
table, "Why Whaz", "Next Step". Every number in `lib/geometry.ts` and every margin in
`lib/chrome.ts` is measured from it. It is the acceptance criterion, not a mood board.

The letterhead artwork ships as `assets/brand/letterhead.png` — the full-page composite (both bands
*and* the body watermark) extracted losslessly from that PDF and painted full-bleed. **Never
reconstruct it in CSS, and never try to upscale it.** The letterhead is AI-generated with no vector
source; a generative upscale was attempted and produced a different image, not a sharper one (wrong
canvas size, corrupted tagline glyphs, shifted band colour, destroyed alpha). Its ~127 DPI is what
the client approved, so that is the bar. `docs/header.png` / `docs/footer.png` remain **reference
only — never bundle them.**

**Fidelity is verified numerically, not visually** — constitution v3.0.0 Principle II sets a 0.5mm
tolerance, and a visual review of this feature once passed a 5.1mm error. Before merging any layout
change, render a proposal and compare text baselines against the reference (full table in
`specs/001-proposal-pdf-generator/quickstart.md`; current build agrees to ≤0.11mm):

```bash
npx vitest run tests/unit/_dump-preview.test.ts   # writes tmp/preview.html + tmp/preview-all.html
node scripts/preview-chrome.mjs tmp/preview.html  # writes tmp/preview/page.png
npm run check:table-fit                           # fails if catalog copy would wrap a table cell
```

### 2. Chrome repetition needs *two* mechanisms

Getting the bands onto every page of a multi-page proposal takes two cooperating tricks, and
removing either one breaks it in a way that is easy to miss:

- `position: fixed` **paints** the bands, and Chromium repeats fixed elements on every printed
  page, full bleed.
- The `<table class="wz-doc">` with empty `<thead>`/`<tfoot>` **reserves** the vertical space.

Body padding cannot do the reserving: padding only applies to the first page, so content flowing
onto page 2 renders underneath the header band and is invisible. `@page` margins don't work
either — they break the fixed bands' positioning. See `lib/chrome.ts`.

## Determinism

Identical input produces **byte-identical** PDFs. Chromium stamps `/CreationDate` and `/ModDate`
with the wall-clock render time at second resolution, which would otherwise make two renders
differ; `lib/pdf.ts` pins those to the rep-supplied proposal date. The replacement is the same
byte length on purpose — PDF cross-reference tables store absolute byte offsets.

Verify:

```bash
npm run test:integration -- -g "identical payloads"
```

## Service catalog

`tools.md` is the single source of truth (9 free + 8 paid = 17 services). `lib/catalog.ts` is a
verbatim transcription, and `tests/unit/catalog.test.ts` parses `tools.md` and fails if the two
drift. Edit `tools.md`, then update `lib/catalog.ts` until that test passes.

Moving the catalog to a database or CMS is an explicit v2 decision — don't pre-build it.

## Deploy

```bash
npx vercel          # preview
npx vercel --prod   # production
```

Vercel Hobby, Node runtime, `maxDuration = 60`. Expect ~3–8s for the first request after idle
(Chromium cold start) and ~2–4s warm — both inside the 30s acceptance bar.

If the function fails to deploy or times out, check in this order:

1. Bundle size against Hobby's 250 MB unzipped limit — a stray full `playwright` or `puppeteer`
   in `dependencies` rather than `devDependencies` is the usual cause.
2. `runtime = 'nodejs'` on the route — the Edge runtime cannot run Chromium.
3. Font payload — the inlined `.woff2` files are the only binary content; subset them rather
   than reintroducing any network fetch.

## Project documents

| Document | What it holds |
|---|---|
| `.specify/memory/constitution.md` | Binding principles (v3.0.0) |
| `specs/001-proposal-pdf-generator/` | Spec, plan, research, data model, API contract, tasks |
| `design.md` | Brand tokens and the §5 letterhead spec |
| `tools.md` | Service catalog (source of truth) |
| `projectplan.md` | Business case and architecture decisions |
