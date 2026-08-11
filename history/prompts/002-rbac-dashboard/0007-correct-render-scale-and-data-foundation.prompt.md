---
id: 0007
title: Correct Render Scale And Data Foundation
stage: green
date: 2026-08-01
surface: agent
model: claude-opus-5
feature: 002-rbac-dashboard
branch: 002-rbac-dashboard
user: Mahad Usman
command: /karpathy-guidelines
labels: [defect-fix, chromium, render-scale, prisma, schema, validation, correction, speculative-code]
links:
  spec: specs/002-rbac-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - lib/pdf.ts
 - lib/rbac-schema.ts
 - prisma/schema.prisma
 - prisma.config.ts
 - server/errors.ts
 - .env.example
 - tests/scale/render-scale.test.ts
 - tests/unit/rbac-schema.test.ts
 - tests/unit/role-enum-parity.test.ts
 - vitest.scale.config.ts
 - package.json
 - .gitignore
 - specs/002-rbac-dashboard/research.md
 - specs/002-rbac-dashboard/tasks.md
tests:
 - 300 sequential renders — 300/300, byte-identical, RSS x1.03 (local dev Chromium)
 - npm run test:unit — 94/94 pass (was 78; +16 new)
 - npx prisma generate — succeeds
 - npx tsc --noEmit — clean
 - npm run lint — clean
 - npm run build — succeeds
 - T005 (Vercel preview /tmp check) NOT RUN — requires deploy
---

## Prompt

implement @specs/002-rbac-dashboard\.Fix the 100 sequential renders correctly.100 pdfs are minimum.IT can be more

## Response snapshot

### 1. Removed my own speculative code, which was actively harmful

The previous turn added `MAX_RENDERS_PER_BROWSER = 50` as unmeasured "insurance" against memory
growth. **It reintroduced the defect it sat next to.** Recycling means `launch()` again, and the
diagnosis quantifies every launch at ~40 MB of unreclaimed `/tmp` — so the original leak returns at
1/50th the rate, hitting the same wall around render 350–400. Against a stated floor of 100 renders
it was guaranteed to fire at least once.

The asymmetry that settles it: **running out of memory kills the instance, which restarts with a
clean `/tmp` and self-heals; running out of disk does not** — production showed 10 consecutive
failures with no recovery. Trading a self-healing failure for a non-self-healing one is strictly
backwards. The browser is now replaced only when `isConnected()` reports it actually died.

The comment block on `getBrowser()` now says *do not add a recycle*, and why — because the next
person to worry about long-lived Chromium memory will reach for exactly that.

### 2. Verified by measurement, not argument

Built `tests/scale/render-scale.test.ts` + `vitest.scale.config.ts` + `npm run check:render-scale`
(default 300, `RENDER_SCALE_COUNT` to raise it). Kept out of `test:unit` because it takes minutes.
It asserts three things, not one: every render succeeds, **every output is byte-identical to the
first** (determinism must survive a shared browser process — the real risk of this change), and RSS
does not grow more than ×1.5 across the run.

```
renders  300/300
first    2982ms (includes browser launch)
median   860ms      p95 1319ms      max 2982ms
rss      171MB -> 176MB  (x1.03)
```

×1.03 over 300 renders. **The memory concern that motivated the recycle was unfounded** — which is
exactly why it should not have been written before being measured.

### 3. A research finding of mine was wrong, and the tooling caught it

R8 stated: *"`prisma.config.ts`'s `Datasource` type has no `directUrl`; keep `directUrl` in
`schema.prisma`."* Prisma 7.9.1 rejects that outright — not a deprecation, a hard `P1012`:

```
error: The datasource property `url` is no longer supported in schema files.
error: The datasource property `directUrl` is no longer supported in schema files.
```

Corrected and re-verified against the v7 upgrade docs: the schema's `datasource` block carries
`provider` and nothing else; `prisma.config.ts` takes `datasource: { url: env('DIRECT_URL') }` —
counter-intuitively the **direct** URL, because the CLI uses it for migrations — and the pooled
runtime URL reaches `PrismaClient` only through the adapter. Also found: `DIRECT_URL` must resolve
for **`prisma generate` itself**, so it belongs in Vercel's *build* environment, not just runtime.

