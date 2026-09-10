import type { TrainingRuknProgressView } from '@/lib/publicRegistration/types'

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-2 py-2 text-center sm:px-3">
      <p className="text-[11px] leading-tight text-secondary sm:text-xs">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-heading">{value}</p>
    </div>
  )
}

type TrainingRegistrationProgressMetricsProps = {
  progress: TrainingRuknProgressView
}

/** Category-separate registration counts. Never combine Karkun and Muttafiq. */
export function TrainingRegistrationProgressMetrics({
  progress,
}: TrainingRegistrationProgressMetricsProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] font-medium text-secondary">Karkun</p>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Connected Karkuns" value={progress.connectedCount} />
          <Metric label="Registered" value={progress.registeredCount} />
          <Metric label="Not Registered" value={progress.notRegisteredCount} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium text-secondary">Muttafiq</p>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Connected Muttafiq" value={progress.muttafiqConnectedCount} />
          <Metric label="Registered" value={progress.muttafiqRegisteredCount} />
          <Metric label="Not Registered" value={progress.muttafiqNotRegisteredCount} />
        </div>
      </div>
    </div>
  )
}
