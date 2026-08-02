# ADR-0004: Dashboard UI Stack and Design-System Coexistence

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted *(plan approved; implementation not yet started)*
- **Date:** 2026-08-01
- **Feature:** 002-rbac-dashboard
- **Context:** How the dashboard is built and styled without disturbing the hand-written brand CSS
  that the existing proposal form depends on.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Context

The dashboard needs stat tiles, a members table, dialogs, and badges. The application it joins has
**455 lines of hand-written, hand-tuned brand CSS** in `app/globals.css`, transcribed from
`WEB_DESIGN.md`, which is the source of truth for the proposal form's appearance.

The hard constraint is FR-040 and SC-008: introducing the dashboard **MUST NOT change the appearance
of the existing generator**, verified by a before/after visual comparison. That surface is brand
material, and Constitution Principle II treats drift on brand surfaces as a defect.

The specific danger is concrete, not theoretical. `globals.css` styles **bare element selectors** —
`input` gets a 44px minimum height, a `--raise-1` background, and a 3px `:focus-visible` outline. Any
CSS reset (Tailwind Preflight in particular) would overwrite exactly those rules and silently
restyle the form.

Two further constraints shape the choice:

- **React 19.** `@tremor/react@3.18.7` is the legacy package and carries a `react: ^18` peer.
- **FR-044** requires **WCAG 2.2 AA** on the new views: keyboard operability, focus trapped in modal
  dialogs and returned on close, accessible names, and *state never conveyed by colour alone*.

## Decision

Adopt **Tailwind CSS v4 scoped to the dashboard, with vendored Tremor Raw components, bridged to the
existing design tokens**. These parts only make sense together:

- **Utility framework**: Tailwind v4, imported by `app/(dashboard)/dashboard.css` only.
- **Preflight omitted.** v4's CSS-first decomposition lets us import `theme.css` and `utilities.css`
  and simply **not** import `preflight.css`. No config flag, no override — the reset never exists.
  This is the single most important line in the decision.
- **`source(none)` plus explicit `@source` globs** limited to `app/(dashboard)/` and
  `components/dashboard/`. The scanner never reads `ProposalForm.tsx`, so no utility class used only
  by the form can ever be emitted. A **build-time** guarantee, strictly stronger than a class prefix.
- **Token bridge**: a non-inline `@theme` block aliasing Tailwind's namespaced names to the existing
  `:root` variables (`--color-background: var(--surface)`, etc.). Non-inline emits `var()`
  references, so `globals.css` remains the single source of truth and edits propagate without
  rebuilding the bridge. `@theme inline` would sever that link and is forbidden here.
- **Dark-mode reskin by ramp override**: override the `gray-*` scale to a black-based ramp derived
  from `--surface`/`--raise-1/2/3`, and set `class="dark"` on `<html>` (`globals.css` already
  declares `color-scheme: dark`). This reskins every pasted component at once with **zero source
  edits** — the highest-leverage move available, since Tremor Raw is written against `gray-*`/`blue-*`.
- **Components**: **Tremor Raw — vendored source**, copied into `components/dashboard/`, not a runtime
  dependency. Backed by `tailwind-variants` + `clsx` + `tailwind-merge` + `@remixicon/react`, plus
  **only** the Radix packages for components actually pasted.
- **Helper location**: pasted components import `cx` from `@/lib/utils`; that import is rewritten to
  `components/dashboard/utils.ts`. `lib/` is declared framework-free and reserved for the render
  pipeline — creating `lib/utils.ts` would silently violate a stated invariant.
- **Accessibility**: Radix supplies focus trapping, focus restoration, `aria-modal`, and escape
  handling. Remaining AA gaps (accessible names on icon-only row actions, table scope) are edits we
  own. `RoleBadge`/`StatusBadge` carry **text**, not hue alone.
- **Not used**: `@tailwindcss/forms` — its default strategy restyles bare `input`/`select` selectors,
  reintroducing precisely the reset just removed.

## Consequences

### Positive

- **`app/globals.css` is never touched**, and the form cannot be restyled even by accident — the
  scanner is not permitted to see it.
- **One source of truth for tokens.** Editing `:root` in `globals.css` changes the dashboard too.
- **Vendored source turns version mismatch into a text edit.** A v3-era pasted component with
  `bg-opacity-*` is fixed by `npx @tailwindcss/upgrade` on that file — not by waiting for an upstream
  release. This is the decisive advantage over a runtime component dependency.