`research.md` R8 now carries a visible **CORRECTED** block quoting the original wrong text rather
than being silently edited — the claim was plausible and the next reader would have repeated it.

### 4. Data foundation — the part of 002 that does not depend on credentials

Reasoning for scope: the Prisma schema and shared validation are **identical whether or not
Supabase credentials exist**, so they do not depend on the blocked answer and were built now.
Everything past them (guard, proxy, login, actions, migrations) needs a live database to mean
anything, and writing ~40 files with no verification loop is the failure mode these guidelines
exist to prevent.

Completed and verified: **T006, T009, T015–T019, T027–T029** (with T001–T004 from before) — 14/103.

- `prisma/schema.prisma` — three models, three enums, the `citext` columns that make FR-028 a
  database property, `onDelete: Restrict` on `PdfGeneration.userId` (what makes FR-021 structural),
  and `lastSeenAt` for FR-041. Verified by `prisma generate` succeeding.
- `lib/rbac-schema.ts` — client-safe, importing **no** Prisma. Email normalised to trimmed
  lowercase so FR-028 holds before the database sees it.
- `tests/unit/role-enum-parity.test.ts` — the drift guard that makes the no-Prisma-import rule safe.
- `server/errors.ts` — four typed errors, each mapped to one status. `StoreUnavailableError` carries
  the FR-045 warning that it must never collapse into `generation_failed`.
- `.env.example` — with the IPv6/`ENETUNREACH` and `NEXT_PUBLIC_` warnings inline.

**T010 deliberately skipped**: adding `./generated/prisma/**` to `outputFileTracingIncludes` has no
effect until something in the route's import graph imports Prisma (T048/T086). An unverifiable
config change belongs with the code that makes it verifiable.

## Outcome

- ✅ Impact: sustained rendering is genuinely fixed and now regression-guarded by a repeatable
  command. 300 sequential renders with flat memory and byte-identical output. The data contract and
  shared validation for 002 exist and are proven self-consistent.
- 🧪 Tests: 300-render scale probe PASS · unit 94/94 PASS (+16) · `prisma generate` PASS · typecheck
  PASS · lint PASS · build PASS · **T005 Vercel `/tmp` check NOT RUN**.
- 📁 Files: `lib/pdf.ts`; new — `lib/rbac-schema.ts`, `prisma/schema.prisma`, `prisma.config.ts`,
  `server/errors.ts`, `.env.example`, `tests/scale/render-scale.test.ts`, `vitest.scale.config.ts`,
  two unit test files; modified — `package.json`, `.gitignore`, `research.md` (R8 correction),
  `tasks.md` (14 tasks marked).
- 🔁 Next prompts: **blocked on two things only the user can provide** — (a) T005, a Vercel preview
  deploy to confirm `/tmp` stays flat on the real Lambda build, and (b) T011–T014, a Supabase
  project + Resend SMTP, without which migrations cannot run and no auth code can be verified.
- 🧠 Reflection: the instruction to fix it "correctly" was right, and the bug was mine. I had
  written the recycle *and* the constitution rule forbidding speculative code in the same day. What
  made it slip through was framing it as safety rather than as an unmeasured assumption — safety
  framing suppresses the question "have you measured this?". The correction cost one measurement.

## Evaluation notes (flywheel)

- Failure modes observed: (a) speculative "insurance" code that reintroduced the very defect it sat
  beside — caught only because the user challenged it, not by my own review; (b) a research claim
  (R8) asserted from documentation without execution, falsified the first time the tool ran. Both
  share a root: confidence without a verification loop.
- Graders run and results (PASS/FAIL): 300-render sequential PASS (300/300) · determinism-under-reuse
  PASS (300/300 byte-identical) · memory-growth PASS (×1.03 vs ×1.5 limit) · unit PASS (94/94) ·
  schema validity PASS (`prisma generate`) · typecheck PASS · lint PASS · build PASS ·
  **`/tmp` non-growth NOT RUN** (needs Vercel) · **concurrency burst NOT RUN** (needs Vercel).
- Prompt variant (if applicable): /karpathy-guidelines
- Next experiment (smallest change to try): on the T005 preview, log `/tmp` before and after 20
  requests. If flat, the disk theory is confirmed end-to-end and the local scale probe can be
  treated as the ongoing regression guard rather than a proxy for it.
