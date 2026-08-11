<!--
Sync Impact Report (v4.0.1, 2026-08-01 — PATCH, appended below the v4.0.0 report)
Version change: 4.0.0 → 4.0.1 (PATCH — clarification, no normative change)
Bump rationale: `projectplan.md` and `problemstatement` were designated historical records rather
  than sources of truth. This document cited `projectplan.md` in three rationales and one
  Technology Constraint in a way that could be read as delegating authority to it. No principle,
  constraint, or requirement changes; only the standing of those citations is clarified, and
  Governance gains an explicit statement of what is authoritative. PATCH by this document's own
  versioning policy ("wording or clarification fixes that carry no normative change").
Modified principles: none. Rationale citations to `projectplan.md` are retained as *evidence of
  origin* and re-labelled as such — the reasoning they record is still why the rules exist, and
  deleting the provenance would make the rules look arbitrary.
Added sections: Governance gained a "Source of truth" paragraph.
Removed sections: none.
Templates requiring updates:
  ✅ CLAUDE.md — Project Overview rewritten; both files banner-marked and reclassified.
  ✅ projectplan.md, problemstatement — HISTORICAL RECORD banners added at the head of each.
  ✅ specs/002-rbac-dashboard/spec.md — Target Audience re-anchored to own its facts.
  ✅ README.md, docs/DEVELOPMENT.md — document-index rows relabelled.
Follow-up TODOs: none.
-->

<!--
Sync Impact Report (v4.0.0, 2026-08-01)
Version change: 3.0.0 → 4.0.0 (MAJOR — backward-incompatible principle redefinition + new principle)
Bump rationale: Principle III's normative rule is reversed. v3.0.0 required the render pipeline to
  "remain stateless, with no required database, authentication, or persistent storage"; Technology
  Constraints stated flatly "**Data**: No database in v1." The RBAC dashboard requirement
  (`dashboard.txt`) makes authentication and persistence *mandatory* on that same pipeline: an
  anonymous `POST /api/generate` is compliant with v3.0.0 and violates v4.0.0. That is a
  backward-incompatible redefinition under this document's own versioning policy. A new binding
  principle (VI) is added, which alone would be MINOR; the MAJOR is driven by III.
Modified principles:
  - III. Stateless-by-Default, Extend Without Rebuilding
      → III. Additive Extension — Identity Wraps the Render Path, It Does Not Rewrite It
      Cause: `dashboard.txt` requires two roles, per-user PDF counts, org-wide counts, and member
      administration. Every one of those requires identity; identity requires persistence. The
      motivating evidence is the requirement document itself, not a discovered defect.
      Statelessness was never the goal — it was the cheapest available means to the actual goal,
      which is a render path that cannot be destabilised by the features layered around it. That
      goal is unchanged for the fourth consecutive version and is now stated directly, with the
      previously implicit obligations (lib/ stays framework-free; checks before render, writes
      after; a stateful failure must not void a successful render) made binding.
  - V. Cost Ceiling as an Architectural Constraint — materially expanded, not redefined. The $0
      ceiling is unchanged; free-tier operational hazards are now named as design obligations
      rather than production surprises.
Added sections:
  - Principle VI. Authorization Is Server-Enforced, on Every Request, from Live State — new and
      binding. Covers where authorization occurs, the forbidden role sources, middleware's
      non-status as a security boundary, Server Actions as public endpoints, actor-typed data
      access, cross-row invariants under concurrency, and RLS's honest role.
  - Technology Constraints gained Authentication, Server runtime, UI-framework-scoping, and
      Third-party-tier bullets; the Data bullet was rewritten.
  - Security Requirements gained four bullets (privileged-credential confinement, session-cookie
      cache headers, reversible deactivation, invitation as the sole role carrier).
