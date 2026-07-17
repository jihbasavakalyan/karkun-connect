import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ROUTES } from '@/constants/routes'
import { useAnnexure1Form } from '@/hooks/useAnnexure1Form'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useCommunication } from '@/hooks/useCommunication'
import { ContactActionBar } from '@/components/common/ContactActionBar'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { SchedulePickerModal } from '@/components/communication/SchedulePickerModal'
import { ConnectionProgressTracker } from '@/components/rukn/ConnectionProgressTracker'
import {
  CommitmentPanel,
  JourneyTimeline,
  NextActionCard,
  RelationshipHealthBadge,
  SmartSuggestions,
} from '@/components/guidance'
import { useGuidance } from '@/hooks/useGuidance'
import { Annexure1ExecutionForm } from '@/components/forms/annexure1'
import { ReleaseKarkunModal, ReplaceKarkunModal } from '@/components/forms/assignment'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getRuknById } from '@/data/ruknMaster'
import { RelationshipActionBar, RelationshipSummaryPanel } from '@/components/relationship'
import { MeetingGuidanceCard } from '@/features/digitalRafeeq/contextual'
import { buildConnectionJourney } from '@/lib/connectionJourney'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { saveAnnexure1Draft, submitAnnexure1 } from '@/services/annexure1Service'
import { scheduleWhatsAppMessage } from '@/services/schedulingService'
import { getRegistrationForKarkun } from '@/services/jihWebPortalService'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import {
  getLatestSubmissionForKarkun,
  hasSubmittedAnnexureForAssignment,
} from '@/stores/annexure1Store'
import { resolveActiveAssignmentForAnnexure1 } from '@/validation/annexure1Validation'
import { buildWhatsAppLink } from '@/utils/personContactLinks'
import type { Annexure1FormState } from '@/types/annexure1.types'
import type { MessageRecipient } from '@/types/communication'
import { PageShell, StatusBadge } from '@/components/ui'

function sectionClass(): string {
  return 'ds-section'
}

function buildPostSubmitDestination(isAdminContext: boolean, followUpRequired: boolean): string {
  if (isAdminContext) {
    return followUpRequired
      ? `${ROUTES.ADMIN_FOLLOW_UP}?section=follow-ups`
      : `${ROUTES.ADMIN_EXECUTION}?section=pending`
  }
  return ROUTES.RUKN_MY_KARKUN
}

function wasFollowUpScheduled(
  commitmentMade: boolean,
  followUpRequired: Annexure1FormState['followUpRequired'],
): boolean {
  return commitmentMade && followUpRequired === 'yes'
}

