import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ROUTES } from '@/constants/routes'
import { useAnnexure1Form } from '@/hooks/useAnnexure1Form'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useCommunication } from '@/hooks/useCommunication'
import { ContactActionBar } from '@/components/common/ContactActionBar'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { SchedulePickerModal } from '@/components/communication/SchedulePickerModal'
import { ConnectionProgressTracker } from '@/components/rukn/ConnectionProgressTracker'
import {
  CommitmentPanel,
  DevelopmentAssessmentPanel,
  JourneyTimeline,
  NextActionCard,
  SmartSuggestions,
} from '@/components/guidance'
import { useGuidance } from '@/hooks/useGuidance'
import { Annexure1ExecutionForm } from '@/components/forms/annexure1'
import { RequestReviewModal } from '@/components/forms/assignment/RequestReviewModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getRuknById } from '@/data/ruknMaster'
import {
  ProfileCompletionReminder,
  RelationshipActionBar,
  RelationshipSummaryPanel,
} from '@/components/relationship'
import { buildConnectionJourney } from '@/lib/connectionJourney'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { buildIndividualCommunicationContext } from '@/lib/communicationContext'
import { resolvePostVisitWorkflowDestination } from '@/lib/workflowPresentation'
import { saveAnnexure1Draft, submitAnnexure1 } from '@/services/annexure1Service'
import { scheduleWhatsAppMessage } from '@/services/schedulingService'
import { submitAssignmentReviewRequest } from '@/services/assignmentReviewService'
import type { AssignmentReviewReason } from '@/types/assignmentReview.types'
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
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { KarkunWeeklyIjtemaSection } from '@/components/execution/KarkunWeeklyIjtemaSection'

