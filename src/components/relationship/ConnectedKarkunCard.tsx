import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ruknVisitPath } from '@/constants/routes'
import {
  JourneyStageBadge,
  RelationshipHealthBadge,
} from '@/components/guidance'
import { SchedulePickerModal } from '@/components/communication/SchedulePickerModal'
import { useGuidance } from '@/hooks/useGuidance'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { formatLastVisitLabel } from '@/lib/relationshipPresentation'
import {
  buildConnectedIntelligenceView,
} from '@/lib/relationshipIntelligencePresentation'
import { scheduleWhatsAppMessage } from '@/services/schedulingService'
import { submitAssignmentReviewRequest } from '@/services/assignmentReviewService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { AssignmentReviewReason } from '@/types/assignmentReview.types'
import { ProfileCompletionReminder } from './ProfileCompletionReminder'
import { RequestReviewModal } from '@/components/forms/assignment/RequestReviewModal'
import { Icon } from '@/components/ui/Icon'
import type { MessageRecipient } from '@/types/communication'

type ConnectedKarkunCardProps = {
  karkun: KarkunRegistryRecord
  ruknId: string
  visitPath?: string
}

export function ConnectedKarkunCard({ karkun, ruknId, visitPath }: ConnectedKarkunCardProps) {
  const { getKarkunGuidance, version } = useGuidance(ruknId)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewNotice, setReviewNotice] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleNotice, setScheduleNotice] = useState('')

  void version
  const guidance = getKarkunGuidance(karkun.id)
  const intelligence = useMemo(
    () => buildConnectedIntelligenceView(karkun.id, ruknId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [karkun.id, ruknId, version],
  )
  const journeyPath = visitPath ?? ruknVisitPath(karkun.id)
  const telLink = buildTelLink(karkun.mobile)
  const whatsAppLink = buildWhatsAppLink(karkun.whatsapp?.trim() ? karkun.whatsapp : karkun.mobile)
  const lastVisit = formatLastVisitLabel(karkun.id)
  const lastContact = intelligence?.lastContactLabel ?? lastVisit
  const activityItems =
    intelligence?.recentActivityItems?.length
      ? intelligence.recentActivityItems
      : lastVisit
        ? [lastVisit]
        : []

  const recipient: MessageRecipient = {
    personId: karkun.id,
    personKind: 'karkun',
    name: karkun.name,
    mobile: karkun.mobile,
    whatsapp: karkun.whatsapp,
  }

  const handleRequestReview = (reason: AssignmentReviewReason, notes: string) => {
    const result = submitAssignmentReviewRequest({
      karkunId: karkun.id,
      ruknId,
      reason,
      notes,
    })
    if (!result.ok) {
      setReviewError(result.error)
      return
    }
    setReviewError('')
    setReviewOpen(false)
    setReviewNotice('Review request sent to Administrator. Ownership is unchanged.')
  }

  const handleSchedule = (scheduledForIso: string) => {
    scheduleWhatsAppMessage({
      recipients: [recipient],
      message: `Assalamu Alaikum ${karkun.name}, let's schedule a meeting. — Karkun Connect`,
      scheduledFor: scheduledForIso,
    })
    setScheduleOpen(false)
    setScheduleNotice(`Meeting scheduled for ${new Date(scheduledForIso).toLocaleString()}.`)
  }

  return (
    <>
      <article className="connected-app-card">
        <div className="connected-app-profile">
          <Link to={journeyPath} className="connected-app-name">
            {karkun.name}
          </Link>
          <p className="connected-app-meta">
            {[karkun.mobile || null, karkun.area || null].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="connected-status-chips" aria-label="Status">
          {guidance ? (
            <>
              <JourneyStageBadge stageId={guidance.currentStage} variant="rukn" />
              <RelationshipHealthBadge
                health={guidance.health}
                stageId={guidance.currentStage}
              />
            </>
          ) : null}
          {lastContact ? (
            <span className="connected-status-chip">{lastContact}</span>
          ) : null}
        </div>

        <ProfileCompletionReminder karkunId={karkun.id} variant="chip" />

        <div className="connected-action-grid" role="toolbar" aria-label="Actions">
          {telLink ? (
            <a href={telLink} className="connected-action" aria-label={`Call ${karkun.name}`}>
              <Icon name="phone" size="sm" />
              Call
            </a>
          ) : null}
          {whatsAppLink ? (
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="connected-action"
              aria-label={`WhatsApp ${karkun.name}`}
            >
              <Icon name="message" size="sm" />
              WhatsApp
            </a>
          ) : null}
          <Link to={`${journeyPath}#visit-details`} className="connected-action">
            <Icon name="file-text" size="sm" />
            Visit
          </Link>
          <button type="button" className="connected-action" onClick={() => setScheduleOpen(true)}>
            <Icon name="calendar" size="sm" />
            Schedule
          </button>
          <button
            type="button"
            className="connected-action"
            onClick={() => {
              setReviewError('')
              setReviewOpen(true)
            }}
          >
            <Icon name="flag" size="sm" />
            Review
          </button>
        </div>

        <div className="connected-activity">
          <div className="connected-activity-head">
            <h3 className="connected-activity-title">Recent Activity</h3>
            <Link to={journeyPath} className="app-screen-view-all">
              View Full History →
            </Link>
          </div>
          {activityItems.length === 0 ? (
            <p className="app-screen-empty">No activity yet.</p>
          ) : (
            <ul className="connected-activity-list">
              {activityItems.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        {scheduleNotice ? (
          <p className="connected-notice connected-notice-ok">{scheduleNotice}</p>
        ) : null}
        {reviewNotice ? (
          <p className="connected-notice connected-notice-amber">{reviewNotice}</p>
        ) : null}
      </article>

      <RequestReviewModal
        isOpen={reviewOpen}
        karkunName={karkun.name}
        onClose={() => setReviewOpen(false)}
        onConfirm={handleRequestReview}
        error={reviewError}
      />

      <SchedulePickerModal
        isOpen={scheduleOpen}
        title="Schedule Meeting"
        description={`Pick a time to meet ${karkun.name}.`}
        confirmLabel="Schedule"
        onClose={() => setScheduleOpen(false)}
        onConfirm={handleSchedule}
      />
    </>
  )
}
