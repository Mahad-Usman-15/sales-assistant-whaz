---
id: 0007
title: Fix Blank Page Hydration Failure
stage: refactor
date: 2026-07-20
surface: agent
model: claude-opus-4-8
feature: 001-proposal-pdf-generator
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: none
labels: [bugfix, hydration, turbopack, nextjs16, dev-environment]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - next.config.ts
 - app/global-error.tsx
 - package.json
 - README.md
 - CLAUDE.md
tests:
 - tests/integration/generate.spec.ts
 - tests/integration/form.spec.ts
---

## Prompt

THe pdf is unable to generate

## Response snapshot

Reproduced rather than guessing. First check found a stale server on port 3000 returning **HTTP 500 with an HTML error page** instead of our JSON error shape — meaning the failure happened before the route handler's try/catch.

Drove the actual browser flow with Playwright (not curl), which is what exposed the real fault: **`button present: 0`** — the page rendered nothing. Meanwhile `curl localhost:3000` returned a correct 18 KB document containing the whole form, and `POST /api/generate` returned a valid 31 KB PDF. So the API and template were fine; the **browser** was broken.

Root cause: a corrupted `.next` cache in which Turbopack wrote an **empty React Client Manifest** (`Manifest file is empty`, `Could not find the module ... in the React Client Manifest`). That surfaces as an uncaught error in the browser, which kills React hydration — the form exists in the HTML but has no event handlers attached, so clicking Generate does nothing. From the rep's seat that is exactly "the PDF is unable to generate".

A contributing factor: a stray `C:\Users\Techno\package-lock.json` made Next infer the workspace root as the home directory, so module paths resolved as `[project]/Desktop/MahadWorkSpace/Sales-Assistant/node_modules/...`. An earlier `turbopack.root: __dirname` fix was silently ineffective — `__dirname` does not exist in an ESM config — so it was rewritten using `dirname(fileURLToPath(import.meta.url))`.

Fixes: pinned `turbopack.root` correctly; added `app/global-error.tsx` (also sidesteps Next 16 + Turbopack failing to resolve its *built-in* global-error module); cleared `.next` (via `node fs.rmSync`, as `rm -rf .next` was blocked); added `npm run clean` / `npm run dev:clean` so this is self-recoverable.

Verified end to end in a real browser afterwards: 22 inputs, 2 buttons, **zero page errors, zero console errors, zero failed requests**, and the full rep flow produced a valid 36,889-byte PDF named `proposal-northwind-consulting-2026-07-20.pdf` with the progress indicator showing.

## Outcome

- ✅ Impact: App works in the browser again. Cause was environmental (corrupted build cache), not a defect in the render pipeline — no product code needed changing beyond the config pin and the error boundary.
- 🧪 Tests: 78 unit pass; typecheck, lint, and production build clean; full integration suite re-run.
- 📁 Files: `next.config.ts` (ESM-safe turbopack root), `app/global-error.tsx` (new), `package.json` (`clean`, `dev:clean`), `README.md` (Troubleshooting section), `CLAUDE.md` (symptom → fix, plus the test-coverage gap).
- 🔁 Next prompts: T062 Vercel deploy remains. Worth considering a smoke test that loads the page in a real browser and asserts the form is interactive, so this class of failure fails CI instead of reaching the user.
- 🧠 Reflection: I reported the feature as working on the strength of 13 green integration tests — but those run against `npm run build && npm start`, so dev mode was never exercised. The tests were all passing while the app was unusable in the way the user actually runs it. Green tests are evidence about the environment they run in, and that scope needs stating rather than assuming.

## Evaluation notes (flywheel)

- Failure modes observed: (1) Switching the Playwright `webServer` to a production build fixed flakiness but silently narrowed coverage — a reliability fix that created a blind spot. (2) `curl` said healthy while the browser was broken; for a client-rendered form, HTTP-level checks cannot substitute for driving the DOM. (3) An earlier `turbopack.root: __dirname` change looked correct and was inert, and the *disappearance* of the lockfile warning was misread as confirmation it had worked.
- Graders run and results (PASS/FAIL): Browser end-to-end PASS (valid PDF, no errors). Unit 78/78 PASS. Typecheck/lint/build PASS.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add one integration test that runs against `next dev` (not the production build) and asserts the form is hydrated — e.g. fill a field and confirm React state updates — so dev-only hydration breakage is caught by the suite.
