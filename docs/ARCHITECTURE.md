# Architecture & Data Flow

How a proposal PDF gets made, end to end. Every explanation lives **inside the diagrams** — read
the diagrams, not the gaps between them.

Diagrams are Mermaid and render directly on GitHub.

---

## 1. The whole system at a glance

Where each piece runs, and what crosses the network.

```mermaid
flowchart LR
    subgraph BROWSER["🖥️ Rep's browser"]
        FORM["ProposalForm.tsx<br/>5 text fields + 17 service checkboxes"]
        DL["Download<br/>proposal-acme-2026-07-27.pdf"]
    end

    subgraph VERCEL["☁️ Vercel — Node.js runtime, never Edge"]
        API["/api/generate<br/>route.ts"]
        BUILD["HTML assembly<br/>pure string building"]
        CHROME["Headless Chromium<br/>the rendering engine"]
    end

    subgraph BUNDLE["📦 Shipped with the function"]
        CAT["catalog.ts — 17 services"]
        COPY["copy.ts — fixed prose"]
        PNG["letterhead.png — approved artwork"]
        FONT["Arimo woff2 — 2 weights"]
    end

    FORM -->|"POST JSON<br/>~300 bytes"| API
    API --> BUILD
    BUNDLE -.->|"read from disk,<br/>memoised per container"| BUILD
    BUILD -->|"one self-contained<br/>HTML string"| CHROME
    CHROME -->|"PDF bytes"| API
    API -->|"200 application/pdf<br/>~527 KB"| DL

    style CHROME fill:#111827,color:#fff
    style VERCEL fill:#f0f4ff
    style BUNDLE fill:#fffbe6
```

> **No database. No AI. No network calls during rendering.** The same input always produces the
> same bytes — see §6.

---

## 2. End-to-end data flow

The full journey of one click, including where Chromium enters and why.

```mermaid
sequenceDiagram
    autonumber
    actor Rep
    participant Form as ProposalForm.tsx
    participant API as route.ts
    participant VM as view-model.ts
    participant TPL as template.ts
    participant PDF as pdf.ts
    participant CR as 🌐 Chromium

    Rep->>Form: fills fields, ticks services, clicks Generate
    Note over Form: zod check with the SAME schema<br/>the server uses — UX only,<br/>never a trust boundary
    Form->>API: POST /api/generate  {recipient, company, date, serviceIds[]}

    API->>API: parse JSON → zod → unknown ids → duplicate ids
    Note over API: any failure ⇒ 400 with per-field<br/>messages, nothing rendered

    API->>VM: toViewModel(input)
    Note over VM: filters the CATALOG (not the input)<br/>so services always appear in<br/>canonical order, never click order
    VM-->>API: ProposalViewModel

    API->>TPL: buildProposalHtml(vm)
    Note over TPL: escapes every rep-supplied value<br/>at interpolation — the single<br/>injection boundary
    TPL-->>API: complete HTML string<br/>(fonts + artwork inlined as base64)

    API->>PDF: renderPdf(html, proposalDate)

    rect rgb(17, 24, 39)
        Note over PDF,CR: ⬇️ THIS IS WHAT CHROMIUM IS FOR ⬇️
        PDF->>CR: launch browser
        PDF->>CR: setContent(html)
        CR->>CR: parse HTML, apply CSS, decode base64 fonts + PNG
        CR->>CR: lay out text, measure lines, break into A4 pages
        PDF->>CR: await document.fonts.ready
        PDF->>CR: page.pdf({format A4, printBackground})
        CR-->>PDF: PDF bytes
        PDF->>CR: close browser
    end

    Note over PDF: rewrite /CreationDate + /ModDate<br/>to the proposal date, same byte length
    PDF-->>API: Buffer

    API-->>Form: 200 · application/pdf · Content-Disposition: attachment
    Form->>Rep: Blob → object URL → invisible download link → click
```

---

## 3. What Chromium actually does here

The one question this tool always raises. Chromium is **not** a browser in this system — it is the
typesetting engine.

```mermaid
flowchart TD
    Q{"Why not just write<br/>the PDF directly?"}
    Q -->|"because a PDF stores<br/>glyphs at absolute x/y,<br/>not paragraphs"| NEED

    NEED["Something must convert<br/><b>flowing content</b> → <b>fixed pages</b>"]

    NEED --> J1["Measure every glyph in Arimo<br/>to know where a line breaks"]
    NEED --> J2["Decide where page 1 ends<br/>and page 2 begins"]
    NEED --> J3["Paint the letterhead PNG<br/>full-bleed behind the text"]
    NEED --> J4["Repeat the letterhead and<br/>reserve its space on EVERY page"]
    NEED --> J5["Keep table rows whole<br/>across a page break"]
    NEED --> J6["Serialise the result as<br/>real PDF text, not an image"]

    J1 --> CR
    J2 --> CR
    J3 --> CR
    J4 --> CR
    J5 --> CR
    J6 --> CR

    CR["🌐 <b>Headless Chromium</b><br/>does all six<br/>via page.pdf()"]

    CR --> OUT["A4 PDF · selectable, searchable text<br/>· brand artwork intact"]

    style CR fill:#111827,color:#fff
    style Q fill:#fffbe6
    style OUT fill:#e6ffed
```

