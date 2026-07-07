import { EnterpriseSectionHeader } from '@/components/enterprise'
import { getCampaignIntelligenceData } from '@/lib/commandCenterPresentation'

export function CommandCenterIntelligence() {
  const data = getCampaignIntelligenceData()
  const totalGender = data.maleKarkuns + data.femaleKarkuns || 1
  const malePct = Math.round((data.maleKarkuns / totalGender) * 100)
  const femalePct = 100 - malePct

  const metrics = [
    { label: 'Coverage', value: `${data.coveragePct}%` },
    { label: 'Execution', value: `${data.executionPct}%` },
    { label: 'Activation', value: `${data.activationPct}%` },
    { label: 'Assigned', value: String(data.assignedKarkuns) },
  ]

  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Campaign Intelligence" />
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <li key={metric.label} className="rounded-lg border border-border bg-surface-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-secondary">{metric.label}</p>
            <p className="mt-1 text-xl font-bold text-text-heading">{metric.value}</p>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-semibold text-text-heading">Gender Distribution</p>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="bg-primary" style={{ width: `${malePct}%` }} title={`Male ${malePct}%`} />
            <div className="bg-primary-light" style={{ width: `${femalePct}%` }} title={`Female ${femalePct}%`} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-secondary">
            <span>M {data.maleKarkuns} ({malePct}%)</span>
            <span>F {data.femaleKarkuns} ({femalePct}%)</span>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-semibold text-text-heading">Trends & Forecast</p>
          <ul className="mt-2 space-y-1 text-xs text-secondary">
            <li>
              <span className="font-medium text-text-heading">Daily: </span>
              {data.dailyTrend}
            </li>
            <li>
              <span className="font-medium text-text-heading">Weekly: </span>
              {data.weeklyTrend}
            </li>
            <li>
              <span className="font-medium text-text-heading">Forecast: </span>
              {data.completionForecast}
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
