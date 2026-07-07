import { EnterpriseSectionHeader } from '@/components/enterprise'
import { getCampaignIntelligenceData } from '@/lib/commandCenterPresentation'

export function CommandCenterIntelligence() {
  const data = getCampaignIntelligenceData()
  const totalGender = data.maleKarkuns + data.femaleKarkuns || 1
  const malePct = Math.round((data.maleKarkuns / totalGender) * 100)
  const femalePct = 100 - malePct

  const metrics = [
    { label: 'Coverage', value: `${data.coveragePct}%`, hint: 'Rukns with assignments' },
    { label: 'Execution', value: `${data.executionPct}%`, hint: 'Visit completion rate' },
    { label: 'Activation', value: `${data.activationPct}%`, hint: 'Campaign health score' },
    { label: 'Assigned Karkuns', value: String(data.assignedKarkuns), hint: 'Currently assigned' },
  ]

  return (
    <section className="enterprise-card p-6 lg:p-8">
      <EnterpriseSectionHeader
        title="Campaign Intelligence"
        subtitle="Calculated from existing campaign services"
      />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <li
            key={metric.label}
            className="rounded-xl border border-border bg-surface-muted/40 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-text-heading">{metric.value}</p>
            <p className="mt-1 text-xs text-secondary">{metric.hint}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-text-heading">Gender Distribution</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-muted">
            <div className="bg-primary" style={{ width: `${malePct}%` }} title={`Male ${malePct}%`} />
            <div className="bg-primary-light" style={{ width: `${femalePct}%` }} title={`Female ${femalePct}%`} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-secondary">
            <span>Male {data.maleKarkuns} ({malePct}%)</span>
            <span>Female {data.femaleKarkuns} ({femalePct}%)</span>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-text-heading">Trends & Forecast</p>
          <ul className="mt-3 space-y-2 text-sm text-secondary">
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
