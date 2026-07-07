import { Link } from 'react-router-dom'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import type { AutomationAlert } from '@/types/campaignAutomation.types'

type CommandCenterAlertsProps = {
  alerts: AutomationAlert[]
}

const SEVERITY_STYLES: Record<AutomationAlert['severity'], string> = {
  high: 'border-red-200 bg-red-50/90 text-red-950 hover:border-red-300',
  medium: 'border-amber-200 bg-amber-50/90 text-amber-950 hover:border-amber-300',
  low: 'border-blue-200 bg-blue-50/90 text-blue-950 hover:border-blue-300',
}

const SEVERITY_LABELS: Record<AutomationAlert['severity'], string> = {
  high: 'Critical',
  medium: 'Attention',
  low: 'Info',
}

export function CommandCenterAlerts({ alerts }: CommandCenterAlertsProps) {
  if (alerts.length === 0) {
    return (
      <section id="operational-alerts" className="enterprise-card p-6">
        <EnterpriseSectionHeader
          title="Operational Alerts"
          subtitle="Automation engine — no active alerts"
        />
        <p className="mt-4 text-sm text-secondary">All operational queues are within expected thresholds.</p>
      </section>
    )
  }

  return (
    <section id="operational-alerts" className="space-y-4">
      <EnterpriseSectionHeader
        title="Operational Alerts"
        subtitle="Issues requiring attention from the automation engine"
      />
      <ul className="grid gap-3 lg:grid-cols-2">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              to={alert.route}
              className={[
                'enterprise-card-interactive block p-4',
                SEVERITY_STYLES[alert.severity],
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{alert.title}</p>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-80">
                  {SEVERITY_LABELS[alert.severity]}
                </span>
              </div>
              <p className="mt-2 text-sm opacity-90">{alert.message}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
