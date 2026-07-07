import { EnterpriseKpiCard, EnterpriseSectionHeader } from '@/components/enterprise'
import { enrichKpiPresentation } from '@/lib/commandCenterPresentation'
import type { CommandCenterKpi } from '@/types/campaignAutomation.types'

type CommandCenterKpiGridProps = {
  kpis: CommandCenterKpi[]
}

export function CommandCenterKpiGrid({ kpis }: CommandCenterKpiGridProps) {
  return (
    <section className="space-y-4">
      <EnterpriseSectionHeader
        title="Campaign Metrics"
        subtitle="Live counts from every campaign engine — tap any card to act"
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const enriched = enrichKpiPresentation(kpi)
          return (
            <EnterpriseKpiCard
              key={kpi.id}
              label={enriched.label}
              value={enriched.value}
              route={enriched.route}
              icon={enriched.icon}
              subtitle={enriched.subtitle}
              trend={enriched.trend}
              suffix={enriched.suffix}
            />
          )
        })}
      </ul>
    </section>
  )
}
