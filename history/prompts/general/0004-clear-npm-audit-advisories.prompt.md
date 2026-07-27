---
id: 0004
title: Clear npm audit advisories
stage: general
date: 2026-07-27
surface: cli
model: claude-opus-5
feature: (none - project-wide dependency maintenance)
branch: 001-proposal-pdf-generator
user: Mahad Usman
command: /karpathy-guidelines
labels: [security, dependencies, npm-audit, tooling]
links:
  spec: (n/a)
  ticket: (n/a)
  adr: (n/a)
  pr: https://github.com/Mahad-Usman-15/sales-assistant-whaz/pull/4
files:
  - package.json
  - package-lock.json
tests:
  - npm audit (0 vulnerabilities)
  - npm run lint (clean)
  - npm run test:unit (78 passed)
  - npm run test:integration (13 passed)
  - npm run build (clean)
  - npm run check:table-fit (17/17 fit)
---

## Prompt

Run npm audit,Analyze the vulnerabilities,put concrete solutions against each and fix it by applying each solution and iterate untill npm audit shows No vulnerabilties found.

## Response snapshot

`npm audit` reported **12 high-severity** advisories in two clusters:

1. **Production runtime** — `next` (9 advisories: SSRF ×2, cache confusion ×2, DoS ×2, Server
   Function disclosure, middleware bypass, unbounded payload), plus `postcss` (path traversal,
   arbitrary file read, XSS) and `sharp` (4 libvips CVEs) as its transitives.
2. **Dev-only lint toolchain** — one real root advisory, `brace-expansion` DoS via unbounded
   expansion (OOM). Everything else (`minimatch`, `@eslint/config-array`, `@eslint/eslintrc`,
   `eslint`, `eslint-plugin-{import,jsx-a11y,react}`, `eslint-config-next`) was cascade only.

Applied: `next` 16.2.10 → 16.2.12, `eslint-config-next` 16.2.10 → 16.2.12, and an `overrides`
block forcing `postcss` ^8.5.23, `sharp` ^0.35.3, `minimatch` ^10.2.5, `brace-expansion` ^5.0.8.

Overrides were required because `next@16.2.12` pins `postcss@8.4.31` and `sharp@0.34.5` as its own
direct dependencies — bumping Next alone left the count at 12.

**Two dead ends, reached and reverted:**

- **ESLint 10.8.0** (npm's own suggestion; `eslint-config-next@16.2.12` peers `eslint >=9.0.0`, so
  it looked valid). Audit went clean but lint died — `eslint-plugin-react` calls
  `contextOrFilename.getFilename`, removed in ESLint 10. npm had warned:
  `eslint-plugin-import@2.32.0` peers only up to `^9`. Reverted to eslint 9.
- **Bumping `brace-expansion` alone** → `TypeError: expand is not a function`. `minimatch@3`
  requires the v1 export shape and there is no patched 1.x (1.1.16 is newest; the advisory covers
  everything `<=5.0.7`). Fixed by lifting `minimatch` to 10 in the same step, which works because
  `@eslint/config-array` destructures `{ Minimatch }` — still exported in v10.

`npm audit fix --force` was deliberately not used: it proposes `eslint-config-next@0.2.4`
(published 2015-09-21) and `next@9.3.3` as "fixes" — npm's fallback of offering the newest version
*predating* the advisory range, i.e. decade-long downgrades.

## Outcome

- ✅ Impact: 12 high-severity advisories → 0, with a working linter and no behavioural change
- 🧪 Tests: npm audit 0 · lint clean · 78 unit · 13 integration · build clean · table-fit 17/17 ·
  `/api/generate` tracing still includes `browsers.json` + 4 Chromium `.br` files
- 📁 Files: `package.json` (+`overrides` block), `package-lock.json`
- 🔁 Next prompts: merge PR #4 and redeploy so the Next.js advisories are actually closed in
  production; close superseded Dependabot PR #2; revisit ESLint 10 once `eslint-config-next`
  supports it
- 🧠 Reflection: "audit clean" is not the success criterion — "audit clean **and** the toolchain
  still works" is. The ESLint 10 attempt satisfied the literal goal while breaking lint entirely.

## Evaluation notes (flywheel)

- Failure modes observed: (a) npm's `fixAvailable` proposing downgrades to pre-advisory versions,
  which read as fixes; (b) treating a transitive bump as independent when two packages are
  API-coupled (`minimatch` ↔ `brace-expansion`); (c) trusting a peer range (`eslint >=9.0.0`) over
  actually running the tool.
- Graders run and results (PASS/FAIL): npm audit PASS · lint PASS · unit PASS · integration PASS ·
  build PASS · check:table-fit PASS
- Prompt variant (if applicable): (n/a)
- Next experiment (smallest change to try): record the minimatch/brace-expansion coupling in
  `docs/DEVELOPMENT.md`, since `package.json` cannot carry a comment and the pair looks separable.
