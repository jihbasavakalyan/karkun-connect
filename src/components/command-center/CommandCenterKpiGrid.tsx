import { EnterpriseKpiCard } from '@/components/enterprise'
import { enrichKpiPresentation } from '@/lib/commandCenterPresentation'
import type { CommandCenterKpi } from '@/types/campaignAutomation.types'

type CommandCenterKpiGridProps = {
  kpis: CommandCenterKpi[]
}

export function CommandCenterKpiGrid({ kpis }: CommandCenterKpiGridProps) {
  return (
    <section>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
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
