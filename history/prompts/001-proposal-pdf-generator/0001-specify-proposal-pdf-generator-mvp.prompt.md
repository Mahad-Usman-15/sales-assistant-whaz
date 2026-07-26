---
id: 0001
title: Specify Proposal PDF Generator MVP
stage: spec
date: 2026-07-17
surface: agent
model: claude-opus-4-8
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /sp.specify
labels: [spec, mvp, proposal-generator, letterhead, deterministic-render]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-proposal-pdf-generator/spec.md
 - specs/001-proposal-pdf-generator/checklists/requirements.md
tests:
 - none
---

## Prompt

/sp.specify

(Invoked with an empty feature description. On clarification, the user chose scope = "Full MVP generator": one spec covering the whole approved MVP — input form + service selection from tools.md + deterministic letterhead PDF render + download, stateless with no DB/auth — matching projectplan.md §8 scope-in.)

## Response snapshot

`/sp.specify` arrived with no description, so I did not guess scope — asked the user (single AskUserQuestion) whether the first feature should cover the full MVP, just the render pipeline, or just the form. User picked **Full MVP generator**. Checked all three sources (remote branches, local branches, specs dirs) for an existing `proposal-pdf-generator` short-name — none — so this is feature 001. Ran `create-new-feature.ps1 -Number 1 -ShortName proposal-pdf-generator`; it created and checked out branch `001-proposal-pdf-generator` and copied the spec template, but errored on a Windows PowerShell 5.1 `Join-Path` three-arg call for the prompts dir — created `history/prompts/001-proposal-pdf-generator/` manually to recover. Read `tools.md`, `whaz.md`, `projectplan.md`, and the spec template, then wrote a full business spec: 3 prioritized, independently-testable user stories (P1 generate branded PDF, P2 select services from catalog, P3 prevent broken/incomplete proposals), edge cases, 13 functional requirements, 3 key entities, 7 measurable success criteria, plus Assumptions and Dependencies sections. Kept all implementation detail out (no Next.js/Chromium/HTML/PNG mentions) — those are HOW, deferred to `/sp.plan`. Made informed guesses (default field list; no pricing in v1 since tools.md has no prices) and recorded them as Assumptions rather than spending `[NEEDS CLARIFICATION]` markers, so the requirements checklist passes clean. Created the quality checklist at `checklists/requirements.md` and ran validation — all items PASS on iteration 1.

## Outcome

- ✅ Impact: Feature 001 scaffolded and specified. `specs/001-proposal-pdf-generator/spec.md` is a complete, validation-passing MVP spec ready for `/sp.clarify` or `/sp.plan`; branch `001-proposal-pdf-generator` is checked out.
- 🧪 Tests: none (specification artifact); acceptance is the requirements checklist — all items pass.
- 📁 Files: `specs/001-proposal-pdf-generator/spec.md` (written from template), `specs/001-proposal-pdf-generator/checklists/requirements.md` (created, PASS).
- 🔁 Next prompts: `/sp.clarify` (optional — spec has no open clarifications) then `/sp.plan` to make the Constitution Check and technical design decisions; ADR candidate on PDF-rendering approach still pending from the planning phase.
- 🧠 Reflection: An empty `/sp.specify` is a genuine fork in scope, not a detail to default — asking one scoping question up front was cheaper than mis-scoping a large first spec. Surfaced the `tools.md` 9-free/8-paid vs. "7 paid" doc discrepancy as an assumption instead of silently normalizing it.

## Evaluation notes (flywheel)

- Failure modes observed: (1) `create-new-feature.ps1` uses a 3-argument `Join-Path` (line 267) that is invalid in Windows PowerShell 5.1, so it fails after creating the branch/spec but before creating the prompts dir and before emitting the JSON block — worked around manually this run; worth a one-line fix to the script (nest the Join-Path calls or use `[IO.Path]::Combine`). (2) `pwsh` is not on PATH in this environment; `powershell` (5.1) is the working invocation.
- Graders run and results (PASS/FAIL): Spec quality checklist — PASS (all Content Quality, Requirement Completeness, and Feature Readiness items).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Patch `create-new-feature.ps1` line 267 to `Join-Path (Join-Path $repoRoot 'history') 'prompts' | Join-Path -ChildPath $branchName` (or `[IO.Path]::Combine`) so the script completes cleanly and returns its JSON on Windows PowerShell 5.1.
