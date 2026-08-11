import { LoadingSkeleton } from '@/components/dashboard/States';

export default function Loading() {
  return (
    <div className="grid gap-4">
      <LoadingSkeleton className="h-10 w-48" />
      <LoadingSkeleton className="h-64" />
    </div>
  );
}
