import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { DEMO_RUKN_PORTAL_ID } from '@/constants/demoRukn'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ROUTES } from '@/constants/routes'
import { useAnnexure1Form } from '@/hooks/useAnnexure1Form'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { completeVisitReportSubmission } from '@/lib/mockMissionEngine'
import {
  saveAnnexure1Draft,
  submitAnnexure1,
} from '@/services/annexure1Service'
import { resolveActiveAssignmentForAnnexure1 } from '@/validation/annexure1Validation'
import {
  Annexure1ExecutionForm,
  SubmissionSuccessCard,
  VisitFormHeader,
} from '@/components/forms/annexure1'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { RuknMission } from '@/constants/mockMissions'

export function WorkerMeetingFormPage() {
  const { karkunId } = useParams<{ karkunId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminContext = location.pathname.startsWith('/admin/annexure-1')
  const backPath = isAdminContext ? ROUTES.ADMIN_ASSIGNMENTS : ROUTES.RUKN_MY_KARKUN
  const { user } = useAuth()
  useAssignmentEngine()

  const karkun = karkunId ? getKarkunById(karkunId) : undefined
  const ruknId = user?.ruknId ?? DEMO_RUKN_PORTAL_ID
  const actorRole = user?.role === 'administrator' ? 'administrator' : 'rukn'
  const activeAssignment = karkunId
    ? resolveActiveAssignmentForAnnexure1(karkunId, ruknId)
    : undefined

  const { form, setField, visitStopped } = useAnnexure1Form(
    karkun
      ? {
          jihAppRegistrationStatus: karkun.jihAppRegistrationStatus,
        }
      : undefined,
  )
  const [submitError, setSubmitError] = useState('')
  const [successState, setSuccessState] = useState<{
    submission: SubmittedMeetingForm
    nextMission?: RuknMission
  } | null>(null)

  if (!karkun) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-text-heading">Karkun Not Found</h1>
        <p className="mt-2 text-secondary">This Karkun is not in the registry.</p>
        <Link to={ROUTES.RUKN} className="mt-6 inline-block">
          <SecondaryButton type="button">Return Home</SecondaryButton>
        </Link>
      </div>
    )
  }

  if (!activeAssignment) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-text-heading">Annexure-1</h1>
        <p className="mt-4 text-secondary">No active assignment found.</p>
        <Link to={backPath} className="mt-6 inline-block">
          <SecondaryButton type="button">
            {isAdminContext ? 'Back to Assignments' : 'Back to My Karkun'}
          </SecondaryButton>
        </Link>
      </div>
    )
  }

  if (successState) {
    return (
      <SubmissionSuccessCard
        submission={successState.submission}
        nextMission={successState.nextMission}
      />
    )
  }

  const submissionContext = {
    karkunId: karkun.id,
    ruknId: activeAssignment.ruknId,
    actorRole: actorRole as 'rukn' | 'administrator',
  }

  const handleSubmit = () => {
    setSubmitError('')
    const result = submitAnnexure1(form, submissionContext)
    if (!result.success) {
      setSubmitError(result.error)
      return
    }

    const { nextMission } = completeVisitReportSubmission()
    setSuccessState({ submission: result.submission, nextMission })
  }

  const handleSaveDraft = () => {
    setSubmitError('')
    const result = saveAnnexure1Draft(form, submissionContext)
    if (!result.success) {
      setSubmitError(result.error)
      return
    }
    navigate(isAdminContext ? ROUTES.ADMIN_ASSIGNMENTS : ROUTES.RUKN)
  }

  const showFullForm = form.visitConducted === 'yes'
  const showNotConductedActions = visitStopped

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-28">
      <VisitFormHeader karkun={karkun} assignmentNumber={activeAssignment.assignmentNumber} />

      <Annexure1ExecutionForm form={form} setField={setField} showFullForm={showFullForm} />

      {(showFullForm || showNotConductedActions) && (
        <div className="sticky bottom-4 z-10 space-y-2 rounded-(--radius-card) border border-border bg-surface p-3 shadow-card sm:p-4">
          {submitError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          )}
          <PrimaryButton type="button" fullWidth onClick={handleSubmit}>
            Submit Annexure-1
          </PrimaryButton>
          {showFullForm && (
            <SecondaryButton type="button" fullWidth onClick={handleSaveDraft}>
              Save Draft
            </SecondaryButton>
          )}
          <Link to={backPath}>
            <SecondaryButton type="button" fullWidth>
              Cancel
            </SecondaryButton>
          </Link>
        </div>
      )}

      {!showFullForm && !visitStopped && (
        <p className="text-center text-sm text-secondary">
          Select whether the visit was conducted to continue.
        </p>
      )}
    </div>
  )
}
