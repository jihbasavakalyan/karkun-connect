import { Link } from 'react-router-dom'
import type { CommandCenterKpi } from '@/types/campaignAutomation.types'

type CommandCenterKpiGridProps = {
  kpis: CommandCenterKpi[]
}

export function CommandCenterKpiGrid({ kpis }: CommandCenterKpiGridProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-heading">Operational KPIs</h2>
        <p className="mt-1 text-sm text-secondary">Live counts from campaign engines — tap to act</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <li key={kpi.id}>
            <Link
              to={kpi.route}
              className="flex min-h-24 flex-col rounded-lg border border-border bg-surface px-4 py-4 shadow-card transition-shadow hover:border-primary/40 hover:shadow-card-hover"
            >
              <span className="text-sm font-medium text-secondary">{kpi.label}</span>
              <span className="mt-2 text-3xl font-semibold text-text-heading">
                {kpi.value}
                {kpi.id === 'campaign-progress' ? '%' : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
