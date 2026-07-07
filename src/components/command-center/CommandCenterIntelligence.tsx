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
      <ul className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <li key={metric.label} className="rounded border border-border bg-surface-muted/40 p-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">{metric.label}</p>
            <p className="text-lg font-bold text-text-heading">{metric.value}</p>
          </li>
        ))}
      </ul>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <div className="rounded border border-border p-2">
          <p className="text-xs font-semibold text-text-heading">Gender Distribution</p>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className="bg-primary" style={{ width: `${malePct}%` }} title={`Male ${malePct}%`} />
            <div className="bg-primary-light" style={{ width: `${femalePct}%` }} title={`Female ${femalePct}%`} />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] text-secondary">
            <span>M {data.maleKarkuns} ({malePct}%)</span>
            <span>F {data.femaleKarkuns} ({femalePct}%)</span>
          </div>
        </div>

        <div className="rounded border border-border p-2">
          <p className="text-xs font-semibold text-text-heading">Trends & Forecast</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-secondary">
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
