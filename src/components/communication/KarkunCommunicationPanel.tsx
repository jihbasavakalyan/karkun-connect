import { Link } from 'react-router-dom'
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import { IndividualMessagesPanel } from '@/components/communication/IndividualMessagesPanel'
import {
  filterTemplatesByAudience,
  summarizeAudienceActivity,
} from '@/lib/communication/audiencePresentation'
import { adminCommunicationPath } from '@/lib/communicationNavigation'
import { formatHistoryTimestamp } from '@/services/historyService'
import { listTemplates } from '@/services/templateService'
import { useCommunication } from '@/hooks/useCommunication'

/**
 * KC-0077 — Karkun Communication hub (Admin / Rukn → Karkun).
 * Reuses individual messaging and templates — no new delivery logic.
 */
export function KarkunCommunicationPanel() {
  const { history } = useCommunication()
  const activity = summarizeAudienceActivity(history, 'karkun')
  const exampleTemplates = filterTemplatesByAudience(listTemplates(), 'karkun').slice(0, 5)

  return (
    <div className="space-y-6">
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h2 className="text-lg font-semibold text-text-heading">Karkun Communication</h2>
        <p className="mt-1 text-sm text-secondary">
          Visit reminders, meeting invitations, follow-ups, appreciation, and campaign information
          for Karkuns.
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-secondary">
              Messages in history
            </dt>
            <dd className="mt-1 text-xl font-semibold text-text-heading">{activity.messageCount}</dd>
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
                <span className="text-sm text-secondary">No Karkun messages yet</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-text-heading">Example templates</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {exampleTemplates.map((template) => (
              <li
                key={template.id}
                className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-text-heading"
              >
                {template.name}
              </li>
            ))}
          </ul>
          <Link
            to={adminCommunicationPath('templates')}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Browse Karkun templates →
          </Link>
        </div>
      </section>

      <IndividualMessagesPanel lockedKind="karkun" title="Message a Karkun" />
    </div>
  )
}
