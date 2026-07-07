import { Link } from 'react-router-dom'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import type { AutomationAlert } from '@/types/campaignAutomation.types'

type CommandCenterAlertsProps = {
  alerts: AutomationAlert[]
}

const SEVERITY_STYLES: Record<AutomationAlert['severity'], string> = {
  high: 'border-red-200 bg-red-50/90 text-red-950',
  medium: 'border-amber-200 bg-amber-50/90 text-amber-950',
  low: 'border-blue-200 bg-blue-50/90 text-blue-950',
}

const SEVERITY_LABELS: Record<AutomationAlert['severity'], string> = {
  high: 'Critical',
  medium: 'Attention',
  low: 'Info',
}

export function CommandCenterAlerts({ alerts }: CommandCenterAlertsProps) {
  return (
    <section id="operational-alerts" className="cc-card-sm flex h-full min-h-[220px] flex-col">
      <EnterpriseSectionHeader title="Operational Alerts" />

      {alerts.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">All queues within expected thresholds.</p>
      ) : (
        <ul className="mt-2 max-h-[180px] flex-1 space-y-2 overflow-y-auto">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Link
                to={alert.route}
                className={[
                  'block rounded-lg border p-2.5 transition-shadow hover:shadow-card',
                  SEVERITY_STYLES[alert.severity],
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold">{alert.title}</p>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide opacity-80">
                    {SEVERITY_LABELS[alert.severity]}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs opacity-90">{alert.message}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
