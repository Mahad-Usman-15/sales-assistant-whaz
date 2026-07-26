---
id: 0009
title: Record Letterhead Chrome Strategy ADR
stage: misc
date: 2026-07-26
surface: agent
model: claude-opus-5
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.adr
labels: [adr, architecture, letterhead, brand-fidelity, decision-record]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: history/adr/0001-letterhead-chrome-strategy.md
  pr: null
files:
 - history/adr/0001-letterhead-chrome-strategy.md
 - specs/001-proposal-pdf-generator/plan.md
 - CLAUDE.md
tests:
 - none (documentation-only change; no code touched)
---

## Prompt

/sp.adr letterhead-chrome-strategy.

## Response snapshot

Created **ADR-0001: Letterhead Chrome Strategy** — the first ADR in this repo (`history/adr/` did not
exist). No `create-adr.sh`/`.ps1` exists either, only `.specify/templates/adr-template.md`, so it was
hand-authored against that template, the same gap already documented for PHRs.

**Significance test — passes all three**, and unusually strongly on the third: it dictates the render
layer, font strategy, and verification method; four alternatives were considered, **two of which were
actually built or attempted**; and it has already been revisited twice, each reversal forcing a MAJOR
constitution amendment.

Scoped as one **cluster**, not atomic choices — chrome source, delivery (inlined data URI), page
repetition, geometry derivation, body font, verification method, and the table-fit copy guard all
change together. Splitting them would produce exactly the over-granular ADRs the command warns against:
the Arimo decision, for instance, exists *because* the reference is Helvetica-set, and would be
meaningless on its own.

The most valuable content is the **alternatives section**, because three of the four are evidenced
rather than hypothetical:

- **A — pre-exported images from the canonical design file** (constitution v1.0.0): rejected as
  *impossible*, not inferior. No such file exists; the letterhead is Gemini-generated.
- **B — CSS/SVG reconstruction** (v2.0.0): **built and shipped, then rejected by the salesperson.**
  Recorded with its genuine pros, since it was a reasonable decision on the information available —
  its flaw was optimising for resolution independence, which no stakeholder ever requested.
- **C — generative upscale**: attempted at the user's request with three checks defined in advance;
  failed all three (1536×1024 canvas, "Better Decisions**,** Real Growth.", band colour
  `(2,1,9)`→`(148,148,152)`, alpha 96.29% destroyed).
- **D — auto-trace/vectorise**: rejected without implementation, with reasoning — gradients, dot-grid
  texture and antialiased type are what tracers reproduce worst, so it would yield a *third* rendition
  and reintroduce B's core failure.

Documented the downsides honestly rather than presenting the decision as free: locked to ~127 DPI;
chrome contact text is no longer selectable or screen-reader accessible (a real regression against B,
and why two v2.0.0 requirements had to be *withdrawn*); ~576KB of base64 per render and ~530KB PDFs;
the artwork is unmaintainable without a new approved asset; margins are empirically tuned against
Chromium's pixel rounding so a browser upgrade could shift baselines; and client-facing catalog copy
is now constrained by column width.

While linking the ADR I found `plan.md`'s summary paragraphs still describing the **old** approach
(seven form fields, "chrome built in HTML/CSS/SVG … Montserrat Black wordmark … sharp at any
resolution") — directly contradicting the constitution-v3.0.0 line immediately below them, which the
previous propagation pass had updated. Fixed both paragraphs.

Did **not** create ADRs for other candidate clusters (rendering stack; stateless request-scoped
architecture; validation/escaping boundary). They may qualify, but the user named one title and
inventing more would widen scope unasked — flagged as offers instead.

## Outcome

- ✅ Impact: The three-version history of Principle II is now recorded in one place, with the rejected
  alternatives and their evidence, so the next person to propose "let's just rebuild it in CSS" or
  "let's upscale it" finds the measured reason it failed instead of relitigating it.
- 🧪 Tests: None run — documentation-only, no code touched. The measurements cited were verified
  earlier this session (baselines ≤0.11mm, 83 unit + 13 integration).
- 📁 Files: `history/adr/0001-letterhead-chrome-strategy.md` (new, plus the `history/adr/` directory),
  `specs/001-proposal-pdf-generator/plan.md` (stale summary corrected + ADR link), `CLAUDE.md`.
- 🔁 Next prompts: Offered but not created — ADRs for the rendering stack (`playwright-core` +
  `@sparticuz/chromium` + Node-runtime-only) and for the stateless request-scoped architecture. User
  sign-off still wanted on the 17 challenge/benefit lines. T059 and T062 remain.
- 🧠 Reflection: The ADR is worth more for Alternative B than for the decision itself. B was correct
  on the evidence available and still got rejected by the user of the product — a decision record that
  only listed the winner would lose that, and the lesson (fidelity to what the client approved beats
  a technically superior property nobody asked for) is the transferable part.

## Evaluation notes (flywheel)

- Failure modes observed: (1) Propagation drift — `plan.md`'s prose summary escaped the earlier
  version sweep because that pass grepped for `2.0.0` and this text named no version, only the old
  approach. Grepping for a version string does not find stale *descriptions*. (2) Temptation to
  document only the accepted option; the rejected-but-built alternative carries most of the value.
- Graders run and results (PASS/FAIL): Clustered not atomic PASS (7 components, one decision).
  ≥1 alternative with rationale PASS (4, three evidenced). Pros **and** cons for chosen and
  alternatives PASS (6 negatives recorded). Concise but sufficient PASS. No unresolved `{{}}`
  placeholders PASS.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): When propagating a constitution amendment, sweep for stale
  *descriptions* (e.g. "CSS/SVG", "Montserrat", "selectable text") in addition to version strings — the
  version grep gave false confidence that propagation was complete.
