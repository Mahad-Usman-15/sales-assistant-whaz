# API Contract: `POST /api/generate`

**Feature**: `001-proposal-pdf-generator` | **Date**: 2026-07-19

The feature's only endpoint. Node.js runtime (Chromium requires it); `maxDuration = 60`.

---

## Request

```http
POST /api/generate
Content-Type: application/json
```

```json
{
  "recipientName": "Ayesha Khan",
  "clientCompany": "Northwind Consulting",
  "proposalTitle": "Growth Partnership Proposal",
  "preparedBy": "Mahad Usman",
  "proposalDate": "2026-07-19",
  "selectedServiceIds": ["clarity-map", "growth-engine"],
  "notes": "Following our call on Tuesday.\n\nWe can start next month."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `recipientName` | string | ✅ | non-empty after trim, ≤120 |
| `clientCompany` | string | ✅ | non-empty after trim, ≤160 |
| `proposalTitle` | string | ✅ | non-empty after trim, ≤200 |
| `preparedBy` | string | ✅ | non-empty after trim, ≤120 |
| `proposalDate` | string | ✅ | `YYYY-MM-DD` |
| `selectedServiceIds` | string[] | ➖ | default `[]`; known catalog ids; no duplicates |
| `notes` | string | ➖ | default `''`; ≤5000 chars |

No authentication — the MVP is unauthenticated by design (Constitution III). No request body field carries pricing (FR-015).

---

## Responses

### `200 OK` — PDF stream

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="proposal-northwind-consulting-2026-07-19.pdf"
Cache-Control: no-store
```

Body: raw PDF bytes, beginning `%PDF-`.

### `400 Bad Request` — validation failure (FR-009)

Returned when required fields are missing/blank, a field exceeds its limit, the date is malformed, or a service id is unknown. Every failing field is reported at once, so the rep fixes them in one pass.

```json
{
  "error": "validation_failed",
  "message": "Some details are missing or invalid.",
  "fields": {
    "recipientName": "Recipient name is required.",
    "proposalDate": "Enter a valid date."
  }
}
```

### `500 Internal Server Error` — render failure (FR-010)

Returned when Chromium fails to launch or the print step errors. The response is always JSON — never a truncated or partial PDF.

```json
{
  "error": "generation_failed",
  "message": "We couldn't generate the proposal. Please try again.",
  "retryable": true
}
```

### `405 Method Not Allowed`

Any method other than `POST`.

---

## Behavioural guarantees

| Guarantee | Source |
|---|---|
| Identical request bodies produce byte-comparable PDFs (no timestamps, no randomness, no reordering) | FR-007, SC-005 |
| All response content derives solely from the request body, the catalog, and the fixed template — no AI, no inference | FR-006, Constitution I |
| Rep-supplied text is escaped before HTML interpolation; markup in input renders as literal characters | FR-008 |
| The endpoint performs no network calls while rendering — fonts and images are inlined | Constitution Security |
| Nothing from the request is persisted, logged verbatim, or cached | FR-011, Constitution III |
| Completes within 30 s worst case, including cold start | FR-016, SC-008 |
| Multi-page proposals carry the letterhead chrome on every page | FR-012 |
| Concurrent requests never share state; each launches and disposes its own browser context | Edge Cases |

---

## Contract tests (`tests/integration/generate.spec.ts`)

| # | Case | Expected |
|---|---|---|
| 1 | Valid full payload | `200`, `application/pdf`, body starts `%PDF-` |
| 2 | Valid payload, no services, no notes | `200`; those sections absent from the PDF text |
| 3 | Missing `recipientName` | `400`, `fields.recipientName` present |
| 4 | Multiple invalid fields | `400`, all offending fields reported together |
| 5 | Unknown service id | `400` — not silently dropped |
| 6 | `notes` containing `<script>alert(1)</script>` | `200`; the PDF shows that text literally; no markup effect |
| 7 | Same payload submitted twice | Both `200`; outputs identical (determinism) |
| 8 | `notes` long enough to overflow one page | `200`; PDF has >1 page, chrome on each |
| 9 | `GET /api/generate` | `405` |
