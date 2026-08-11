'use client';

import { ErrorState, UnavailableState } from '@/components/dashboard/States';

/**
 * FR-038: one failing section must not take down the rest of the dashboard.
 * FR-045: an unreachable datastore is reported as its own state, not as a generic failure.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (/temporarily_unavailable|StoreUnavailable/.test(error.message)) {
    return <UnavailableState onRetry={reset} />;
  }
  return <ErrorState hint="We couldn't load your dashboard." onRetry={reset} />;
}
