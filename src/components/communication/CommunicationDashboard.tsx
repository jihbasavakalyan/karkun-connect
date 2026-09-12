import { Link } from 'react-router-dom'
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import { CommunicationSummaryCards } from '@/components/communication/CommunicationSummaryCards'
import { ROUTES } from '@/constants/routes'
import { adminCommunicationPath, COMMUNICATION_INBOX_NAV } from '@/lib/communicationNavigation'
import { countUnreadInboxItems } from '@/lib/peopleLifecycle'
import { formatHistoryTimestamp } from '@/services/historyService'
import { useCommunication } from '@/hooks/useCommunication'
import { ListSkeleton } from '@/components/ui'

export function CommunicationDashboard({ ready = true }: { ready?: boolean }) {
  const { metrics, recentActivity } = useCommunication()
  const inboxAttention = ready ? countUnreadInboxItems() : null

  if (!ready) {
    return <ListSkeleton rows={6} />
  }

  return (
    <div className="space-y-6">
      <CommunicationSummaryCards />

      <section className="kc-panel p-4 sm:p-5" aria-labelledby="comm-inbox-heading">
        <h2
          id="comm-inbox-heading"
          className="text-lg font-semibold text-text-heading"
          dir="rtl"
          lang="ur"
        >
          {COMMUNICATION_INBOX_NAV.label}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          Administrative intake and one-way Rukn messages. Opens the existing Inbox workflow — not
          communication history.
        </p>
        {inboxAttention != null && inboxAttention > 0 ? (
          <p className="mt-2 text-sm font-medium text-text-heading" role="status">
            {inboxAttention} item{inboxAttention === 1 ? '' : 's'} require your attention
          </p>
        ) : (
          <p className="mt-2 text-sm text-secondary" role="status">
            No items requiring attention right now.
          </p>
        )}
        <Link
          to={ROUTES.ADMIN_INBOX}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Open {COMMUNICATION_INBOX_NAV.label} →
        </Link>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="kc-panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-text-heading">Top Official Communications</h2>
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
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            Custom Communications →
          </Link>
        </section>

        <section className="kc-panel p-4 sm:p-5">
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
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            View history →
          </Link>
        </section>

        <section className="kc-panel p-4 sm:p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-heading">Daily Reports</h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Generate Urdu progress messages for Arkaan from live campaign metrics.
          </p>
          <Link
            to={adminCommunicationPath('daily-reports')}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            Open Daily Reports →
          </Link>
        </section>
      </div>
    </div>
  )
}
