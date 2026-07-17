import { useState } from 'react'
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
import { humanizeNextActionForKarkun } from '@/lib/homePresentation'
import { scheduleWhatsAppMessage } from '@/services/schedulingService'
import { submitAssignmentReviewRequest } from '@/services/assignmentReviewService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { AssignmentReviewReason } from '@/types/assignmentReview.types'
import { RelationshipActionBar } from './RelationshipActionBar'
import { ProfileCompletionReminder } from './ProfileCompletionReminder'
import { RequestReviewModal } from '@/components/forms/assignment/RequestReviewModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
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
  const journeyPath = visitPath ?? ruknVisitPath(karkun.id)
  const telLink = buildTelLink(karkun.mobile)
  const whatsAppLink = buildWhatsAppLink(karkun.whatsapp?.trim() ? karkun.whatsapp : karkun.mobile)
  const lastVisit = formatLastVisitLabel(karkun.id)
  const humanizedAction = guidance
    ? humanizeNextActionForKarkun(karkun.name, guidance.nextAction)
    : null

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
      <article className="relationship-connected-card connected-workspace-card">
        <div className="connected-card-top">
          <div className="min-w-0">
            <Link to={journeyPath} className="connected-card-name">
              {karkun.name}
            </Link>
            <p className="connected-card-meta">
              {[karkun.mobile || null, karkun.area || null].filter(Boolean).join(' · ')}
            </p>
            {karkun.fatherHusbandName?.trim() ? (
              <p className="connected-card-meta">
                {karkun.gender === 'Female' ? 'Husband' : 'Father'}: {karkun.fatherHusbandName}
              </p>
            ) : null}
          </div>
          {guidance ? <JourneyStageBadge stageId={guidance.currentStage} variant="rukn" /> : null}
        </div>

        {guidance ? (
          <div className="connected-card-next">
            <RelationshipHealthBadge health={guidance.health} showReasons={false} />
            <p className="connected-card-action">
              {humanizedAction ?? guidance.nextAction.label}
            </p>
            <Link to={guidance.nextAction.route || journeyPath} className="connected-card-cta-wrap">
              <PrimaryButton type="button" className="connected-card-cta">
                {guidance.nextAction.label}
              </PrimaryButton>
            </Link>
          </div>
        ) : null}

        <p className="connected-card-visit">{lastVisit}</p>

        <ProfileCompletionReminder karkunId={karkun.id} variant="chip" />

        <div className="relationship-quick-actions connected-card-actions">
          {telLink ? (
            <a href={telLink} className="relationship-quick-action" aria-label={`Call ${karkun.name}`}>
              <Icon name="phone" size="sm" />
              Call
            </a>
          ) : null}
          {whatsAppLink ? (
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="relationship-quick-action"
              aria-label={`WhatsApp ${karkun.name}`}
            >
              <Icon name="message" size="sm" />
              WhatsApp
            </a>
          ) : null}
          <Link to={`${journeyPath}#visit-details`} className="relationship-quick-action">
            <Icon name="file-text" size="sm" />
            Visit
          </Link>
          <button
            type="button"
            className="relationship-quick-action"
            onClick={() => setScheduleOpen(true)}
          >
            <Icon name="calendar" size="sm" />
            Schedule
          </button>
        </div>

        {scheduleNotice ? (
          <p className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {scheduleNotice}
          </p>
        ) : null}
        {reviewNotice ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {reviewNotice}
          </p>
        ) : null}

        <div className="mt-2">
          <RelationshipActionBar
            showRequestReview
            onRequestReview={() => {
              setReviewError('')
              setReviewOpen(true)
            }}
            compact
          />
        </div>
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
