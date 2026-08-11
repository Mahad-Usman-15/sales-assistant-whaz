import { LoadingSkeleton } from '@/components/dashboard/States';

// FR-037: a distinct loading state, never a blank region.
export default function Loading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <LoadingSkeleton className="h-28" />
      <LoadingSkeleton className="h-28" />
    </div>
  );
}
