import { EnterpriseProgressRing, EnterpriseSectionHeader } from '@/components/enterprise'
import { getCampaignProgressOverview } from '@/lib/commandCenterPresentation'

type ProgressBarProps = {
  label: string
  value: number
}

function ProgressBar({ label, value }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div>
      <div className="mb-0 flex items-center justify-between text-[10px] leading-tight">
        <span className="font-medium text-text-heading">{label}</span>
        <span className="font-semibold text-primary">{clamped}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-primary-light transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function CommandCenterProgressOverview() {
  const overview = getCampaignProgressOverview()

  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Campaign Progress" />
      <div className="mt-1.5 flex items-center gap-3">
        <EnterpriseProgressRing value={overview.overall} label="" size={64} />
        <div className="min-w-0 flex-1 space-y-1">
          <ProgressBar label="Execution" value={overview.execution} />
          <ProgressBar label="Coverage" value={overview.coverage} />
          <ProgressBar label="Follow-up" value={overview.followUp} />
          <ProgressBar label="Compliance" value={overview.compliance} />
          <ProgressBar label="Assignment" value={overview.assignment} />
        </div>
      </div>
    </section>
  )
}