Removed sections: none. Principle III's "no required database, authentication, or persistent
  storage" clause is withdrawn (see bump rationale); "No database in v1" is withdrawn from
  Technology Constraints.
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" defers generically
     ("[Gates determined based on constitution file]"); no hardcoded principle text. No edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific hardcoding. No edit needed.
  ✅ .specify/templates/tasks-template.md — no principle-driven task categories to revise; the new
     concurrency/authorization obligations are per-feature task content, not template categories.
     No edit needed.
  ✅ .claude/commands/sp.*.md — constitution references are generic (load file, stage routing,
     "Constitution Alignment" checks); none name principles. No edit needed.
  ✅ CLAUDE.md — version references updated 3.0.0 → 4.0.0; Principle III renamed in the summary
     line; "No database in v1" claim retired.
  ✅ specs/001-proposal-pdf-generator/plan.md — Constitution Check Principle III row renamed and
     re-scoped; Storage line annotated.
  ✅ specs/001-proposal-pdf-generator/spec.md — Dependencies section version reference updated.
  ✅ docs/DEVELOPMENT.md — constitution version reference updated.
  ✅ history/adr/0001-letterhead-chrome-strategy.md — cites v3.0.0 Principle II as the version that
     ratified it. Principle II is unchanged in v4.0.0, so the historical citation stays correct.
     No edit needed.
  ✅ projectplan.md — §8/§9 still describe "no login, no database, no stored history in v1" as the
     MVP scope decision. RESOLVED in v4.0.1: the file is banner-marked as a historical record and is
     no longer a source of truth, so its stale scope statements now stand as exactly what they are.
Follow-up TODOs: none. Ratification date preserved from the original adoption (2026-07-17).
-->

# Whaz Proposal Letterhead Generator Constitution

## Architecture Principles

### I. Deterministic Rendering — Zero AI in the Render Path
The proposal-generation pipeline (form → template → PDF) MUST NOT invoke any generative AI model
at any stage of layout, formatting, or PDF rendering. Every piece of content in a generated PDF
MUST originate from explicit rep input — typed or selected — or from fixed, reviewed template copy;
never from AI inference at render time.
**Rationale**: This directly resolves the confirmed root cause of the tool's predecessor failing
~70% of the time: a non-deterministic generator was used for what is fundamentally a deterministic
document-assembly task (`projectplan.md` §1). Reintroducing generative AI into the render path,
even "just for wording," reopens that exact failure mode.

Note: that the *letterhead artwork* was produced by an AI image generator does not violate this
principle. The artwork is a fixed, client-approved asset committed to the repo; no model runs during
a render. The prohibition is on generation at render time, not on the provenance of static assets.

### II. Brand Fidelity Is Ground Truth, Not a Suggestion
The letterhead's visual identity is non-negotiable, and any perceptible drift from the approved
material is a defect rather than a stylistic choice. `docs/reference-letter-head.pdf` is the single
authoritative reference; `docs/header.png`, `docs/footer.png`, `docs/letterhead-skeleton.jpeg`, and
`design.md` §5 are secondary corroborating material.

`docs/reference-letter-head.pdf` is the **client-approved finished proposal**, not a letterhead
swatch. It is authoritative for body layout and fixed prose as well as for chrome.

The chrome MUST be the approved artwork itself — the full-page composite extracted losslessly from
that PDF and committed as `assets/brand/letterhead.png` — painted full-bleed and repeated on every
page. It MUST NOT be reconstructed, approximated, or redrawn in CSS, SVG, or any other code form.

The following are binding consequences, not guidance:

- The approved artwork's native resolution **is** the fidelity bar. Its ~127 DPI is a property of
  what the client approved, not a defect to be engineered around. Re-generating, upscaling, or
  "enhancing" the artwork is FORBIDDEN — it produces a different image, not a better one.
- Exactly one brand raster MAY be bundled: the extracted composite. The reference files in `docs/`
  remain reference-only and MUST NOT be bundled or referenced by the render path.
- Fidelity MUST be verified **numerically, not visually**, before any layout or chrome change is
  merged: the baseline position of every fixed document element MUST agree with
  `docs/reference-letter-head.pdf` to within 0.5mm. A side-by-side visual look is permitted as an
  additional check but MUST NOT be the basis of a fidelity claim.
- Body text MUST remain real, selectable, searchable text. Only the letterhead artwork may be raster.
- Artwork that is genuinely bespoke rather than simple geometry MUST NOT be hand-approximated in
  code. It ships as a supplied asset or it does not ship.

**Rationale**: The goal is unchanged across all four versions — the brand chrome is ground truth and
drift is a defect. Only the mechanism has changed, twice, as facts arrived. v1.0.0 assumed a canonical
design file; none exists. v2.0.0 concluded that the chrome should therefore be rebuilt in code; the
Whaz salesperson rejected that output, and the decisive fact was then found — the reference PDF is the
approved *document*, and its embedded artwork extracts losslessly. Once the approved artifact is
available in full, reproducing it is strictly more faithful than reconstructing it, and the resolution
question dissolves: matching what the client approved is the requirement. The numeric-verification
bullet exists because a visual review of this very feature passed a 5.1mm misplacement that baseline
extraction caught immediately. The final bullet is retained unchanged from v2.0.0 and is now
*satisfied* rather than deferred — the body watermark ships as part of the extracted composite.
Full evidence and rejected alternatives: `specs/001-proposal-pdf-generator/research.md` R1 and the
spec's Clarifications, Session 2026-07-26.

