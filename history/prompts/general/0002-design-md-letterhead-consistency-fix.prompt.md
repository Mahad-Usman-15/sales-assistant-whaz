---
id: 0002
title: Design.md Letterhead Consistency Fix
stage: general
date: 2026-07-17
surface: agent
model: claude-sonnet-5
feature: none
branch: master
user: Mahad Usman
command: none
labels: [design-system, consistency, letterhead, documentation]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - design.md
tests:
 - none
---

## Prompt

view @docs/reference-letter-head.pdf  and @docs/letterhead-skeleton.jpeg and match it against the design.md.If any inconsistency is triggered.Fit it

## Response snapshot

Re-examined the rendered `docs/letterhead-skeleton.jpeg` (the PDF still can't be rasterized in this environment — `pdftoppm`/poppler-utils isn't installed) against `design.md`. Found two gaps: (1) `design.md`'s Accent & Highlight Colors section prescribes a gold/yellow accent (`#FFD700`/`#F3C623`) that is never actually used anywhere on the letterhead — the letterhead is strictly monochrome (dark gradient + white + muted gray); (2) `design.md`'s Visual Assets & Layout Strategy section only documented social-carousel layout rules and had no entry at all for the letterhead/proposal-document artifact, despite it being the asset the whole MVP is built around. Fixed both: added a note on the gold-accent entry clarifying it's intentionally absent from the letterhead, and added a new §5 "Letterhead / Proposal Document Application" documenting the header/footer gradient bands with diagonal cuts, the wordmark/label/contact zones and their divider rules, the watermark graphic, the footer dot-grid texture, and the palette-usage confirmation — with a cross-reference to `projectplan.md` §9's image-asset implementation guidance.

## Outcome

- ✅ Impact: `design.md` now accurately documents the letterhead as it actually exists, closing the gap where the design system said nothing about the artifact the proposal generator MVP depends on, and explicitly flagging that the documented gold accent color is not part of the letterhead's palette.
- 🧪 Tests: none (documentation-only change)
- 📁 Files: `design.md` (edited — accent-color note + new §5 section)
- 🔁 Next prompts: When implementation starts, use `design.md` §5 as the spec for the header/footer image-export step (the first task flagged in `projectplan.md`'s follow-ups); re-verify this section once the two PNG chrome assets are actually exported, in case exporting surfaces details not visible in the flattened JPEG.
- 🧠 Reflection: The inconsistency wasn't in the letterhead (ground truth) — it was in the documentation failing to describe it. Treating the flattened brand asset as authoritative and back-filling the design doc, rather than trying to "correct" the letterhead toward the doc, was the right direction given `CLAUDE.md`'s explicit note that these brand assets are ground truth.

## Evaluation notes (flywheel)

- Failure modes observed: Still unable to rasterize `docs/reference-letter-head.pdf` in this environment (missing poppler-utils/`pdftoppm`); relied entirely on the JPEG skeleton, which is likely a lower-fidelity flattened export of the same design. Analysis of exact hex values from the image was qualitative (no color-picker tool available), not pixel-verified.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): If poppler-utils becomes available in this environment, re-render `reference-letter-head.pdf` and diff it against the JPEG skeleton to confirm they describe the same design before treating either as sole ground truth.
