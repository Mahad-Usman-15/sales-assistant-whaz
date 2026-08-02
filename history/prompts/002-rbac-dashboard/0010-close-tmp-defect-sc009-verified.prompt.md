---
id: 0010
title: Close Tmp Defect SC009 Verified
stage: green
date: 2026-08-02
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: null
labels: [defect-fix, chromium, sparticuz, sc-009, T005, instrumentation, deployed-verification]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - lib/pdf.ts
 - app/api/generate/route.ts
 - tests/scale/render-scale.test.ts
 - scripts/check-deployed-renders.mjs
 - package.json
 - specs/002-rbac-dashboard/tasks.md
tests:
 - "DEPLOYED (Vercel preview i4bgxcen8): 20/20 sequential, 5/5 concurrent, 1 instance served 20, launches=1 — SC-009 PASS"
 - "local 100 sequential: 100/100 byte-identical, RSS x1.00, launches=1"
 - npm run test:unit 94/94, tsc, lint, build all clean
---

## Prompt

I have pushed the code
(…followed by the preview URL https://sales-assistant-whaz-i4bgxcen8-mahad-usmans-projects.vercel.app/)

## Response snapshot

**T005 / SC-009 PASSES on the deployed build.** 20/20 sequential and 5/5 concurrent, all on one
instance (`o0xpzyfe`) with `launches=1` throughout — 23 renders on a single Chromium, zero
relaunches. Warm renders ~750ms against ~880ms before. Phase 1 is closed; **34/103**.

### Three attempts at the same bug, and the pattern I kept missing

| Attempt | Per request | Outcome |
|---|---|---|
| Original | launch + close **browser** | ~40 MB /tmp leaked per render; died at ~7, permanently |
| Fix 1 | new + close **BrowserContext** | killed the browser → relaunch → same leak, half rate |
| Fix 2 | new + close **Page** | killed the browser → relaunch → same leak |
| Fix 3 ✅ | **close nothing** | browser + one page live for the process |

Every incident had the identical root — Chromium being relaunched — and I treated the symptom three
times. The decisive evidence was in the launch args the whole time, in the user's log:
`--single-process --no-zygote … --no-startup-window`. The browser starts with **zero windows**, so
the first page is the only window and closing it drops the count to zero and exits the process. I
initially blamed `--single-process` (context teardown), fixed only that half, and the next deployed
run disproved it.

Final shape: one browser and one long-lived page per instance, never closed; `setContent()` replaces
the document so reuse needs no cleanup. Concurrency dropped to **1 per instance** — one page cannot
serve two renders — which is the correct axis anyway, since parallelism comes from Vercel running
more instances, each with its own Chromium. The concurrent phase demonstrated exactly that: three
requests continued on the warm instance while two spilled to fresh ones.

Side effect: median warm render fell from ~705ms to ~264ms locally, because per-render page setup
disappeared too.

### The instrumentation was the turning point

Before this, the probe reported "16 distinct instances" from parsing `x-vercel-id` — whose trailing
segment is a per-**request** id. It measured nothing, and I had presented it as if it did. That is
worse than no metric: SC-009's entire claim is "on the same warm instance", and a run spread across
20 cold instances (each with an empty /tmp) would have been indistinguishable from a genuine pass.

Replaced with app-reported headers — `x-render-instance`, `x-render-count`, `x-browser-launches` —
emitted on **both** the success and failure paths, because "this instance had already rendered N
times" is precisely what separates resource exhaustion from a cold-start problem. `launches` turned
out to be the sharp signal: it should be 1 forever, and it read 17 across 20 requests, which
identified the remaining bug immediately.

### The regression guard that was missing all along

`tests/scale/render-scale.test.ts` now asserts **`browserLaunches === 1`** after 100 renders.

All three bugs passed the checks that existed — renders succeeded, memory stayed flat, output stayed
byte-identical. None of those can detect a browser relaunch. A launch counter detects all three
immediately. That assertion is the actual lesson of this sequence.

⚠️ Recorded plainly: **local testing cannot reproduce this class of failure.** `lib/pdf.ts` only
loads `@sparticuz/chromium` when `process.env.VERCEL` is set, so the dev Chromium never sees
`--no-startup-window`. A local 300-render pass coexisted with a deployed build that failed 17 of 20.
Only the deployed probe is evidence.

Also fixed en route: the probe's diagnostic misfired on the first deployed run, reporting the /tmp
signature when every request had actually been rejected by Vercel Deployment Protection (401 at the
edge, function never invoked). It now classifies blocked-at-edge before blaming the render path, and
only cites the /tmp signature when renders actually succeeded first and then failed with 500s.

## Outcome

- ✅ Impact: the defect that gated the entire feature is fixed and **verified on the deployed
  build**. Phase 1 complete. The generator sustains 20+ consecutive renders on one warm instance,
  which was ~7-then-permanently-broken before.
- 🧪 Tests: DEPLOYED preview 20/20 sequential + 5/5 concurrent, `launches=1`, one instance served 20
  — SC-009 PASS. Local 100/100 byte-identical, RSS ×1.00, launches=1. Unit 94/94, tsc, lint, build
  clean.
- 📁 Files: `lib/pdf.ts` (page reuse, concurrency 1, instrumentation), `app/api/generate/route.ts`
  (diagnostic headers), `tests/scale/render-scale.test.ts` (launch assertion),
  `scripts/check-deployed-renders.mjs` (new), `package.json`, `tasks.md` (T005 → [X]).
- 🔁 Next: T043–T052 (US1) — `proxy.ts`, `/login`, `/auth/callback`, `requireUser()` + 401/503 on
  `/api/generate`, ProposalForm 401 branch. Remaining in Phase 1: T007/T008 (Phase 3 UI deps, not
  needed yet) and T010 (`outputFileTracingIncludes` for the Prisma client — becomes verifiable once
  T048 puts Prisma in the route's import graph). Deployment Protection can be re-enabled.
- 🧠 Reflection: I fixed this three times and shipped two non-fixes. The common thread is that each
  attempt was reasoned from the *previous* symptom instead of from the launch arguments, which were
  printed in full in the very first log and named the cause both times. Reading the evidence I
  already had would have skipped two deploy cycles.

## Evaluation notes (flywheel)

- Failure modes observed: (a) treating a symptom three times without identifying the invariant
  ("Chromium must launch once"); (b) reporting a fabricated metric — distinct `x-vercel-id` values
  as "instances" — which would have permitted a false pass on the criterion it was meant to prove;
  (c) a diagnostic that misdiagnosed, pointing at /tmp when requests never reached the function;
  (d) partially reading evidence — `--single-process` was acted on while `--no-startup-window`, two
  args later on the same line, was not.
- Graders run and results (PASS/FAIL): deployed sequential 20/20 PASS · deployed concurrent 5/5 PASS
  · single-instance attribution PASS (20 of 20 on `o0xpzyfe`) · browser-launch invariant PASS
  (launches=1 across 23 renders) · local determinism 100/100 byte-identical PASS · memory ×1.00 PASS
  · unit 94/94 PASS · tsc/lint/build PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): once T048 gates `/api/generate` behind `requireUser()`,
  re-run this same probe with an authenticated session. The guard adds a per-request database
  lookup, and the interesting question is whether warm renders stay near 750ms or whether pooled
  connection latency shows up in the p95.
