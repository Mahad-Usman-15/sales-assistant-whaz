'use client';

import { cx } from './utils';

/**
 * Loading, empty, error and unavailable states (FR-037, FR-038, FR-045).
 *
 * All four exist because the spec forbids a blank region standing in for any of them. They are
 * hand-written rather than pulled from a component library — each is a heading and a paragraph, and
 * a dependency for that would be silly (constitution: no speculative dependencies).
 */

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx('animate-pulse rounded-card bg-surface-2', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface-1 px-6 py-8 text-center">
      <p className="text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({
  title = "That didn't load",
  hint,
  onRetry,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-card border border-border bg-surface-1 px-6 py-8 text-center"
      role="alert"
    >
      <p className="text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-control border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * FR-045: an unreachable member store is its own state, visually and semantically distinct from a
 * failure of the thing the member was doing. Collapsing them sends people looking in the wrong
 * place — the whole reason the route returns 503 rather than 500.
 */
export function UnavailableState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Temporarily unavailable"
      hint="We couldn't reach our records just now. Nothing is lost — try again shortly."
      onRetry={onRetry}
    />
  );
}
