import { Link } from 'react-router-dom'
import type { AutomationAlert } from '@/types/campaignAutomation.types'

type CommandCenterAlertsProps = {
  alerts: AutomationAlert[]
}

const SEVERITY_STYLES: Record<AutomationAlert['severity'], string> = {
  high: 'border-red-200 bg-red-50 text-red-900',
  medium: 'border-amber-200 bg-amber-50 text-amber-900',
  low: 'border-blue-200 bg-blue-50 text-blue-900',
}

export function CommandCenterAlerts({ alerts }: CommandCenterAlertsProps) {
  if (alerts.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-heading">Operational Alerts</h2>
        <p className="mt-1 text-sm text-secondary">Issues that need attention now</p>
      </div>
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              to={alert.route}
              className={[
                'block rounded-lg border px-4 py-3 transition-shadow hover:shadow-card',
                SEVERITY_STYLES[alert.severity],
              ].join(' ')}
            >
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="mt-1 text-sm opacity-90">{alert.message}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
