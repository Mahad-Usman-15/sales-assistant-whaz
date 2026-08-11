---
id: 0006
title: Diagnose sequential render exhaustion
stage: explainer
date: 2026-07-27
surface: cli
model: claude-opus-5
feature: 001-proposal-pdf-generator (production defect, no code change yet)
branch: master
user: Mahad Usman
command: /karpathy-guidelines
labels: [production, reliability, chromium, serverless, diagnosis]
links:
  spec: specs/001-proposal-pdf-generator/spec.md
  ticket: (n/a)
  adr: (n/a)
  pr: (n/a - diagnosis only, fix not yet applied)
files:
  - lib/pdf.ts (implicated, unmodified)
tests:
  - 16 sequential POSTs to production (failed at #7, then 10/10 consecutive failures)
  - 120s idle then 3 sequential POSTs (3/3 pass, first at 8.1s cold)
  - 24 concurrent POSTs across 7 batches (13 pass / 11 fail)
---

## Prompt

After 10 pdfs generated continuously(one by one) the system failed to generate the next one."We couldn't generate the proposal. Please try again.".Flag this issue.Why its happens and How to solve it

## Response snapshot

**Reproduced and confirmed** against https://whaz.vercel.app. The user reported failure after ~10;
measured failure at **#7**, followed by **10 consecutive failures with no self-recovery**. After a
120s idle the next request succeeded at 8.1s (cold start). Therefore: a **per-instance resource
leak that persists until Vercel recycles the instance**, not a transient error.

**Root cause — `/tmp` exhaustion (512 MB Vercel ephemeral disk).**

1. `@sparticuz/chromium@149` inflates all payloads into `tmpdir()` (`build/index.js:103-133`):
   `chromium.br` 64.8 MB compressed (~180 MB inflated), `swiftshader.tar.br` 3.6 MB, plus fonts and
   `al2023` libs. Roughly **200 MB of `/tmp` consumed permanently** on the instance's first launch.
2. `lib/pdf.ts:66` launches a **brand-new Chromium per request** with no reuse. Playwright creates a
   fresh temp profile directory per `launch()`, and sparticuz's args include
   **`--disk-cache-size=33554432`** (32 MB) — so each render can leave ~40 MB of profile, disk
   cache, code cache and crashpad data behind.
3. ~310 MB remaining ÷ ~40 MB per render ≈ **7 renders**, matching the observed failure index.

Corroborating evidence: failures return in **~1.1s** (vs ~3.0s for a success) carrying the app's own
`generation_failed` JSON — i.e. `renderPdf()` threw immediately and `route.ts:91` caught it cleanly.
That timing rules out the 60s `maxDuration` and rules out an OOM instance kill (which would
self-heal by restarting; this did not).

**Same root cause explains the concurrency defect measured earlier the same session**: 13/24
concurrent requests succeeded, because N concurrent requests meant N simultaneous Chromiums in one
Fluid instance.

Recommended fix: **cache one `Browser` at module scope and close the `page`, not the browser** —
one profile dir for the instance's entire life, which stops the accumulation and also removes the
~3s launch cost per request. Not yet applied; awaiting user decision.

## Outcome

- ✅ Impact: production defect reproduced, root-caused, and quantified; no code changed yet
- 🧪 Tests: sequential exhaustion PASS (reproduced at #7) · idle recovery PASS · concurrency
  failure PASS (reproduced) · package internals inspected to confirm `/tmp` as extraction target
- 📁 Files: none modified — diagnosis only
- 🔁 Next prompts: implement the cached-browser fix in `lib/pdf.ts`; confirm `ENOSPC` in Vercel
  runtime logs; document the limit in `docs/DEVELOPMENT.md`
- 🧠 Reflection: the arithmetic (200 MB extracted + 40 MB/render vs a 512 MB `/tmp`) predicting the
  exact observed failure index is strong corroboration, but it is still inference from measurement
  plus package source — the decisive confirmation is an `ENOSPC` line in the runtime logs, which I
  cannot read from outside.

## Evaluation notes (flywheel)

- Failure modes observed: (a) the reported symptom ("after 10") was close but not exact — measuring
  gave 7 and, more importantly, revealed the failure is *sticky*, which the report did not mention
  and which is the diagnostic key; (b) an earlier concurrency investigation and this one turned out
  to share a single root cause, so treating them as separate bugs would have produced two partial
  fixes.
- Graders run and results (PASS/FAIL): reproduction PASS · recovery-after-idle PASS · root-cause
  arithmetic matches observed threshold PASS · log-level confirmation NOT RUN (no CLI access)
- Prompt variant (if applicable): (n/a)
- Next experiment (smallest change to try): cache the `Browser` at module scope, redeploy, and
  re-run the 16-sequential probe — success criterion is 16/16.