### III. Additive Extension — Identity Wraps the Render Path, It Does Not Rewrite It
The render pipeline (validated input → HTML → Chromium → PDF bytes) MUST remain a deterministic,
self-contained transformation. It MUST NOT read from or write to a database, a session store, or any
other network service **during** a render. Capabilities that require state — authentication, roles,
usage metrics, proposal history — MUST be layered *around* that transformation: as preconditions
checked before rendering begins, and as side effects recorded after it has demonstrably succeeded.
They MUST NOT be woven into it, and MUST NOT be delivered as a rewrite or replacement of it.

The following are binding consequences, not guidance:

- `lib/` MUST remain framework-free and unit-testable without booting Next.js, a browser, or a
  database. Server-only concerns (ORM client, auth SDK, session cookies) live outside it.
- Identity and authorization checks MUST complete before the renderer is invoked. Metric or history
  writes MUST be registered only after a render has succeeded, never speculatively before it.
- A failure in a stateful layer MUST NOT void a successful render. Where the two disagree — the PDF
  rendered but its metric row failed to write — the user keeps the PDF and the discrepancy is
  logged with a distinct code. Operational counters are not billing records and MUST NOT be given
  veto over a delivered document. The inverse (a metric row for a render that failed) is a defect.
- Adding a stateful capability MUST NOT change the render path's public contract beyond adding
  authorization failure as a new, explicitly typed error response.

**Rationale**: v1.0.0–v3.0.0 stated this rule as "MUST remain stateless, with no required database,
authentication, or persistent storage." That was the correct expression of the goal while the tool
was anonymous and single-purpose. `dashboard.txt` changes the requirement: two roles, per-user and
org-wide PDF counts, and member administration. Each of those needs identity; identity needs
persistence. Statelessness was never the goal — it was the cheapest available means to the actual
goal, which is a render path that cannot be destabilised by whatever is built around it. That goal
is preserved verbatim here and the means are replaced. Restating it as "additive extension" also
closes a loophole the old wording left open: "stateless" said nothing about *where* state may be
touched once it exists, and the obvious wrong answer — a database round trip inside the renderer —
would have satisfied the letter of a rule about the MVP while destroying determinism.

### IV. Small, Reviewable, Spec-Driven Increments
All feature work MUST flow through the SDD lifecycle (`/sp.specify` → `/sp.plan` → `/sp.tasks` →
`/sp.implement`) and land as the smallest viable diff that satisfies its spec. No unrelated
refactors, no speculative abstractions, no code written ahead of a documented requirement.
**Rationale**: Matches the Default Policies already governing this project (see `CLAUDE.md`) and
keeps a very small team's surface area fully auditable end-to-end.

### V. Cost Ceiling as an Architectural Constraint
Recurring infrastructure cost MUST remain at $0 (or an explicitly leadership-approved near-$0
figure) at the team's current volume (~10-50 proposals/day). Any dependency, service, or hosting
change that introduces recurring cost MUST be justified against this ceiling *before* adoption,
not discovered after the fact.

Because the ceiling forces free tiers, their operational limits are architectural facts and MUST be
designed against, not discovered in production. Where a free tier's behaviour would present to a
user as an outage or a silent failure — an idle project being paused, a built-in transactional
email sender that the vendor documents as non-production — a mitigation MUST be part of the design
that adopts it, and the limit MUST be recorded in the plan alongside the mitigation.

**Rationale**: Low/no-cost is a hard constraint from the original business ask (`projectplan.md`
§3, Non-Functional Requirements), not a nice-to-have. The added paragraph exists because a $0 tier
is not a smaller version of a paid tier — it is a different product with different failure modes,
and treating the difference as an implementation detail turns a known limit into an incident.

### VI. Authorization Is Server-Enforced, on Every Request, from Live State
Every privileged operation MUST be authorized on the server, immediately before it is performed,
against state read fresh from the application's own datastore — never from a token claim alone,
never from a routing layer, and never from the client.