**Which Chromium runs depends on where the code is:**

```mermaid
flowchart LR
    START["renderPdf()"] --> Q{"process.env.VERCEL<br/>set?"}

    Q -->|"No — laptop"| DEV["<b>playwright</b> devDependency<br/>the full Chromium installed by<br/>npx playwright install"]
    Q -->|"Yes — production"| PROD["<b>@sparticuz/chromium</b><br/>Linux build, brotli-compressed,<br/>trimmed to fit a serverless function"]

    DEV --> SAME["Identical rendering API:<br/>launch → newPage → setContent → pdf"]
    PROD --> SAME

    SAME --> WARN["⚠️ This is the only intentional<br/>dev/prod split in the codebase —<br/>local tests never exercise<br/>the serverless path"]

    style PROD fill:#111827,color:#fff
    style WARN fill:#fff0f0
```

**Chromium's lifecycle per request — and the leak it causes:**

```mermaid
flowchart TD
    R1["Request 1"] --> L1["launch() — unpacks ~200 MB<br/>of Chromium into /tmp"]
    L1 --> P1["render"] --> C1["close()"]
    C1 --> D1["leaves ~40 MB of profile<br/>+ 32 MB disk cache behind"]

    D1 --> R2["Request 2 … 6"] --> L2["launch() again<br/>a brand-new browser each time"]
    L2 --> D2["/tmp keeps filling"]

    D2 --> R7["Request 7"] --> FAIL["❌ /tmp full (512 MB cap)<br/>launch fails in ~1.1s<br/>instance stays broken<br/>until Vercel recycles it"]

    style FAIL fill:#fff0f0,stroke:#c00
    style R7 fill:#fff0f0
```

> ⚠️ **Known defect, reproduced 2026-07-27.** The per-request `launch()`/`close()` above is the
> cause of both the sequential failure at ~request 7 and the concurrent-request failures.
> Full diagnosis: `history/prompts/general/0006-diagnose-sequential-render-exhaustion.prompt.md`.
> The fix is to cache one browser per instance and close the *page* instead.

---

## 4. How the HTML is assembled

Nine small modules, each with one job, composing a single string. All pure functions except the
two that read from disk.

```mermaid
flowchart TD
    IN["validated input<br/>{recipient, roles, company, date, serviceIds[]}"]

    IN --> VM["<b>view-model.ts</b><br/>resolve ids → catalog rows,<br/>split role lines"]
    CAT["<b>catalog.ts</b><br/>17 services:<br/>name + challenge + benefit"] --> VM

    VM --> TPL["<b>template.ts</b><br/>assembles the document"]

    COPY["<b>copy.ts</b><br/>fixed prose: title, intro,<br/>Why Whaz, Next Step"] --> TPL
    ESC["<b>escape.ts</b><br/>escapes &amp; &lt; &gt; quotes<br/>at every interpolation"] --> TPL

    FONTS["<b>fonts.ts</b><br/>reads 2 woff2 files →<br/>base64 @font-face CSS"] --> TPL
    CHR["<b>chrome.ts</b><br/>all document CSS:<br/>page setup, type, table"] --> TPL
    BRAND["<b>brand.ts</b><br/>reads letterhead.png →<br/>base64 data URI"] --> CHR
    GEO["<b>geometry.ts</b><br/>margins + table metrics,<br/>measured in mm from<br/>the approved reference PDF"] --> CHR

    TPL --> OUT["<b>one HTML string</b><br/>zero external references —<br/>fonts and artwork are<br/>embedded as base64"]

    OUT --> CR["🌐 Chromium"]

    style CR fill:#111827,color:#fff
    style OUT fill:#e6ffed
    style ESC fill:#fff0f0
```

> `fonts.ts` and `brand.ts` are the only modules that touch the filesystem. Both memoise in module
> scope, so the base64 encode is paid once per warm container rather than per request.

---

## 5. Why the letterhead needs two separate mechanisms

The single least obvious part of the design. Remove either half and multi-page output breaks
silently — the text slides underneath the header band on page 2.

```mermaid
flowchart TD
    GOAL["Goal: letterhead on EVERY page,<br/>with body text clear of it"]

    GOAL --> M1
    GOAL --> M2

    subgraph M1["Mechanism 1 — PAINT"]
        A1[".wz-letterhead<br/>position: fixed"]
        A2["Chromium repeats fixed<br/>elements on every printed page"]
        A3["✅ artwork appears on all pages<br/>❌ reserves no space at all"]
        A1 --> A2 --> A3
    end

    subgraph M2["Mechanism 2 — RESERVE"]
        B1["table.wz-doc with<br/>EMPTY thead and tfoot"]
        B2["Chromium repeats thead/tfoot<br/>per page and flows content<br/>between them"]
        B3["✅ space reserved on all pages<br/>❌ paints nothing"]
        B1 --> B2 --> B3
    end

    A3 --> WIN["Both together = correct<br/>multi-page document"]
    B3 --> WIN

    style WIN fill:#e6ffed
```

