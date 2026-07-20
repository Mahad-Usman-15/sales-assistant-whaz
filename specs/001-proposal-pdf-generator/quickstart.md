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

**No brand image assets are required.** The letterhead chrome is built in HTML/CSS/SVG (research R1) because the letterhead was AI-generated and has no vector source to export from. `docs/header.png` and `docs/footer.png` stay in the repo purely as the **visual reference to match against** — they are never bundled or shipped.

### Fonts

Place self-hosted `.woff2` faces in `assets/fonts/`:

| File | Used for |
|---|---|
| `Montserrat-Black.woff2` | The WHAZ wordmark — weight 900, per `design.md` §5 |
| `Inter-Regular.woff2` | Body text, captions |
| `Inter-SemiBold.woff2` | Headings, section labels |

Do not reference Google Fonts — forbidden by the constitution. **Montserrat Black is load-bearing**: the wordmark is now type rather than artwork, so if that face fails to load the logo itself renders wrong, not merely the body copy.

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
2. Fill recipient, client company, proposal title, prepared-by; leave the date as today.
3. Tick a few services from both the free and paid lists.
4. Add multi-line notes.
5. Click **Generate**. A spinner shows while rendering; a PDF download starts within a few seconds.

Open the PDF and confirm:

- [ ] Header band at top, footer band at bottom, both full-bleed with clean diagonal cuts
- [ ] Body text clears the diagonal cuts — nothing tucked under the chrome
- [ ] Letter reads: salutation → intro → services → notes → closing → signature block (FR-014)
- [ ] Only the ticked services appear, names/descriptions matching `tools.md` exactly
- [ ] **No prices anywhere** (FR-015)
- [ ] Fonts render as Montserrat/Inter, not a fallback serif — a serif means the font race lost
- [ ] Chrome text stays razor-sharp at 400% zoom, and `whazpk@gmail.com` is **selectable text** (proves the CSS chrome works; if it's fuzzy or unselectable, something is still rendering an image)

### Visual fidelity check (research R1) — do not skip

Because the chrome is now rebuilt in CSS rather than shipped as artwork, matching the reference is a review obligation. Open the generated PDF beside `docs/header.png`, `docs/footer.png`, and `docs/reference-letter-head.pdf` and compare:

- [ ] Gradient direction and endpoints (`#111111` → `#0a0436`)
- [ ] Diagonal cut — correct corner, and the angle matches
- [ ] Divider rule positions between wordmark / label / contact zones
- [ ] Social + envelope icon shapes and their rounded chips
- [ ] Dot-grid density and placement (footer, right side)
- [ ] Montserrat Black letterforms against the reference wordmark, including the star accent on the `Z`

### Determinism check (FR-007)

```bash
curl -s -X POST localhost:3000/api/generate -H 'Content-Type: application/json' -d @sample.json -o a.pdf
curl -s -X POST localhost:3000/api/generate -H 'Content-Type: application/json' -d @sample.json -o b.pdf
cmp a.pdf b.pdf && echo "deterministic ✅"
```

### Injection check (FR-008)

Put `<script>alert(1)</script>` and `<h1>BIG</h1>` in the notes field. Both must appear in the PDF as **literal visible text**. Any rendering effect is a defect.

### Multi-page check (FR-012)

Paste several thousand characters into notes. The PDF must run to multiple pages with the header and footer on **every** page and no truncation.

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
