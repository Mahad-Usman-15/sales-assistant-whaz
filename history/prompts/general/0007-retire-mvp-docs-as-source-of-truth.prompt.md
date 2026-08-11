---
id: 0007
title: Retire MVP Docs As Source Of Truth
stage: general
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: null
branch: 002-rbac-dashboard
user: Mahad Usman
command: null
labels: [governance, documentation, source-of-truth, constitution, patch-bump, mvp-retirement]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - projectplan.md
 - problemstatement
 - .specify/memory/constitution.md
 - CLAUDE.md
 - README.md
 - docs/DEVELOPMENT.md
 - specs/002-rbac-dashboard/spec.md
 - specs/002-rbac-dashboard/checklists/requirements.md
tests:
 - none (documentation and governance change; no code touched)
---

## Prompt

# THE MVP related files i.e @problemstatement etc should not be the source of truth no more.The new features will be added without concerning these files

## Response snapshot

Demoted `projectplan.md` and `problemstatement` from authority to historical record, and re-anchored
every artifact that was deriving scope from them.

**Why this needed more than a note.** Four separate documents cited `projectplan.md` as an authority,
and one of those was `CLAUDE.md`'s very first Project Overview line — *"`projectplan.md` at the repo
root is the source of truth for the business problem, solution evaluation, and the approved MVP
direction — read it before proposing implementation work."* That line was also independently stale in
a second way: it claimed the project was "currently in the planning stage: there is no application
code yet," which has been false since feature 001 shipped. Leaving the demotion as a verbal
instruction would have left that sentence instructing every future session to do the opposite.

**What was done:**

- **Banner at the source.** Both files now open with a `⚠️ HISTORICAL RECORD — NOT THE SOURCE OF
  TRUTH` block naming what is stale (§8/§9/§10's "no login, no database, no stored history," the
  since-falsified editable-vector-letterhead assumption, the service-count off-by-one) and a table
  pointing at what is authoritative instead. This is the fix that survives someone opening the file
  directly, which a note elsewhere would not. `problemstatement` additionally turns out to be the
  original *planning prompt* that produced `projectplan.md` — doubly historical, and labelled as such.
- **Constitution PATCH → v4.0.1.** It cited `projectplan.md` in three rationales and one Technology
  Constraint. Those citations were **kept**, not deleted — they record *why* the rules exist, and
  stripping the provenance would make principles look arbitrary — but Governance gained an explicit
  **"Source of truth"** paragraph re-labelling them as evidence of origin rather than authority a
  rule defers to, and stating that new features MUST NOT be assessed against the MVP's scope. Also
  states that the staleness "is not a defect to be repaired: they are a record of what was decided,
  and they are accurate as that." PATCH is correct here — no principle, constraint, or requirement
  changed, only the standing of citations.
- **`CLAUDE.md`** Project Overview rewritten: current status, the demotion warning, and a five-row
  authority table. Two downstream references de-authoritised (the catalog off-by-one now says
  `tools.md` is authoritative and `projectplan.md` is simply wrong; the letterhead note now says
  `projectplan.md` still assumes an editable source and is not maintained).
- **`specs/002-rbac-dashboard/spec.md`** — the Target Audience section written minutes earlier
  derived its constraints from `projectplan.md` §1/§3/§11. Rewritten so the spec **owns** those
  facts: the audience is non-technical, the 2-minute and >80%-adoption targets "carry over from the
  original tool and this feature adopts them as its own." Added an explicit *On provenance* note that
  where the historical files and this spec disagree, the spec and constitution win.
- **`README.md`, `docs/DEVELOPMENT.md`** — document-index rows relabelled.

**One thing deliberately not done:** the facts inside those files were not deleted or rewritten. The
instruction was about *authority*, not accuracy — the sales team really is non-technical, the 70%
failure rate really was the founding problem. Those remain true and are now restated where they are
used, rather than fetched from a file that no longer governs.

## Outcome

- ✅ Impact: `projectplan.md` and `problemstatement` can no longer be mistaken for current scope, by
  a human or by a future session reading `CLAUDE.md`. New features are bound by the constitution and
  their own spec only. Constitution at **v4.0.1**.
- 🧪 Tests: None — documentation and governance only; no application code touched.
- 📁 Files: `projectplan.md`, `problemstatement` (banners); `.specify/memory/constitution.md`
  (v4.0.1 + Governance "Source of truth"); `CLAUDE.md` (Project Overview rewritten, version refs,
  two de-authoritised references); `README.md`; `docs/DEVELOPMENT.md`;
  `specs/002-rbac-dashboard/spec.md` + its checklist.
- 🔁 Next prompts: `/sp.plan` for `002-rbac-dashboard`. ADR-0002 still outstanding as a suggestion.
  Phase 0 (the sustained-generation defect) remains the gate before implementation.
- 🧠 Reflection: The instruction arrived roughly ten minutes after I had written a spec section that
  leaned on `projectplan.md` for three separate claims — which is a decent argument that the demotion
  was overdue rather than premature. The general lesson: "X is no longer the source of truth" is
  never satisfied by agreeing to it, because the pointers live in files that outlive the
  conversation. Banner the source, re-anchor the citations, and state the authority explicitly in the
  document that binds.

## Evaluation notes (flywheel)

- Failure modes observed: I had cited `projectplan.md` as authority in a spec written earlier in this
  same session. Caught and corrected here rather than left to `/sp.plan`. Root cause worth noting —
  the file *was* authoritative when `CLAUDE.md` was written, and I inherited that framing without
  re-testing it against the fact that the MVP had shipped.
- Graders run and results (PASS/FAIL): Authority-citation sweep PASS (all live `projectplan.md` /
  `problemstatement` references in binding documents are now labelled historical; remaining
  references sit in `history/` PHRs and feature-001 artifacts, which are themselves historical and
  correctly left alone). Version coherence PASS (v4.0.1 in the constitution footer, both Sync Impact
  Reports, and all five `CLAUDE.md` references). Banner reachability PASS (both files banner at line
  1, visible before any content).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): at `/sp.plan`, confirm the plan cites only the
  constitution and `spec.md` for scope. Any appeal to `projectplan.md` for what is in or out would
  mean the demotion did not fully take.
