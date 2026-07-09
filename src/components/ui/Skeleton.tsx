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
