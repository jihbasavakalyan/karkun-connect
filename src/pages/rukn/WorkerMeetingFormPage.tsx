import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { submitMeetingForm, saveDraftMeetingForm } from '@/constants/mockCampaignRecord'
import { ROUTES } from '@/constants/routes'
import { completeVisitReportSubmission } from '@/lib/mockMissionEngine'
import { useAnnexure1Form } from '@/hooks/useAnnexure1Form'
import {
  CommitmentSection,
  FollowUpSection,
  JIHRegistrationSection,
  MeetingSummarySection,
  SubmissionSuccessCard,
  VisitFormHeader,
  VisitStatusSection,
  WorkerInfoSection,
} from '@/components/forms/annexure1'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { RuknMission } from '@/constants/mockMissions'

export function WorkerMeetingFormPage() {
  const { karkunId } = useParams<{ karkunId: string }>()
  const navigate = useNavigate()
  const karkun = karkunId ? getKarkunById(karkunId) : undefined
  const { form, setField, visitStopped } = useAnnexure1Form()
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

  if (successState) {
    return (
      <SubmissionSuccessCard
        submission={successState.submission}
        nextMission={successState.nextMission}
      />
    )
  }

  const handleSubmit = () => {
    const record = submitMeetingForm(
      karkun.id,
      karkun.name,
      karkun.area,
      karkun.assignedRukn,
      form,
    )
    const { nextMission } = completeVisitReportSubmission()
    setSuccessState({ submission: record, nextMission })
  }

  const handleSaveDraft = () => {
    saveDraftMeetingForm(
      karkun.id,
      karkun.name,
      karkun.area,
      karkun.assignedRukn,
      form,
    )
    navigate(ROUTES.RUKN)
  }

  const showFullForm = form.visitConducted === 'yes'

  return (
    <div className="space-y-5 pb-8">
      <VisitFormHeader karkun={karkun} />

      <VisitStatusSection form={form} setField={setField} />

      {showFullForm && (
        <>
          <WorkerInfoSection
            name={karkun.name}
            mobile={karkun.mobile}
            area={karkun.area}
            address={karkun.address}
          />
          <MeetingSummarySection form={form} setField={setField} />
          <CommitmentSection form={form} setField={setField} />
          <JIHRegistrationSection form={form} setField={setField} />
          <FollowUpSection form={form} setField={setField} />

          <div className="sticky bottom-20 z-10 space-y-3 rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
            <PrimaryButton type="button" fullWidth onClick={handleSubmit}>
              Submit Report
            </PrimaryButton>
            <SecondaryButton type="button" fullWidth onClick={handleSaveDraft}>
              Save Draft
            </SecondaryButton>
            <Link to={ROUTES.RUKN}>
              <SecondaryButton type="button" fullWidth>
                Cancel
              </SecondaryButton>
            </Link>
          </div>
        </>
      )}

      {!showFullForm && !visitStopped && (
        <p className="text-center text-sm text-secondary">
          Select whether the visit was conducted to continue.
        </p>
      )}
    </div>
  )
}
