import { Link } from 'react-router-dom'
import type { MissionControlKpi } from '@/lib/missionControl/buildAdminMissionControl'

type MissionControlKpiGridProps = {
  kpis: MissionControlKpi[]
}

export function MissionControlKpiGrid({ kpis }: MissionControlKpiGridProps) {
  return (
    <ul className="mc-kpi-grid" aria-label="Key performance indicators">
      {kpis.map((kpi) => {
        const content = (
          <>
            <span className="mc-kpi-label">{kpi.label}</span>
            <span className="mc-kpi-value">{kpi.value}</span>
            {kpi.hint ? <span className="mc-kpi-hint">{kpi.hint}</span> : null}
          </>
        )
        return (
          <li key={kpi.id} className="mc-kpi-card">
            {kpi.route ? (
              <Link to={kpi.route} className="mc-kpi-link">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ul>
  )
}
