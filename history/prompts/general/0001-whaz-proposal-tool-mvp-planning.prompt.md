---
id: 0001
title: Whaz Proposal Tool MVP Planning
stage: general
date: 2026-07-17
surface: agent
model: claude-sonnet-5
feature: none
branch: master
user: Mahad Usman
command: /plan
labels: [planning, mvp, proposal-generator, pdf-generation, architecture, root-cause-analysis]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - projectplan.md
tests:
 - none
---

## Prompt

/plan
# Planning for the Tool v1

## Role
Act as a Senior Software Engineer, Solution Architect, and Product Planner. Your goal is to analyze the problem, brainstorm multiple solutions, evaluate them objectively, and create a **`projectplan.md`** file. Do not commit to the first idea; use an iterative decision-making approach before recommending the best solution.

## Goal
Analyze the business problem, identify root causes, compare possible solutions, and recommend the most practical **Version 1 (MVP)** based on simplicity, reliability, maintainability, usability, cost, and implementation effort.

## Business Problem
The Whaz sales team generates many proposal letterheads daily using AI tools like Google Gemini and Chat gpt. They repeatedly write prompts containing business details, services, and benefits. AI often hallucinates, produces inconsistent layouts, fails to generate downloadable PDFs, or returns code instead. Usage limits and inconsistent outputs reduce productivity, and about **70% of generated proposals fail**. The team has limited prompt engineering knowledge.

## Deliverable
Create **`projectplan.md`** containing:
- Problem & root-cause analysis
- Stakeholders
- Functional & non-functional requirements
- At least 3 solution options
- Evaluation matrix (Complexity, Usability, Reliability, Maintainability, Cost, Scalability)
- Trade-off analysis
- Final recommendation with justification
- MVP scope (In/Out)
- High-level architecture
- Risks & mitigations
- Success metrics

## Constraints
- Non-technical user friendly
- Low/no-cost solution
- Reliable, consistent PDF generation
- Simple MVP with future extensibility
- Challenge assumptions and justify every recommendation with measurable reasoning.

## Initial Idea
Build a simple form-based application where users enter business details and select required services/tools. The system generates standardized HTML using fixed templates, keeping headers and footers consistent with `/docs/reference-letter-head.pdf` and `/docs/letterhead-skeleton.jpeg`, then automatically exports a PDF. Minimize AI dependency by using deterministic templates.

--- Follow-up exchange during planning (verbatim) ---

User (after reviewing initial plan): "The idea for light weight webapp is perfectly suitable for the MVP and meets teams requirements.
Some Things to clarify before moving towards the mvp implementation
What does you mean by""" The recommended architecture assumes the header/footer PNGs can be cleanly re-exported at print resolution from the existing external design file
— this hasn't been verified directly (file wasn't accessible in this session)."""
mvp will be hardcoded,once the mvp is tested by the team then we will use a DB/CM."

User (final): "approved."

## Response snapshot

Explored the repo (greenfield, no app code — only SpecKit scaffolding and business docs: whaz.md, design.md, tools.md, problemstatement, docs/letterhead-skeleton.jpeg, docs/reference-letter-head.pdf), rendered the letterhead JPEG to confirm its diagonal-cut header/footer bands, watermark, and dot-grid texture. Spawned a Plan agent to stress-test three PDF-generation architectures (Google Docs merge vs. custom web app vs. no-code SaaS) against this brand's specific graphic complexity. Asked the user 4 clarifying questions (design-file availability, daily volume, hosting preference, and a rephrase) to resolve open assumptions. Wrote a detailed plan to the plan-mode file, incorporated user's clarification (source design file exists elsewhere; hardcode-first MVP with DB/CMS deferred to v2) and got explicit approval, then authored `projectplan.md` at the repo root with all 11 required sections: root-cause analysis (core cause: non-deterministic LLM applied to a deterministic document-assembly task), stakeholders, functional/non-functional requirements, 3 solution options, a scored evaluation matrix, trade-off analysis, final recommendation (custom lightweight web app: form → HTML/CSS template with image-based letterhead chrome → headless-Chromium PDF render → Vercel), MVP in/out scope, high-level architecture, risks/mitigations, and success metrics.

## Outcome

- ✅ Impact: `projectplan.md` created at repo root with a complete, decision-justified MVP plan for the Whaz proposal-letterhead generator; recommendation is a custom lightweight web app (Next.js + headless-Chromium PDF rendering + image-based letterhead chrome, hosted on Vercel free tier), fully deterministic with zero AI in the render path.
- 🧪 Tests: none (planning document, not code)
- 📁 Files: `projectplan.md` (created)
- 🔁 Next prompts: Kick off MVP implementation — starting with exporting the header/footer bands from the external design source file as print-resolution transparent PNGs; consider running `/sp.adr` for the PDF-rendering architecture decision; then `/sp.specify` to turn this into a formal SDD feature spec once implementation begins.
- 🧠 Reflection: For business/product-planning requests (not code changes), the Explore-agent phase of plan mode adds little value once the repo is confirmed greenfield — the higher-leverage move was a single Plan-agent call focused on stress-testing the specific technical risk (letterhead graphic fidelity vs. PDF-rendering approach) rather than generic codebase exploration.

## Evaluation notes (flywheel)

- Failure modes observed: No `.specify/scripts/bash/create-phr.sh` exists in this repo (only PowerShell scripts under `.specify/scripts/powershell/`), and no `history/` directory existed yet — fell back to manually authoring the PHR per the documented fallback path in `.claude/commands/sp.phr.md` step 3b. Also, the first clarifying question ("editable source design file?") was worded ambiguously and the user couldn't parse it on first attempt; it needed a plain-language rephrase before it landed.
- Graders run and results (PASS/FAIL): N/A (no automated graders configured for PHRs in this repo yet)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Port `.specify/scripts/powershell/` PHR-adjacent tooling to add an actual `create-phr.sh` (or a cross-platform equivalent) so future PHR creation doesn't require manual fallback; when asking non-technical stakeholders technical yes/no questions, default to concrete plain-language phrasing over jargon on the first attempt.