- **React 19 compatible**, avoiding the legacy `@tremor/react` peer-dependency wall entirely.
- **Accessibility largely inherited** rather than hand-rolled; Radix covers the parts most often
  missed (focus management in dialogs) and most tedious to build correctly.
- **Small dependency surface** — only the Radix packages for components actually used, satisfying
  Principle IV's ban on speculative dependencies.

### Negative

- **Two styling systems coexist permanently.** A contributor must know which surface they are on.
  Accepted deliberately: the alternative — migrating 455 lines of measured brand CSS — is exactly the
  unrelated refactor Principle IV forbids.
- **We own the component source.** Upstream fixes and improvements do not arrive automatically; they
  must be re-copied deliberately.
- **CSS delivery is not scoped, only generation is.** App Router hoists imported CSS document-wide, so
  `dashboard.css` bytes may be served on `/`. With Preflight omitted and utilities inert without
  matching classnames, this is a **payload** concern, not a correctness one — but it should not be
  described as scoping.
- **PostCSS now processes `globals.css` too.** Safe, but it means `/` must be visually verified before
  merging, which is why SC-008 exists.
- **Omitting Preflight means no reset at all** for the dashboard. Cross-browser element defaults are
  ours to handle in the components we paste.
- **The dark reskin depends on a token bridge that could drift.** If `globals.css` renames a variable,
  the bridge breaks silently — utilities resolve to nothing rather than erroring.

## Alternatives Considered

**Alternative A — `@tremor/react` as a runtime dependency.** Rejected: `3.18.7` is legacy with a
`react: ^18` peer, incompatible with React 19, and a version mismatch would be a blocked upgrade
rather than a text edit.

**Alternative B — Tailwind with a class prefix (`tw-`) instead of scoped sources.** Rejected: Tremor
source ships thousands of unprefixed classnames, so every pasted file would need rewriting. It is also
weaker — a prefix prevents collisions but does not stop Preflight, which is the actual risk. And
`globals.css` uses BEM-ish names (`.page__title`, `.form`) that cannot collide with utilities anyway.

**Alternative C — Migrate `globals.css` to Tailwind and unify.** Rejected: 455 lines of hand-tuned
brand CSS measured against `WEB_DESIGN.md`, protecting a surface where Principle II treats drift as a
defect. A large, risky refactor with no requirement behind it.

**Alternative D — Hand-write every dashboard component in plain CSS, matching `globals.css`.** No new
dependencies and perfect stylistic consistency, but it means hand-building an accessible modal dialog
(focus trap, restoration, `aria-modal`, escape, scroll lock) — the exact thing FR-044 requires and
the exact thing that is routinely got wrong. Rejected on risk, not effort.

**Alternative E — shadcn/ui instead of Tremor Raw.** Same vendored-source model and also Radix-backed,
so it clears the same bars. Rejected narrowly: Tremor is purpose-built for dashboard primitives (stat
cards, tables) which is the whole of this feature's UI, and `dashboard.txt` names Tremor explicitly.
Worth revisiting if the dashboard grows beyond metrics and tables.

**Alternative F — CSS Modules for the dashboard.** Genuine scoping of both generation and delivery,
and no reset risk. Rejected: no component library ecosystem, so it collapses into Alternative D's
accessibility problem.

## References

- Feature Spec: [`specs/002-rbac-dashboard/spec.md`](../../specs/002-rbac-dashboard/spec.md) — FR-037…FR-040, **FR-044**, SC-008, SC-010, SC-014
- Implementation Plan: [`specs/002-rbac-dashboard/plan.md`](../../specs/002-rbac-dashboard/plan.md) — Phase 3, Risk #11
- Research: [`specs/002-rbac-dashboard/research.md`](../../specs/002-rbac-dashboard/research.md) — R6 (accessibility), R10 (styling mechanism)
- Verification: [`specs/002-rbac-dashboard/quickstart.md`](../../specs/002-rbac-dashboard/quickstart.md) — Phase 3 and Phase 6 gates
- Design tokens: `WEB_DESIGN.md`, `app/globals.css` `:root`
- Governing policy: `.specify/memory/constitution.md` v4.0.1 — Principle II, Principle IV, Technology Constraints (UI)
- Related ADRs: [ADR-0001](./0001-letterhead-chrome-strategy.md) — **no conflict.** ADR-0001 governs the *PDF* chrome; this ADR governs the *browser* UI. They share a brand-fidelity posture but touch different surfaces, and this decision explicitly protects ADR-0001's surface by never scanning or restyling it.
- Evaluator Evidence: `history/prompts/002-rbac-dashboard/0003-plan-rbac-dashboard.prompt.md`