The following are binding consequences, not guidance:

- A user's role and active/inactive status MUST be re-read from the application's user table on
  every protected request. A token claim MAY carry a role for UX purposes but MUST be documented as
  non-authoritative: revocation that only takes effect at token expiry is not revocation.
- A role MUST NEVER be sourced from any field its subject can write. Auth-provider user metadata is
  subject-writable and is therefore FORBIDDEN as a role carrier. A server-owned invitation record is
  the only trusted carrier of an assigned role.
- Route middleware is a redirect convenience and MUST NOT be treated as a security boundary; every
  protected surface MUST re-check independently. A hidden or disabled UI control is cosmetic and is
  not a permission.
- Server Actions are public HTTP endpoints with stable identifiers. Each one MUST begin with its own
  authorization check. Being rendered inside a privileged layout authorizes nothing.
- Data-access functions MUST take the authorized actor as an explicit first parameter, typed so that
  the value can only be produced by passing a guard. A missing authorization check MUST fail the
  build, not depend on a reviewer noticing it.
- Invariants that span rows — "at least one active Admin MUST exist at all times" is the governing
  example — MUST be enforced under an explicit lock or a serializable transaction. A read-then-write
  count check under the default isolation level does NOT enforce them; it permits write skew, and
  MUST NOT be shipped as though it did. Any such invariant MUST be covered by a test that issues
  overlapping transactions on two separate connections. A single-threaded test passes against the
  broken implementation and therefore evidences nothing.
- Row-Level Security MUST be enabled and default-deny on every application table. It MUST be
  described honestly, in the plan and in any ADR, as a blast-radius limiter for credential leakage —
  a privileged ORM connection bypasses it. RLS MUST NOT be presented as the authorization model.

**Rationale**: This project is adding privileged operations for the first time, and the failure
modes are well known and uniformly silent: a role read from user-writable metadata is full privilege
escalation; a middleware redirect mistaken for a check is bypassed by a direct request; an
unauthorized Server Action is a public mutation endpoint; a `count() > 1` guard on the last-Admin
rule passes every test that can be written single-threaded and then permanently locks the
organisation out under a two-user race. Naming the enforcement point — server-side, per request,
from live state — is what makes the remaining bullets derivable rather than a list to memorise.

## Technology Constraints

- **Hosting**: Vercel (Free/Hobby tier) is the approved MVP target. Moving to a paid tier requires
  explicit sign-off, per Principle V.
- **Rendering stack**: Playwright plus a serverless-trimmed Chromium build (e.g. `@sparticuz/chromium`)
  for HTML→PDF. Do not add a full Puppeteer bundled-Chromium dependency — it risks the
  bundle-size/memory failures documented in `projectplan.md` §10.
- **Server runtime**: Node. The Edge runtime MUST NOT be targeted anywhere in the application —
  the render path's Chromium dependencies and the database driver both require Node APIs, and the
  route-middleware runtime is fixed to Node by the framework and is not configurable.
- **Fonts**: Body type MUST be self-hosted `.woff2` and awaited via `document.fonts.ready` before
  printing; no runtime dependency on Google Fonts or another network font CDN. The shipped face is
  **Arimo**, chosen for metric compatibility with the reference document's Helvetica, which cannot be
  named directly because `@sparticuz/chromium` ships no system fonts.
- **Static fonts only — variable fonts are FORBIDDEN.** Chromium converts variable fonts to Type3 in
  PDF output, which drops the ToUnicode map and silently breaks text selection and search. This also
  rules out Google Fonts as a *source* for Arimo, which it serves variable-only; use per-weight static
  files (e.g. from `@fontsource`).
- **Brand assets**: Exactly one letterhead raster may be bundled — `assets/brand/letterhead.png`, the
  composite extracted losslessly from `docs/reference-letter-head.pdf` (Principle II). Everything in
  `docs/` is reference-only and MUST NOT be bundled or fetched by the render path.
- **Data**: Supabase Postgres is the approved datastore, accessed through Prisma. Serverless
  functions MUST connect through the managed connection pooler; a direct database connection from a
  function is FORBIDDEN. The database exists for identity, authorization, and usage metrics. The
  service/tool catalog remains a hardcoded constant sourced from `tools.md` — migrating it to a
  DB/CMS is still a separate, deliberate v2 decision (see PHR-0001) and MUST NOT be pulled forward
  as a side effect of introducing a database.
