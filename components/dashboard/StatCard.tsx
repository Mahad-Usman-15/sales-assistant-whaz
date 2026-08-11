/**
 * A single figure with its label (FR-018, FR-019).
 *
 * Server Component: it renders a number and never needs interactivity.
 */
export function StatCard({
  label,
  value,
  subline,
}: {
  label: string;
  value: number;
  subline?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-1 px-6 py-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl text-foreground tabular-nums">{value}</p>
      {/* FR-037: zero is a deliberate state with an explanation, never a bare blank. */}
      {subline && <p className="mt-1 text-sm text-muted">{subline}</p>}
    </div>
  );
}
