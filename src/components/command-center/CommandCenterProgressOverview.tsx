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
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-text-heading">{label}</span>
        <span className="font-semibold text-primary">{clamped}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
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
    <section className="enterprise-card p-6 lg:p-8">
      <EnterpriseSectionHeader
        title="Overall Campaign Progress"
        subtitle="Live execution dimensions from campaign services"
      />
      <div className="mt-6 flex flex-col items-center gap-8 lg:flex-row lg:items-start">
        <EnterpriseProgressRing value={overview.overall} label="Overall Progress" size={140} />
        <div className="w-full flex-1 space-y-4">
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
