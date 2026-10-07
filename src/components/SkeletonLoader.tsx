

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`shimmer rounded bg-[#E6E6E6] ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="panel flex w-40 flex-none flex-col p-3 md:w-auto">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-2 h-20 w-full" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-[10px] border border-[color:var(--line)]">
      <Skeleton className="absolute inset-0 !rounded-none" />
      <div className="absolute left-1/2 top-1/2 z-10 w-48 -translate-x-1/2 -translate-y-1/2 space-y-2 border border-[color:var(--line)] bg-white/95 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="panel grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}