export function ConnectionJourneyPage() {
  const { karkunId } = useParams<{ karkunId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminContext = location.pathname.startsWith('/admin/annexure-1')
  const backPath = isAdminContext ? ROUTES.ADMIN_ASSIGNMENTS : ROUTES.RUKN_MY_KARKUN
  const { user } = useAuth()
  const authRuknId = useRequiredRuknId()
  const guidanceRuknId = isAdminContext
    ? (karkunId ? getActiveAssignmentsForKarkun(karkunId)[0]?.ruknId ?? '' : '')
    : (authRuknId ?? '')
  const { releaseKarkun } = useAssignmentEngine()
  const { sendIndividualMessage } = useCommunication()
  const { getKarkunGuidance, version: guidanceVersion } = useGuidance(guidanceRuknId)
  const [, setGuidanceTick] = useState(0)

  if (!isAdminContext && !authRuknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const karkun = karkunId ? getKarkunById(karkunId) : undefined
  const actorRole = user?.role === 'administrator' ? 'administrator' : 'rukn'
  const activeAssignment = karkunId
    ? resolveActiveAssignmentForAnnexure1(
        karkunId,
        isAdminContext ? undefined : (authRuknId ?? undefined),
      )
    : undefined
  const alreadySubmitted =
    activeAssignment !== undefined &&
    hasSubmittedAnnexureForAssignment(activeAssignment.assignmentId)

  const { form, setField, visitStopped } = useAnnexure1Form(
    karkun
      ? { jihAppRegistrationStatus: karkun.jihAppRegistrationStatus, followUpRequired: 'no' }
      : undefined,
  )
  const [submitError, setSubmitError] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleNotice, setScheduleNotice] = useState('')
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)

  if (!karkun) {
    return (
      <div className={`${sectionClass()} text-center`}>
        <h1 className="text-xl font-semibold text-text-heading">Karkun Not Found</h1>
        <p className="mt-2 text-secondary">This Karkun is not in the registry.</p>
        <Link to={backPath} className="mt-6 inline-block">
          <SecondaryButton type="button">Back to Connected Karkuns</SecondaryButton>
        </Link>
      </div>
    )
  }

  if (!activeAssignment) {
    return (
      <div className={`${sectionClass()} text-center`}>
        <h1 className="text-xl font-semibold text-text-heading">Connection Journey</h1>
        <p className="mt-4 text-secondary">No active connection found for this Karkun.</p>
        <Link to={backPath} className="mt-6 inline-block">
          <SecondaryButton type="button">
            {isAdminContext ? 'Back to Connections' : 'Back to Connected Karkuns'}
          </SecondaryButton>
        </Link>
      </div>
    )
  }

  const journey = buildConnectionJourney(karkun, activeAssignment.assignmentId)
  void guidanceVersion
  const guidance = getKarkunGuidance(karkun.id)
  const ruknName = getRuknById(activeAssignment.ruknId)?.name
  const latestSubmission = getLatestSubmissionForKarkun(karkun.id)
  const portalRegistration = getRegistrationForKarkun(karkun.id)
  const relationLabel = karkun.gender === 'Female' ? 'Husband' : 'Father'

  const recipient: MessageRecipient = {
    personId: karkun.id,
    personKind: 'karkun',
    name: karkun.name,
    mobile: karkun.mobile,
    whatsapp: karkun.whatsapp,
  }

  const reminderMessage = `Assalamu Alaikum ${karkun.name}, following up on our connection. Looking forward to meeting you soon. — Karkun Connect`

  const handleSendMessage = async ({
    templateId,
    message,
  }: {
    templateId?: string
    message: string
  }) => {
    const result = await sendIndividualMessage({
      channel: 'whatsapp',
      recipient,
      templateId,
      message,
      linkedAssignmentId: activeAssignment.assignmentId,
    })
    return result.success ? { success: true } : { success: false, error: result.error }
  }

  const handleSubmit = () => {
    setSubmitError('')
    const result = submitAnnexure1(form, {
      karkunId: karkun.id,
      ruknId: activeAssignment.ruknId,
      actorRole: actorRole as 'rukn' | 'administrator',
    })
    if (!result.success) {
      setSubmitError(result.error)
      return
    }
    const followUpRequired = wasFollowUpScheduled(
      result.submission.commitmentMade,
      result.submission.followUpRequired,
    )
    navigate(buildPostSubmitDestination(isAdminContext, followUpRequired), {
      state: {
        successMessage: `Visit recorded for ${karkun.name}.${
          followUpRequired ? ' Follow-up scheduled.' : ''
        }`,
      },
    })
  }

  const handleSaveDraft = () => {
    setSubmitError('')
    const result = saveAnnexure1Draft(form, {
      karkunId: karkun.id,
      ruknId: activeAssignment.ruknId,
      actorRole: actorRole as 'rukn' | 'administrator',
    })
    if (!result.success) {
      setSubmitError(result.error)
      return
    }
    navigate(backPath, {
      state: { successMessage: `Draft saved for ${karkun.name}.` },
    })
  }

  const handleScheduleMeeting = (scheduledForIso: string) => {
    scheduleWhatsAppMessage({
      recipients: [recipient],
      message: `Assalamu Alaikum ${karkun.name}, let's schedule a meeting. — Karkun Connect`,
      scheduledFor: scheduledForIso,
    })
    setScheduleOpen(false)
    setScheduleNotice(
      `Meeting reminder scheduled for ${new Date(scheduledForIso).toLocaleString()}.`,
    )
  }

  const showFullForm = form.visitConducted === 'yes'
  const showFormActions = showFullForm || visitStopped
  const waReminderLink = buildWhatsAppLink(
    karkun.whatsapp?.trim() ? karkun.whatsapp : karkun.mobile,
    reminderMessage,
  )

  return (
    <PageShell variant="narrow" className="pb-28">
      <div className="flex items-center justify-between">
        <Link to={backPath} className="text-sm font-medium text-primary hover:underline">
          ← {isAdminContext ? 'Connections' : 'Connected Karkuns'}
        </Link>
        <StatusBadge variant="connected">{getConnectionStatusLabel(karkun.assignmentStatus)}</StatusBadge>
      </div>

      <RelationshipSummaryPanel
        karkunName={karkun.name}
        ruknName={ruknName}
        journeyStageId={guidance?.currentStage}
        health={guidance?.health}
        nextAction={guidance?.nextAction}
        connectionNumber={activeAssignment.assignmentNumber}
      />

      {!isAdminContext && (
        <RelationshipActionBar
          showReplace
          showRelease
          onReplace={() => setReplaceOpen(true)}
          onRelease={() => setReleaseOpen(true)}
        />
      )}

      <MeetingGuidanceCard
        route={isAdminContext ? `/admin/annexure-1/${karkun.id}` : `/rukn/visit/${karkun.id}`}
        role={isAdminContext ? 'administrator' : 'rukn'}
        payload={{ karkunId: karkun.id, karkunName: karkun.name }}
      />

      <header className={sectionClass()}>
        <h1 className="text-2xl font-semibold text-text-heading">{karkun.name}</h1>
        {karkun.fatherHusbandName?.trim() && (
          <p className="mt-1 text-sm text-secondary">
            {relationLabel}: {karkun.fatherHusbandName}
          </p>
        )}
        <p className="mt-1 text-sm text-secondary">{karkun.area || karkun.place}</p>
        <p className="mt-1 text-xs text-secondary">Connection: {activeAssignment.assignmentNumber}</p>
        {guidance && (
          <div className="mt-4">
            <RelationshipHealthBadge health={guidance.health} showReasons />
          </div>
        )}
      </header>

      {guidance && (
        <section className={sectionClass()} aria-label="Next Action">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Next Action</h2>
          <div className="mt-3">
            <NextActionCard action={guidance.nextAction} />
          </div>
        </section>
      )}

      <section className={sectionClass()} aria-label="Communication">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Communication</h2>
        <div className="mt-3">
          <ContactActionBar
            name={karkun.name}
            mobile={karkun.mobile}
            whatsapp={karkun.whatsapp}
            whatsAppMessage={reminderMessage}
            onWhatsApp={() => setComposerOpen(true)}
          />
        </div>
        {!karkun.mobile.trim() && (
          <p className="mt-2 text-sm text-secondary">No mobile number on file yet.</p>
        )}
      </section>

      <section className={sectionClass()} aria-label="Connection Progress">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Journey Stage — {journey.stageLabel}
        </h2>
        <div className="mt-4">
          <ConnectionProgressTracker snapshot={journey} />
        </div>
      </section>

      <section className={sectionClass()} id="visit-details" aria-label="Visit Details">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Visit Details</h2>
        <p className="ds-section-subtitle">
          Complete the form below, then tap <span className="font-medium text-text-heading">Save Visit</span> to
          submit. Use <span className="font-medium text-text-heading">Record Visit</span> elsewhere to open this
          form.
        </p>
        {alreadySubmitted && latestSubmission ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Date of Visit</dt>
              <dd className="font-medium text-text-heading">{latestSubmission.visitDate}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Meeting Completed</dt>
              <dd className="font-medium text-text-heading">
                {latestSubmission.visitConducted === 'yes' ? 'Yes' : 'No'}
              </dd>
            </div>
            {latestSubmission.discussionSummary && (
              <div>
                <dt className="text-secondary">Remarks / Outcome</dt>
                <dd className="mt-1 whitespace-pre-wrap font-medium text-text-heading">
                  {latestSubmission.discussionSummary}
                </dd>
              </div>
            )}
            {latestSubmission.commitmentMade && latestSubmission.commitmentDetails && (
              <div>
                <dt className="text-secondary">Commitment</dt>
                <dd className="mt-1 font-medium text-text-heading">
                  {latestSubmission.commitmentDetails}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <div className="mt-4">
            <Annexure1ExecutionForm form={form} setField={setField} showFullForm={showFullForm} />
            {showFormActions && (
              <div className="mt-4 space-y-2">
                {submitError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {submitError}
                  </p>
                )}
                <PrimaryButton type="button" fullWidth onClick={handleSubmit}>
                  Save Visit
                </PrimaryButton>
                {showFullForm && (
                  <SecondaryButton type="button" fullWidth onClick={handleSaveDraft}>
                    Save Draft
                  </SecondaryButton>
                )}
              </div>
            )}
            {!showFullForm && !visitStopped && (
              <p className="mt-3 text-center text-sm text-secondary">
                Select whether the visit was conducted to continue.
              </p>
            )}
          </div>
        )}
      </section>

      <section className={sectionClass()} aria-label="JIH App Registration">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          JIH App Registration
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Status</dt>
            <dd className="font-medium text-text-heading">
              {journey.jihRegistered ? 'Registered' : karkun.jihAppRegistrationStatus}
            </dd>
          </div>
          {portalRegistration.registrationDate && (
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Registration Date</dt>
              <dd className="font-medium text-text-heading">
                {portalRegistration.registrationDate}
              </dd>
            </div>
          )}
          {portalRegistration.registrationNumber && (
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">JIH ID</dt>
              <dd className="font-medium text-text-heading">
                {portalRegistration.registrationNumber}
              </dd>
            </div>
          )}
        </dl>
        {!journey.jihRegistered && (
          <p className="mt-3 text-sm text-secondary">
            Record the JIH App Registration status while saving the visit above.
          </p>
        )}
      </section>

      {guidance && (
        <section className={sectionClass()} aria-label="Commitments">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Agreed Next Steps
          </h2>
          <div className="mt-4">
            <CommitmentPanel
              karkunId={karkun.id}
              ruknId={activeAssignment.ruknId}
              assignmentId={activeAssignment.assignmentId}
              commitments={guidance.pendingCommitments}
              onChange={() => setGuidanceTick((current) => current + 1)}
            />
          </div>
        </section>
      )}

      {guidance && guidance.suggestions.length > 0 && (
        <section className={sectionClass()} aria-label="Suggestions">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Smart Suggestions
          </h2>
          <div className="mt-4">
            <SmartSuggestions suggestions={guidance.suggestions} />
          </div>
        </section>
      )}

      {guidance && (
        <section className={sectionClass()} aria-label="Journey Timeline">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Journey Timeline
          </h2>
          <div className="mt-4">
            <JourneyTimeline events={guidance.timeline} />
          </div>
        </section>
      )}

      <section className={sectionClass()} aria-label="Quick Actions">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Quick Actions</h2>
        {scheduleNotice && (
          <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {scheduleNotice}
          </p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {!alreadySubmitted && (
            <a href="#visit-details">
              <PrimaryButton type="button" fullWidth>
                {journey.hasVisit ? 'Visit Again' : 'Record Visit'}
              </PrimaryButton>
            </a>
          )}
          {waReminderLink && (
            <a href={waReminderLink} target="_blank" rel="noopener noreferrer">
              <SecondaryButton type="button" fullWidth>
                Send Reminder
              </SecondaryButton>
            </a>
          )}
          <SecondaryButton type="button" fullWidth onClick={() => setScheduleOpen(true)}>
            Schedule Meeting
          </SecondaryButton>
          <SecondaryButton type="button" fullWidth onClick={() => setComposerOpen(true)}>
            Compose Message
          </SecondaryButton>
        </div>
      </section>

      <MessageComposerModal
        isOpen={composerOpen}
        recipients={[recipient]}
        onClose={() => setComposerOpen(false)}
        onSend={handleSendMessage}
        title={`WhatsApp — ${karkun.name}`}
      />

      <SchedulePickerModal
        isOpen={scheduleOpen}
        title="Schedule Meeting"
        description="Pick a date and time to be reminded to meet this Karkun."
        confirmLabel="Schedule Meeting"
        onClose={() => setScheduleOpen(false)}
        onConfirm={handleScheduleMeeting}
      />

      {!isAdminContext && (
        <>
          <ReleaseKarkunModal
            isOpen={releaseOpen}
            karkunName={karkun.name}
            onClose={() => setReleaseOpen(false)}
            onConfirm={(reason) => {
              if (!authRuknId) return
              releaseKarkun(karkun.id, authRuknId, reason)
              setReleaseOpen(false)
              navigate(ROUTES.RUKN_MY_KARKUN, {
                state: { successMessage: 'Connection released successfully.' },
              })
            }}
          />
          <ReplaceKarkunModal
            isOpen={replaceOpen}
            currentKarkunId={karkun.id}
            currentKarkunName={karkun.name}
            ruknId={authRuknId ?? ''}
            onClose={() => setReplaceOpen(false)}
            onComplete={() => setReplaceOpen(false)}
          />
        </>
      )}
    </PageShell>
  )
}
