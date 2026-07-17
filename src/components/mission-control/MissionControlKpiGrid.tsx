import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import type { MissionControlKpi } from '@/lib/missionControl/buildAdminMissionControl'

type MissionControlKpiGridProps = {
  kpis: MissionControlKpi[]
}

const KPI_ICONS: Record<string, IconName> = {
  connected: 'users',
  remaining: 'search',
  rukns: 'handshake',
  'active-today': 'pulse-healthy',
  'my-connected': 'users',
  'visits-due': 'calendar',
  'registration-pending': 'check',
  'tarbiyati-pending': 'sprout',
  'ijtema-attention': 'users',
  'profile-completion': 'check',
  attendance: 'check',
  'baitul-maal': 'heart',
  development: 'sprout',
}

const KPI_TONES: Record<string, string> = {
  connected: 'mc-kpi-tone-green',
  remaining: 'mc-kpi-tone-amber',
  rukns: 'mc-kpi-tone-blue',
  'active-today': 'mc-kpi-tone-blue',
  'my-connected': 'mc-kpi-tone-green',
  'visits-due': 'mc-kpi-tone-amber',
  'registration-pending': 'mc-kpi-tone-amber',
  'tarbiyati-pending': 'mc-kpi-tone-blue',
  'ijtema-attention': 'mc-kpi-tone-amber',
  'profile-completion': 'mc-kpi-tone-blue',
  attendance: 'mc-kpi-tone-blue',
  'baitul-maal': 'mc-kpi-tone-amber',
  development: 'mc-kpi-tone-purple',
}

export function MissionControlKpiGrid({ kpis }: MissionControlKpiGridProps) {
  return (
    <ul className="mc-kpi-grid" aria-label="Key performance indicators">
      {kpis.map((kpi) => {
        const icon = KPI_ICONS[kpi.id] ?? 'chart'
        const tone = KPI_TONES[kpi.id] ?? 'mc-kpi-tone-neutral'
        const content = (
          <>
            <div className="mc-kpi-head">
              <span className={`mc-kpi-icon ${tone}`} aria-hidden="true">
                <Icon name={icon} size="md" />
              </span>
              <span className="mc-kpi-label">{kpi.label}</span>
            </div>
            <span className="mc-kpi-value">{kpi.value}</span>
            {kpi.hint ? <span className="mc-kpi-hint">{kpi.hint}</span> : null}
            <span className={`mc-kpi-accent ${tone}`} aria-hidden="true" />
          </>
        )
        return (
          <li key={kpi.id} className={`mc-kpi-card ${tone}`}>
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
