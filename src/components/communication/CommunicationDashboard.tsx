import { Link } from 'react-router-dom'
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import { CommunicationSummaryCards } from '@/components/communication/CommunicationSummaryCards'
import { adminCommunicationPath } from '@/lib/communicationNavigation'
import { formatHistoryTimestamp } from '@/services/historyService'
import { useCommunication } from '@/hooks/useCommunication'

export function CommunicationDashboard() {
  const { metrics, recentActivity } = useCommunication()

  return (
    <div className="space-y-6">
      <CommunicationSummaryCards />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
          <h2 className="text-lg font-semibold text-text-heading">Top Templates</h2>
          {metrics.topTemplates.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No messages sent yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {metrics.topTemplates.map((template) => (
                <li
                  key={template.templateId}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
                >
                  <span className="font-medium text-text-heading">{template.templateName}</span>
                  <span className="text-secondary">{template.count} sent</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={adminCommunicationPath('templates')}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Manage templates →
          </Link>
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
          <h2 className="text-lg font-semibold text-text-heading">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No communication activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentActivity.map((record) => (
                <li
                  key={record.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text-heading">{record.recipient.name}</p>
                    <p className="truncate text-secondary">{record.message}</p>
                    <p className="text-xs text-secondary">{formatHistoryTimestamp(record.sentAt)}</p>
                  </div>
                  <CommunicationStatusBadge status={record.status} />
                </li>
              ))}
            </ul>
          )}
          <Link
            to={adminCommunicationPath('history')}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            View delivery history →
          </Link>
        </section>

        <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-heading">Daily Reports</h2>
          <p className="mt-2 text-sm text-secondary">
            Generate Urdu progress messages for Arkaan from live campaign metrics.
          </p>
          <Link
            to={adminCommunicationPath('daily-reports')}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Open Daily Reports →
          </Link>
        </section>
      </div>
    </div>
  )
}
