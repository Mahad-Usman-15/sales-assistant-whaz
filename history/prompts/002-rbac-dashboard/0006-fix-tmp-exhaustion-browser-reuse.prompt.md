---
id: 0006
title: Fix Tmp Exhaustion Browser Reuse
stage: green
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: null
labels: [defect-fix, chromium, serverless, tmp-exhaustion, browser-reuse, performance, T001-T004]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - lib/pdf.ts
 - specs/002-rbac-dashboard/tasks.md
tests:
 - 100 sequential renders through renderPdf() — 100/100 pass, all byte-identical (local, Windows dev Chromium)
 - npm run test:unit — 78/78 pass
 - npx tsc --noEmit — clean
 - npm run lint — clean
 - npm run build — succeeds
 - T005 (Vercel preview, SC-009) NOT RUN — requires deploy
---

## Prompt

The sales team was aimed to generate atleast 100 pdfs sequentially without any errors under very less time each.But currently After 7 pdfs are generated sequentially it failed to generate the 8th.Why is this so and How to overcome this issue with a persistent solution.

## Response snapshot

Explained the root cause and implemented the fix — **tasks T001–T004** of feature 002's Phase 1.

**Root cause: `/tmp` exhaustion, not memory.** Two costs share Vercel's 512 MB ephemeral disk.
`@sparticuz/chromium` inflates ~200 MB permanently on the instance's first launch (`chromium.br`
64.8 MB compressed → ~180 MB inflated, plus swiftshader, fonts, al2023 libs), leaving ~310 MB. Then
`lib/pdf.ts:66` launched a **new browser per request**, each getting a fresh Playwright profile
directory plus sparticuz's `--disk-cache-size=33554432` (32 MB) — roughly **40 MB left behind per
render**. 310 ÷ 40 ≈ **7**, matching the observed failure index exactly.

**The trap is the line that looks like the fix.** The old `finally { await browser?.close() }`
carried the comment *"a leaked browser in a warm serverless container exhausts memory"* — correct
about RAM, which is why it read as safe. But the leak was **disk**: `close()` ends the process and
does not reliably reclaim what it wrote. Memory stayed fine and the disk filled anyway.

Three measured facts (from the earlier diagnosis, PHR `general/0006`) confirm disk over memory or
timeouts: failures returned in **~1.1 s** vs ~3.0 s for a success carrying the app's own
`generation_failed` JSON (so `renderPdf()` threw immediately — rules out the 60 s `maxDuration`);
the failure was **sticky**, 10 consecutive with no self-recovery (an OOM kill would restart and heal);
and after **120 s idle** the next request succeeded at 8.1 s, i.e. a cold start on a fresh instance
with an empty `/tmp`.

**Fix: one browser per instance, one `BrowserContext` per request.** A context lives inside the
running Chromium process and creates no profile directory, so per-request isolation now costs zero
disk. `/tmp` stops growing after the one-time 200 MB.

- `getBrowser()` — module-scope memoised promise, matching the pattern `lib/fonts.ts` and
  `lib/brand.ts` already use
- `renderPdf()` — `newContext()` → `newPage()`, closing the **context** in `finally`, never the
  browser
- `isConnected()` liveness check so a crashed Chromium self-heals on the next request
- Concurrency semaphore (2) — contexts are isolated but their memory is not, and Fluid Compute runs
  concurrent invocations on one instance. Implemented with direct slot hand-off on release so the
  count can never transiently exceed the cap.

**One addition beyond the planned tasks, driven by the stated 100-PDF target.** Once disk stops being
the ceiling, **memory becomes it** — a Chromium held for hundreds of renders accrues. Added
`MAX_RENDERS_PER_BROWSER = 50`, recycling only when no other render is in flight (otherwise a
concurrent request would have the browser closed underneath it). Commented honestly as a conservative
bound, **not** an empirically tuned value.

**Verified locally: 100 sequential renders, 100/100 succeeded**, mean **668 ms**, median 655 ms,
p95 802 ms, max 992 ms, RSS 166 MB after the run. All 100 outputs **byte-identical** — determinism
(FR-007/SC-005) survives browser reuse, which was the main correctness risk of sharing a process.
Also: 78/78 unit tests, `tsc --noEmit` clean, lint clean, build succeeds.

⚠️ **Stated environment**: that probe ran on **Windows against the dev Chromium**, so it proves
browser reuse, determinism, memory stability, and timing — but **not** the `/tmp` fix itself, whose
mechanism is Linux/Lambda-specific. The decisive check is **T005 / SC-009** on a Vercel preview and
has not been run.

## Outcome

- ✅ Impact: The ~7-render ceiling is removed. Per-render latency also drops sharply — the ~3 s
  browser launch is gone from every request, so warm renders are ~0.65 s locally against ~3.0 s
  previously. T001–T004 marked complete in `tasks.md`.
- 🧪 Tests: 100-render sequential probe 100/100 PASS with byte-identical output (local, dev
  Chromium) · unit 78/78 PASS · typecheck PASS · lint PASS · build PASS · **T005 Vercel preview NOT
  RUN**.
- 📁 Files: `lib/pdf.ts` (rewritten around `getBrowser()` + per-request context + semaphore +
  recycle); `specs/002-rbac-dashboard/tasks.md` (T001–T004 → `[X]`).
- 🔁 Next prompts: **T005** — deploy to a Vercel preview, issue 20 sequential `POST /api/generate`
  against one warm instance, then 5 concurrent, and confirm `/tmp` does not grow monotonically. Only
  then is Phase 1 genuinely closed and Phase 2 (auth) safe to start.
- 🧠 Reflection: The old code was not careless — it disposed of the browser deliberately, with a
  comment explaining why. It was defending against the wrong resource. That is the more interesting
  lesson than "reuse the browser": a cleanup that is correct about memory can be silently wrong about
  disk, and the comment asserting the intent is exactly what stops a reviewer from re-examining it.
  The replacement comments therefore say what *not* to do and why, rather than restating what the
  code does.

## Evaluation notes (flywheel)

- Failure modes observed: the temptation to trust the local 100/100 as proof of the fix. It is not —
  the leak is Linux/sparticuz-specific and the probe ran on Windows dev Chromium. Recorded the
  environment explicitly on every claim rather than reporting a clean pass, per the Workflow Rule
  that a verification claim must name the environment that produced it.
- Graders run and results (PASS/FAIL): sequential 100-render PASS (100/100) · determinism-under-reuse
  PASS (100/100 byte-identical) · memory stability PASS (166 MB RSS after 100) · latency PASS (mean
  668 ms, well inside the 2-minute per-proposal target) · unit suite PASS (78/78) · typecheck PASS ·
  lint PASS · build PASS · **`/tmp` non-growth NOT RUN** (needs Vercel) · **concurrency burst NOT
  RUN** (needs Vercel, T005).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): on the T005 preview run, log `/tmp` usage before and
  after the 20-request sequence. If it is flat, the disk theory is confirmed end-to-end and
  `MAX_RENDERS_PER_BROWSER` can be evaluated on its own merits (memory) rather than carried as
  insurance against two unknowns at once.
