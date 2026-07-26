---
id: 0003
title: Amend Principle II To Approved Raster
stage: constitution
date: 2026-07-26
surface: agent
model: claude-opus-5
feature: null
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.constitution
labels: [constitution, amendment, major-bump, brand-fidelity, principle-ii, verification]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md
 - CLAUDE.md
 - README.md
 - specs/001-proposal-pdf-generator/plan.md
 - specs/001-proposal-pdf-generator/research.md
 - specs/001-proposal-pdf-generator/spec.md
 - specs/001-proposal-pdf-generator/tasks.md
tests:
 - none (documentation-only change; no code touched)
---

## Prompt

/sp.constitution the changes that took place,align it properly

## Response snapshot

Amended the constitution **2.0.0 → 3.0.0 (MAJOR)** to ratify the letterhead work completed earlier in
this session, which had shipped against a rule the constitution still forbade.

**Why MAJOR rather than MINOR.** Principle II's normative rule inverts for the second time. v2.0.0
required the chrome be "built in HTML/CSS/SVG rather than shipped as raster assets" and that reference
rasters "MUST NOT be bundled"; v3.0.0 requires the opposite. An implementation compliant with v2.0.0
violates v3.0.0 and vice versa — the document's own definition of backward-incompatible. Two v2.0.0
binding consequences were also **withdrawn outright** (chrome text MUST be selectable; chrome MUST
stay sharp at any zoom), which are removals, not clarifications. Both facts independently force MAJOR.

**What changed in Principle II.** The mandate is now: the chrome MUST be the approved artwork itself —
the composite extracted losslessly from `docs/reference-letter-head.pdf` and committed as
`assets/brand/letterhead.png` — and MUST NOT be reconstructed in code. New binding consequences: the
artwork's native ~127 DPI *is* the fidelity bar (regenerating or upscaling is FORBIDDEN); exactly one
brand raster may be bundled; body text must stay selectable even though the letterhead is raster.

**The verification rule was strengthened, not relaxed** — this is the part I'd flag as the most
load-bearing edit. v2.0.0 made side-by-side visual comparison a required review step. v3.0.0 replaces
it with a **numeric tolerance**: every fixed element's baseline must agree with the reference to within
0.5mm, and a visual look "MUST NOT be the basis of a fidelity claim." The evidence is from this
session: a visual review passed a 5.1mm misplacement that baseline extraction caught immediately.

Three further edits encode failures observed while doing the work, rather than restating the outcome:

- **Code Quality** — an artifact MUST be inspected in full before being summarized. `reference-letter-head.pdf`
  was described as a letterhead swatch because only its image layer was ever examined, and that wrong
  summary propagated into `CLAUDE.md` and shaped the plan.
- **Workflow** — a verification claim MUST state the environment that produced it. This project has now
  been misled twice by the same gap: the integration suite runs against a production build (so cannot
  evidence dev-mode behaviour), and its `reuseExistingServer` setting means it silently tests whatever
  occupies port 3000 rather than the build it names.
- **Governance** — implementation MUST NOT precede its amendment; where it has, the gap MUST be recorded
  explicitly until the amendment lands. Principle II reached exactly that state on 2026-07-26.

Also added a note under Principle I clarifying that AI-*generated static artwork* does not violate
"zero AI in the render path" — the prohibition is on generation at render time, not on asset
provenance. Without it, v3.0.0's mandate to bundle AI-generated artwork reads as self-contradictory.

Propagated to every dependent artifact and verified no stale current-state claims remain: `CLAUDE.md`
(4 version refs + the now-retired "code is ahead of the constitution" warning), `README.md`
(architecture diagram, zero-network rationale, and the whole "letterhead is code, not an image"
section rewritten), `plan.md` (Constitution Check Principle II row, amendment history, Technology
Constraints line for Arimo/static fonts), `research.md` (R1 marked SUPERSEDED with the two overturning
facts; R2 marked RESOLVED — the watermark ships), `spec.md`, `tasks.md` (T033 withdrawn, T034
redefined as the numeric check, T058 reworded since one raster is now bundled by design). Confirmed by
grep that the four `.specify/templates/*` and all `.claude/commands/sp.*.md` contain no hardcoded
principle text, so the Sync Impact Report's "no edit needed" claims are checked rather than assumed.

## Outcome

- ✅ Impact: Constitution now matches shipped reality. Principle II's mandate inverted (CSS/SVG →
  embedded approved raster), two binding consequences withdrawn, verification strengthened from visual
  to numeric. The "code ahead of constitution" gap opened earlier today is closed.
- 🧪 Tests: None run — documentation-only change, no code touched. The claims it ratifies were verified
  earlier in this session (83 unit + 13 integration against a production build, baselines ≤0.11mm).
- 📁 Files: `.specify/memory/constitution.md` (rewritten, new Sync Impact Report), `CLAUDE.md`,
  `README.md`, and all four `specs/001-proposal-pdf-generator/` artifacts.
- 🔁 Next prompts: User sign-off still wanted on the 17 client-facing challenge/benefit lines. T059
  (production timing) and T062 (Vercel deploy) remain. Worth considering an ADR for the three-version
  history of Principle II — the *pattern* (each inversion caused by a falsified premise, never by
  convenience) is more reusable than any single version.
- 🧠 Reflection: Principle II has now been wrong three times in the same direction — each version
  over-committed to a mechanism on the strength of an unverified premise about the source artwork.
  v1.0.0 assumed a canonical design file; v2.0.0 assumed no usable raster existed; both were disproven
  by looking harder at files already in the repo. The procedural rule (amend, never silently
  reinterpret) has held up well and is why the history is legible at all.

## Evaluation notes (flywheel)

- Failure modes observed: (1) Ratifying-after-the-fact — the code shipped against a forbidden rule and
  the constitution had to catch up; the new Governance clause makes that gap declarable rather than
  silent. (2) The Sync Impact Report format invites asserting templates are fine without opening them;
  I grepped instead. (3) Marking `research.md` R1 "superseded" risked erasing the reasoning, so the
  audit and alternatives were retained beneath the notice — a decision record should show how a
  conclusion was reached, not only the current answer.
- Graders run and results (PASS/FAIL): Version/date coherence PASS (3.0.0, ISO dates, ratification
  preserved). No unresolved bracket tokens PASS. Stale-version sweep PASS (all remaining v2.0.0
  mentions are deliberate historical citations). Template hardcoding sweep PASS (zero hits).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add a `/sp.analyze` check that greps for the *current*
  constitution version string across `specs/**` and `CLAUDE.md` and flags files still citing an older
  one — the propagation step is currently manual and is exactly where drift would reappear.
