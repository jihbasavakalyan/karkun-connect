import type { ConnectionJourneySnapshot } from '@/lib/connectionJourney'

type ConnectionProgressTrackerProps = {
  snapshot: ConnectionJourneySnapshot
}

export function ConnectionProgressTracker({ snapshot }: ConnectionProgressTrackerProps) {
  const percent = Math.round((snapshot.completedCount / snapshot.totalCount) * 100)

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {snapshot.steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                step.complete
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-border bg-surface text-secondary'
              }`}
              aria-hidden="true"
            >
              {step.complete ? '✓' : '○'}
            </span>
            <span
              className={step.complete ? 'font-medium text-text-heading' : 'text-secondary'}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
