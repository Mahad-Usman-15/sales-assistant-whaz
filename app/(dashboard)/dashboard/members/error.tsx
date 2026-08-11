'use client';

import { ErrorState, UnavailableState } from '@/components/dashboard/States';

// FR-038: this section failing must not take the rest of the dashboard down with it.
export default function MembersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (/temporarily_unavailable|StoreUnavailable/.test(error.message)) {
    return <UnavailableState onRetry={reset} />;
  }
  return <ErrorState hint="Couldn't load members." onRetry={reset} />;
}
