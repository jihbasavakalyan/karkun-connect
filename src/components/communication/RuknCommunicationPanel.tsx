import { Link } from 'react-router-dom'
import { BroadcastComposerPanel } from '@/components/communication/BroadcastComposerPanel'
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import { IndividualMessagesPanel } from '@/components/communication/IndividualMessagesPanel'
import { getArkaanRecipientGroup } from '@/lib/communication/arkaanRecipientGroup'
import { summarizeAudienceActivity } from '@/lib/communication/audiencePresentation'
import { adminCommunicationPath } from '@/lib/communicationNavigation'
import { formatHistoryTimestamp } from '@/services/historyService'
import { useCommunication } from '@/hooks/useCommunication'

/**
 * KC-0077 — Rukn Communication hub (Admin → Rukn).
 * Reuses broadcast, daily reports, and individual send — no new delivery logic.
 */
export function RuknCommunicationPanel() {
  const { history } = useCommunication()
  const arkaan = getArkaanRecipientGroup()
  const activity = summarizeAudienceActivity(history, 'rukn')

  return (
    <div className="space-y-6">
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h2 className="text-lg font-semibold text-text-heading">Rukn Communication</h2>
        <p className="mt-1 text-sm text-secondary">
          Daily instructions, campaign guidance, announcements, meeting notices, and operational
          reminders for Arkaan.
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-secondary">
              Recipients (Arkaan)
            </dt>
            <dd className="mt-1 text-xl font-semibold text-text-heading">{arkaan.recipients.length}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Last sent</dt>
            <dd className="mt-1 text-sm font-medium text-text-heading">
              {activity.lastSentAt ? formatHistoryTimestamp(activity.lastSentAt) : '—'}
            </dd>
            {activity.lastRecipientName ? (
              <p className="text-xs text-secondary">{activity.lastRecipientName}</p>
            ) : null}
          </div>
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-secondary">
              Delivery status
            </dt>
            <dd className="mt-1">
              {activity.lastStatus ? (
                <CommunicationStatusBadge status={activity.lastStatus} />
              ) : (
                <span className="text-sm text-secondary">No Rukn messages yet</span>
              )}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-secondary">
          {activity.messageCount} Rukn message{activity.messageCount === 1 ? '' : 's'} in history ·{' '}
          <Link to={adminCommunicationPath('history')} className="font-medium text-primary hover:underline">
            Open Rukn history
          </Link>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={adminCommunicationPath('daily-reports')}
            className="inline-flex min-h-9 items-center rounded-lg bg-primary-muted px-3 py-1.5 text-sm font-medium text-primary"
          >
            Daily Reports
          </Link>
          <Link
            to={adminCommunicationPath('broadcast')}
            className="inline-flex min-h-9 items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-heading"
          >
            Broadcast to Arkaan
          </Link>
          <Link
            to={adminCommunicationPath('templates')}
            className="inline-flex min-h-9 items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-heading"
          >
            Rukn Official Communications
          </Link>
        </div>
      </section>

      <BroadcastComposerPanel />
      <IndividualMessagesPanel lockedKind="rukn" title="Message a Rukn" />
    </div>
  )
}