Two simpler approaches were built and both failed:

```mermaid
flowchart LR
    T1["body padding"] -->|"applies to page 1 only —<br/>page 2 text hides<br/>under the header"| X1["❌"]
    T2["@page margins"] -->|"breaks position:fixed<br/>outright"| X2["❌"]

    style X1 fill:#fff0f0
    style X2 fill:#fff0f0
```

---

## 6. Determinism — why the same input gives identical bytes

```mermaid
flowchart TD
    P["Chromium finishes page.pdf()"]
    P --> BAD["PDF contains<br/>/CreationDate (D:20260727<b>143052</b>)<br/>= wall-clock render time"]
    BAD --> PROB["❌ two renders one second apart<br/>produce different files"]

    PROB --> FIX["<b>pinTimestamps()</b><br/>rewrite both dates to<br/>the rep's proposal date"]

    FIX --> RULE["⚠️ replacement MUST be the<br/>same byte length — a PDF's xref<br/>table stores absolute byte offsets,<br/>so a length change corrupts the file"]

    RULE --> GOOD["✅ identical input<br/>⇒ byte-identical PDF<br/>(verified by sha256 in production)"]

    style GOOD fill:#e6ffed
    style PROB fill:#fff0f0
    style RULE fill:#fffbe6
```

---

## 7. Error paths

Nothing partial is ever sent. The document either renders completely or the rep gets a message.

```mermaid
flowchart TD
    REQ["POST /api/generate"] --> J{"valid JSON?"}
    J -->|no| E400["<b>400</b> validation_failed<br/>_form: body must be valid JSON"]

    J -->|yes| Z{"passes zod schema?"}
    Z -->|no| E400b["<b>400</b> + one message per bad field,<br/>all fields reported at once"]

    Z -->|yes| U{"all service ids<br/>known?"}
    U -->|no| E400c["<b>400</b> — unknown ids are REJECTED,<br/>never silently dropped: a dropped<br/>service means a proposal the rep<br/>did not intend to send"]

    U -->|yes| D{"any duplicate ids?"}
    D -->|yes| E400d["<b>400</b> duplicate service"]

    D -->|no| R{"Chromium render<br/>succeeds?"}
    R -->|no| E500["<b>500</b> generation_failed · retryable: true<br/>stack trace logged server-side,<br/>never shown to the rep"]
    R -->|yes| OK["<b>200</b> application/pdf<br/>Content-Disposition: attachment<br/>Cache-Control: no-store"]

    style OK fill:#e6ffed
    style E500 fill:#fff0f0
```

---

## 8. Two fields that are collected but never printed

A recurring source of confusion when reading the form.

```mermaid
flowchart LR
    CC["clientCompany"] -->|"slugified"| FN["filename:<br/>proposal-<b>acme-corp</b>-2026-07-27.pdf"]
    PD["proposalDate"] -->|"pins PDF metadata"| TS["/CreationDate + /ModDate<br/>⇒ makes output deterministic"]

    NOTE["Neither appears anywhere<br/>on the page — the approved<br/>reference document shows<br/>no company line and no date"]

    FN -.- NOTE
    TS -.- NOTE

    style NOTE fill:#fffbe6
```

---

## Module reference

| File | Job | Pure? |
|---|---|---|
| `components/ProposalForm.tsx` | Form state, client-side validation, triggers download | — |
| `app/api/generate/route.ts` | Validation gate + orchestration | — |
| `lib/schema.ts` | zod schema shared by client and server | ✅ |
| `lib/view-model.ts` | Input → resolved catalog rows in canonical order | ✅ |
| `lib/catalog.ts` | The 17 services and their table copy | ✅ |
| `lib/copy.ts` | Fixed document prose | ✅ |
| `lib/escape.ts` | The single injection boundary | ✅ |
| `lib/template.ts` | Assembles the HTML string | ✅ |
| `lib/chrome.ts` | All document CSS | ✅ |
| `lib/geometry.ts` | Margins and table metrics in mm | ✅ |
| `lib/brand.ts` | letterhead.png → base64 | reads disk |
| `lib/fonts.ts` | woff2 → base64 @font-face | reads disk |
| `lib/pdf.ts` | Chromium launch, render, timestamp pinning | — |
| `lib/filename.ts` | Download filename slug | ✅ |

Setup, scripts and troubleshooting: `docs/DEVELOPMENT.md`.
Why the letterhead is a raster rather than CSS: `history/adr/` (ADR-0001).
