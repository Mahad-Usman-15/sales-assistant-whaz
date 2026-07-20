# Phase 1 Data Model: Proposal Letterhead PDF Generator

**Feature**: `001-proposal-pdf-generator` | **Date**: 2026-07-19

No database exists in v1 (Constitution III). These are in-memory request/compile-time shapes only — nothing here is persisted.

---

## 1. `ServiceCatalogItem` — reference data (compile-time constant)

Transcribed verbatim from `tools.md` into `lib/catalog.ts`. Read-only; never mutated at runtime.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable slug, derived once from the name (e.g. `clarity-map`). Used as the checkbox value and the wire identifier. |
| `name` | `string` | Exact display name from `tools.md` (e.g. `Clarity Map`). |
| `description` | `string` | Exact one-line description from `tools.md`, verbatim — no paraphrasing (FR-002). |
| `tier` | `'free' \| 'paid'` | Which `tools.md` section it came from. |

**Invariants**

- `id` is unique across the catalog.
- 17 items total: 9 `free`, 8 `paid` (see research R8 — the "7 paid" figure in `projectplan.md`/`CLAUDE.md` is stale).
- `name` and `description` must match `tools.md` character-for-character — enforced by `tests/unit/catalog.test.ts`.
- Catalog order is fixed (free section in file order, then paid in file order) so rendering is deterministic (FR-007).
- No price field exists, by decision — v1 carries no monetary amounts anywhere (FR-015).

---

## 2. `ProposalInput` — the request payload

The rep's submitted form. Validated by the shared Zod schema in `lib/schema.ts`; exists only for the life of one request (FR-011).

| Field | Type | Required | Constraints | Source |
|---|---|---|---|---|
| `recipientName` | `string` | ✅ | trimmed, 1–120 chars | FR-001 |
| `clientCompany` | `string` | ✅ | trimmed, 1–160 chars | FR-001 |
| `proposalTitle` | `string` | ✅ | trimmed, 1–200 chars | FR-001 |
| `preparedBy` | `string` | ✅ | trimmed, 1–120 chars | FR-001 |
| `proposalDate` | `string` | ✅ | `YYYY-MM-DD`; client defaults to today | FR-001 |
| `selectedServiceIds` | `string[]` | ➖ | defaults `[]`; each must exist in the catalog; duplicates rejected | FR-002 |
| `notes` | `string` | ➖ | defaults `''`; max 5000 chars; multi-line allowed | FR-003 |

**Validation rules**

- Required strings reject empty/whitespace-only values, and the error names the specific field in plain language (FR-009).
- `selectedServiceIds` is validated against the catalog; an unknown id is a `400`, never silently dropped — a silent drop would produce a proposal the rep did not intend.
- `notes` preserves internal line breaks; they become `<br>` **after** escaping (research R6).
- The server re-validates independently of the client — the client is not a trust boundary.
- No field accepts HTML; all values are escaped at interpolation (FR-008).

**Explicitly absent**: any price, quote, or currency field (FR-015); recipient email/phone (confirmed out — Clarifications 2026-07-17); any user/account identifier (Constitution III).

---

## 3. `ProposalViewModel` — the template's input

Derived from `ProposalInput` immediately before rendering. Exists so `lib/template.ts` is a pure function of already-resolved values, keeping it trivially unit-testable.

| Field | Type | Derivation |
|---|---|---|
| `recipientName`, `clientCompany`, `proposalTitle`, `preparedBy` | `string` | Passed through from input (escaped at interpolation). |
| `formattedDate` | `string` | `proposalDate` rendered for display (e.g. `19 July 2026`). Formatting is fixed and locale-independent so output stays deterministic (FR-007). |
| `services` | `ServiceCatalogItem[]` | `selectedServiceIds` resolved against the catalog, re-sorted into canonical catalog order — not the order the rep clicked, which would make output non-deterministic. |
| `notesHtml` | `string` | `escapeHtml(notes)` with `\n` → `<br>`. Empty string when no notes. |
| `hasServices` / `hasNotes` | `boolean` | Drive section omission — empty optional sections are dropped entirely rather than rendered as blank headings (FR-014, Edge Cases). |

---

## 4. `GeneratedProposal` — the response

Not an object in code so much as the response contract: a PDF byte stream. Never written to disk or stored (Constitution III).

| Aspect | Value |
|---|---|
| Format | PDF 1.4+, A4 portrait |
| Body structure | Salutation → intro → services → notes → closing → signature block (FR-014) |
| Chrome | Header and footer bands on **every** page (FR-012) |
| Filename | `proposal-<client-company-slug>-<YYYY-MM-DD>.pdf` |
| Delivery | `Content-Type: application/pdf`, `Content-Disposition: attachment` |
| Persistence | None |

---

## 5. Lifecycle

```text
Rep fills form
      │  client-side validation (shared schema) ── invalid ─→ inline field errors (FR-009)
      ▼
POST /api/generate  { ProposalInput }
      │  server re-validation ── invalid ─→ 400 + field-level errors
      ▼
ProposalInput ─→ ProposalViewModel ─→ HTML string (escaped) ─→ Chromium ─→ PDF bytes
      │                                                                      │
      └── any failure ─→ 5xx + retryable message, no partial file (FR-010) ──┘
                                                                             ▼
                                                              Browser download; nothing retained
```

**No state transitions exist** — there is no stored entity to transition. Each request is independent, which is what makes concurrent submissions safe by construction (Edge Cases: rapid repeat submissions).