- **Authentication**: Supabase Auth, passwordless (emailed magic link). The application MUST NOT
  store, hash, reset, or transmit passwords. The auth provider's own user schema is owned by the
  provider and MUST NOT be managed by application migrations; the application's user table mirrors
  it by id and is the only table the application's authorization logic reads.
- **Persisted data minimisation**: Generated PDFs MUST NOT be persisted to object storage or to the
  database. A usage record MUST store no proposal content — an actor, a timestamp, and nothing that
  is not required to produce a count.
- **UI**: `app/globals.css` is the source of truth for the proposal surface and MUST NOT be migrated
  to a utility framework. A utility framework adopted for the dashboard MUST be scoped so that it
  cannot restyle existing surfaces: its base/reset layer MUST be omitted and its class scanner MUST
  be restricted to dashboard sources. Where a component library offers vendored source, that MUST be
  preferred over a runtime dependency, so a version mismatch is a text edit rather than a block.
- **Environment**: Repo scripting is PowerShell-only (`.specify/scripts/powershell/`). Do not
  introduce a parallel Bash script path unless it is actually implemented and tested (see
  `CLAUDE.md`'s "PHR script gap" note) — command docs that assume `create-phr.sh` exists are
  currently aspirational, not descriptive of this repo.

## Code Quality Standards

- Prefer the smallest viable diff; never refactor code unrelated to the task at hand.
- Do not invent APIs, data shapes, or third-party contracts; ask a targeted clarifying question
  when a dependency's behavior is unconfirmed rather than guessing.
- Cite existing code precisely (path + line range) when referencing it during review or planning;
  propose new code in fenced blocks.
- No dead or speculative code: no unused feature flags, no "just in case" configuration options,
  no half-finished implementations left in the tree.
- Comments explain non-obvious *why* (a hidden constraint, a workaround, a subtle invariant),
  never restate *what* the code already says. Values tuned empirically against a reference MUST say
  so, so a later reader does not "clean up" a number that is load-bearing.
- Assumptions about external artifacts MUST record their provenance — who produced the artifact,
  with what tool, and whether an editable source exists — before being built upon. An unverified
  provenance assumption invalidated Principle II once already; treat it as a known failure mode.
- An artifact MUST be inspected in full before its contents are summarized or relied upon. Rendering
  or opening *part* of a file is not reading it: `reference-letter-head.pdf` was described as a
  letterhead swatch for weeks because only its image layer was examined and never its text layer,
  and that summary propagated into `CLAUDE.md` and shaped the plan.
- Where a rule can be enforced by the type system, a database constraint, or the build, it MUST be —
  in preference to a convention, a lint rule, or a review checklist. Conventions decay silently;
  a compile error or a rejected write does not.

## Security Requirements

- No secrets, API keys, or tokens MUST ever be hardcoded; all such values load from `.env`
  (untracked), with `.env.example` documenting the required keys.
- Privileged service credentials (an admin/service key that bypasses row-level access control) MUST
  be confined to a single server-only module, MUST NOT be imported anywhere else, and MUST NEVER
  carry a client-exposed environment-variable prefix.
- The proposal form and its API route MUST validate and sanitize all rep-entered input
  server-side before it is interpolated into the rendered HTML, preventing HTML/script injection
  into the PDF template. Client-side validation is a UX affordance and MUST NOT be relied on as a
  trust boundary.
- The rendering pipeline MUST NOT fetch remote content (fonts, images, scripts) at render time —
  all assets MUST be bundled locally and inlined, closing off a class of SSRF/data-exfiltration
  risk inside the serverless render step. The letterhead raster is inlined as a data URI for this
  reason, not merely for latency.
- Session cookies MUST be written with the cache-control headers the SSR auth client supplies.
  Dropping them permits a shared cache or CDN to serve one user's session to another.
- Removing a user MUST be implemented as reversible deactivation, not row deletion, and records
  attributable to that user MUST survive it. Irreversible destruction of an audit trail is a
  security regression, not a cleanup.
- Storage and authentication MUST follow least-privilege access (scoped credentials, no shared
  admin keys) and MUST be reflected in this constitution and `CLAUDE.md` before being merged, not
  after the fact.
- Any bootstrap or recovery path that grants administrative access MUST NOT exist as a deployed
  runtime surface. First-admin creation is an operator action that refuses to run once an active
  administrator exists; lockout recovery is a documented manual procedure requiring provider
  console credentials. A break-glass endpoint inside the application is the backdoor it was meant
  to avoid.

## Workflow Rules

- Every user prompt MUST be captured as a Prompt History Record (PHR) under `history/prompts/`,
  routed by stage per `.claude/commands/sp.phr.md` (constitution work → `history/prompts/constitution/`;
  feature-stage work → `history/prompts/<feature-name>/`; pre-feature/general work →
  `history/prompts/general/`).
- Architecturally significant decisions MUST be surfaced as an ADR suggestion and MUST NOT be
  auto-created — the user's explicit consent is required before `/sp.adr` writes a record.
- Feature branches MUST follow the `NNN-short-name` convention enforced by `Test-FeatureBranch`
  in `.specify/scripts/powershell/common.ps1`.
- `CLAUDE.md` MUST be updated in the same change whenever a spec, feature, plan, tasks file, this
  constitution, or another architecturally-defining artifact changes — it is a live snapshot of
  the repo, not a one-time document (see `CLAUDE.md`'s "Keeping this file current" section).
- Ambiguous requirements, unforeseen dependencies, or architecturally uncertain forks in approach
  MUST be raised to the user for a decision rather than silently assumed.
- When new information falsifies a premise this constitution relies on, the principle MUST be
  amended through the procedure below — never silently reinterpreted to fit the new circumstance.
- A verification claim MUST state the environment that produced it. "Tests pass" is incomplete;
  which suite, against which build, is the claim. This project has been misled twice by the same
  gap: the integration suite runs against a production build and so cannot evidence dev-mode
  behaviour, and its `reuseExistingServer` setting means it silently tests whatever already occupies
  port 3000 rather than the build it names.
- A known defect in a surface a new feature depends on MUST be fixed before that feature is built on
  top of it, or the plan MUST state explicitly why deferring it is safe. Layering a feature over a
  known failure both compounds the failure and disguises its cause.

## Governance

This constitution supersedes any conflicting ad-hoc practice. All specs, plans, and tasks MUST be
checked against it — `/sp.analyze` treats a constitution conflict as automatically CRITICAL,
requiring the spec/plan/tasks to change, not the principle to be silently reinterpreted or diluted.

**Source of truth.** Only this constitution and the current feature's `specs/<feature>/spec.md` bind
new work. `projectplan.md` and `problemstatement` are **historical records of the 2026-07 MVP
decision** and MUST NOT be treated as scope, requirements, or constraints on anything built after it;
both are banner-marked as such. Where this document cites them, it cites them as *evidence of origin*
— the reasoning that produced a rule, preserved so the rule does not look arbitrary — never as an
authority a rule defers to. Every principle below stands on its own text. A new feature MUST NOT be
assessed against the MVP's scope statements, and their staleness is not a defect to be repaired: they
are a record of what was decided, and they are accurate as that.

`tools.md`, `design.md`, `whaz.md`, `docs/reference-letter-head.pdf`, and `docs/ARCHITECTURE.md`
remain live references and are unaffected by the above.

**Amendment procedure**: Amendments are proposed via `/sp.constitution`, must state which
principle(s) are added, changed, or removed and why, and take effect immediately upon being
written to this file — there is no separate approval workflow beyond the user driving that command.
An amendment that reverses a normative rule MUST cite the evidence that motivated it, so a future
reader can distinguish a correction from a drift.

**Implementation MUST NOT precede its amendment.** Where code has already shipped against a rule this
document still forbids, that gap MUST be recorded explicitly (in `CLAUDE.md` and the relevant plan)
until the amendment lands. Principle II reached that state on 2026-07-26 and was resolved by v3.0.0.
Principle III's amendment to v4.0.0 on 2026-08-01 is the intended ordering rather than a correction:
no authentication, database, or authorization code had been written when it landed.

**Versioning policy**: Semantic versioning (MAJOR.MINOR.PATCH) — MAJOR for backward-incompatible
principle removal or redefinition, MINOR for a new principle or a materially expanded section,
PATCH for wording or clarification fixes that carry no normative change.

**Compliance review**: Every `/sp.plan` run MUST re-check its Constitution Check section against
this file, both before Phase 0 research and after Phase 1 design. Every `/sp.analyze` run MUST
flag constitution violations as CRITICAL findings.

**Version**: 4.0.1 | **Ratified**: 2026-07-17 | **Last Amended**: 2026-08-01