function sectionClass(): string {
  return 'app-screen-block'
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
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewNotice, setReviewNotice] = useState('')

  useEffect(() => {
    if (location.hash !== '#visit-details') return
    const timer = window.setTimeout(() => {
      document.getElementById('visit-details')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [location.hash, karkunId])

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
      actorId: user?.uid,
    })
    if (!result.success) {
      setSubmitError(result.error)
      return
    }
    const followUpRequired = wasFollowUpScheduled(
      result.submission.commitmentMade,
      result.submission.followUpRequired,
    )
    const destination = resolvePostVisitWorkflowDestination({
      isAdminContext,
      followUpRequired,
      ruknId: activeAssignment.ruknId,
      completedKarkunId: karkun.id,
      completedKarkunName: karkun.name,
    })
    navigate(destination.route, { state: destination.state })
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
  const communicationContext = buildIndividualCommunicationContext(karkun.id)

  return (
    <PageShell variant="narrow" className="app-screen visit-screen pb-24">
      <div className="flex items-center justify-between gap-2">
        <Link to={backPath} className="app-screen-back">
          ← {isAdminContext ? 'Connections' : 'Connected'}
        </Link>
        <StatusBadge variant="connected">{getConnectionStatusLabel(karkun.assignmentStatus)}</StatusBadge>
      </div>

      <ExecutionSuccessBanner />

      <RelationshipSummaryPanel
        karkunName={karkun.name}
        ruknName={ruknName}
        journeyStageId={guidance?.currentStage}
        health={guidance?.health}
        nextAction={guidance?.nextAction}
        connectionNumber={activeAssignment.assignmentNumber}
      />

      {/* KC-0080 — Weekly Ijtema on Karkun Detail */}
      {!isAdminContext && authRuknId ? (
        <KarkunWeeklyIjtemaSection
          karkunId={karkun.id}
          karkunName={karkun.name}
          ruknId={authRuknId}
        />
      ) : null}

      {!isAdminContext ? <ProfileCompletionReminder karkunId={karkun.id} /> : null}

      {!isAdminContext && (
        <RelationshipActionBar
          showRequestReview
          onRequestReview={() => {
            setReviewError('')
            setReviewOpen(true)
          }}
          compact
        />
      )}

      {reviewNotice && !isAdminContext ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
          {reviewNotice}
        </p>
      ) : null}

      {guidance ? (
        <section className={sectionClass()} aria-label="Next Action">
          <h2 className="app-screen-block-title">Next Action</h2>
          <div className="mt-2">
            <NextActionCard action={guidance.nextAction} />
          </div>
        </section>
      ) : null}

      <section className={sectionClass()} aria-label="Communication">
        <h2 className="app-screen-block-title">Communication</h2>
        <div className="mt-2">
          <ContactActionBar
            name={karkun.name}
            mobile={karkun.mobile}
            whatsapp={karkun.whatsapp}
            whatsAppMessage={reminderMessage}
            onWhatsApp={() => setComposerOpen(true)}
          />
        </div>
        {!karkun.mobile.trim() ? (
          <p className="mt-1.5 text-xs text-secondary">No mobile number on file yet.</p>
        ) : null}
      </section>

      <section className={`${sectionClass()} visit-primary-block`} id="visit-details" aria-label="Visit Details">
        <h2 className="app-screen-block-title">Visit Details</h2>
        {alreadySubmitted && latestSubmission ? (
          <dl className="mt-2 space-y-2 text-sm">
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
            {latestSubmission.discussionSummary ? (
              <div>
                <dt className="text-secondary">Remarks / Outcome</dt>
                <dd className="mt-1 whitespace-pre-wrap font-medium text-text-heading">
                  {latestSubmission.discussionSummary}
                </dd>
              </div>
            ) : null}
            {latestSubmission.commitmentMade && latestSubmission.commitmentDetails ? (
              <div>
                <dt className="text-secondary">Commitment</dt>
                <dd className="mt-1 font-medium text-text-heading">
                  {latestSubmission.commitmentDetails}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <div className="mt-2">
            <Annexure1ExecutionForm form={form} setField={setField} showFullForm={showFullForm} />
            {showFormActions ? (
              <div className="visit-sticky-actions">
                {submitError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                    {submitError}
                  </p>
                ) : null}
                <PrimaryButton type="button" fullWidth onClick={handleSubmit}>
                  Save Visit
                </PrimaryButton>
                {showFullForm ? (
                  <SecondaryButton type="button" fullWidth onClick={handleSaveDraft}>
                    Save Draft
                  </SecondaryButton>
                ) : null}
              </div>
            ) : null}
            {!showFullForm && !visitStopped ? (
              <p className="mt-2 text-center text-xs text-secondary">
                Select whether the visit was conducted to continue.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <details className="visit-more-details">
        <summary>Journey &amp; registration</summary>
        <div className="visit-more-body space-y-2">
          <section className={sectionClass()} aria-label="Connection Progress">
            <h2 className="app-screen-block-title">Journey Stage — {journey.stageLabel}</h2>
            <div className="mt-2">
              <ConnectionProgressTracker snapshot={journey} />
            </div>
          </section>

          <section className={sectionClass()} aria-label="JIH App Registration">
            <h2 className="app-screen-block-title">JIH App Registration</h2>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-secondary">Status</dt>
                <dd className="font-medium text-text-heading">
                  {journey.jihRegistered ? 'Registered' : karkun.jihAppRegistrationStatus}
                </dd>
              </div>
              {portalRegistration.registrationDate ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary">Registration Date</dt>
                  <dd className="font-medium text-text-heading">
                    {portalRegistration.registrationDate}
                  </dd>
                </div>
              ) : null}
              {portalRegistration.registrationNumber ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary">JIH ID</dt>
                  <dd className="font-medium text-text-heading">
                    {portalRegistration.registrationNumber}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>
      </details>

      {guidance ? (
        <details className="visit-more-details">
          <summary>Commitments &amp; history</summary>
          <div className="visit-more-body space-y-2">
            <section className={sectionClass()} aria-label="Commitments">
              <h2 className="app-screen-block-title">Agreed Next Steps</h2>
              <div className="mt-2">
                <CommitmentPanel
                  karkunId={karkun.id}
                  ruknId={activeAssignment.ruknId}
                  assignmentId={activeAssignment.assignmentId}
                  commitments={guidance.pendingCommitments}
                  onChange={() => setGuidanceTick((current) => current + 1)}
                />
              </div>
            </section>

            {!isAdminContext && guidance.currentStage === 'development' ? (
              <DevelopmentAssessmentPanel
                karkunId={karkun.id}
                ruknId={activeAssignment.ruknId}
                onChange={() => setGuidanceTick((current) => current + 1)}
              />
            ) : null}

            {guidance.suggestions.length > 0 ? (
              <section className={sectionClass()} aria-label="Suggestions">
                <h2 className="app-screen-block-title">Smart Suggestions</h2>
                <div className="mt-2">
                  <SmartSuggestions suggestions={guidance.suggestions} />
                </div>
              </section>
            ) : null}

            <section className={sectionClass()} aria-label="Journey Timeline">
              <div className="app-screen-block-head">
                <h2 className="app-screen-block-title">Recent Timeline</h2>
              </div>
              <div className="mt-2">
                <JourneyTimeline events={guidance.timeline.slice(0, 3)} />
              </div>
              {guidance.timeline.length > 3 ? (
                <p className="mt-1 text-[11px] text-secondary">
                  Showing latest 3 of {guidance.timeline.length} events.
                </p>
              ) : null}
            </section>
          </div>
        </details>
      ) : null}

      <details className="visit-more-details">
        <summary>More actions</summary>
        <div className="visit-more-body">
          <section className={sectionClass()} aria-label="Quick Actions">
            {scheduleNotice ? (
              <p className="mb-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700">
                {scheduleNotice}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-1.5">
              {!alreadySubmitted ? (
                <a href="#visit-details">
                  <PrimaryButton type="button" fullWidth className="min-h-10 text-sm">
                    {journey.hasVisit ? 'Visit Again' : 'Record Visit'}
                  </PrimaryButton>
                </a>
              ) : null}
              {waReminderLink ? (
                <a href={waReminderLink} target="_blank" rel="noopener noreferrer">
                  <SecondaryButton type="button" fullWidth className="min-h-10 text-sm">
                    Send Reminder
                  </SecondaryButton>
                </a>
              ) : null}
              <SecondaryButton
                type="button"
                fullWidth
                className="min-h-10 text-sm"
                onClick={() => setScheduleOpen(true)}
              >
                Schedule
              </SecondaryButton>
              <SecondaryButton
                type="button"
                fullWidth
                className="min-h-10 text-sm"
                onClick={() => setComposerOpen(true)}
              >
                Message
              </SecondaryButton>
            </div>
          </section>
        </div>
      </details>

      <MessageComposerModal
        isOpen={composerOpen}
        recipients={[recipient]}
        role={isAdminContext ? 'administrator' : 'rukn'}
        initialTemplateId={communicationContext?.recommendedTemplate?.templateId}
        recommendedTemplateId={communicationContext?.recommendedTemplate?.templateId}
        contextVariables={communicationContext?.defaultVariables}
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
        <RequestReviewModal
          isOpen={reviewOpen}
          karkunName={karkun.name}
          onClose={() => setReviewOpen(false)}
          error={reviewError}
          onConfirm={(reason: AssignmentReviewReason, notes: string) => {
            if (!authRuknId) return
            const result = submitAssignmentReviewRequest({
              karkunId: karkun.id,
              ruknId: authRuknId,
              reason,
              notes,
              createdBy: user?.displayName ?? user?.uid ?? 'Rukn',
            })
            if (!result.ok) {
              setReviewError(result.error)
              return
            }
            setReviewOpen(false)
            setReviewNotice('Review request sent to Administrator. Ownership is unchanged.')
          }}
        />
      )}
    </PageShell>
  )
}
