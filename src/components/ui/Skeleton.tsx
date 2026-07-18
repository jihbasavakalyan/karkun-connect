type SkeletonProps = {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`ds-skeleton ${className}`.trim()} aria-hidden="true" />
}

export function HomePageSkeleton() {
  return (
    <div className="ds-skeleton-page" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-16 w-full rounded-xl" />
      <Skeleton className="mt-8 h-32 w-full rounded-xl" />
      <Skeleton className="mt-4 h-32 w-full rounded-xl" />
    </div>
  )
}

/** Compact list-row placeholders for Connected / Connect screens. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="native-list-skeleton" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="native-list-skeleton-row">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[66%] rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  )
}
