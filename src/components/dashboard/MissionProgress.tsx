type MissionProgressProps = {
  progress: number
  label?: string
  variant?: 'card' | 'inline'
}

export function MissionProgress({
  progress,
  label = 'Mission Progress',
  variant = 'card',
}: MissionProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  const content = (
    <>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-text-heading">{label}</h3>
        <span className="text-sm font-semibold text-primary">{clampedProgress}%</span>
      </div>

      <div
        className="h-3 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${clampedProgress}%`}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </>
  )

  if (variant === 'inline') {
    return <div className="mt-4">{content}</div>
  }

  return (
    <section className="mt-4 rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      {content}
    </section>
  )
}
