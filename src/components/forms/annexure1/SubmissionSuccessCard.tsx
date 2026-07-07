import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { RuknMission } from '@/constants/mockMissions'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type SubmissionSuccessCardProps = {
  submission: SubmittedMeetingForm
  nextMission?: RuknMission
}

export function SubmissionSuccessCard({ submission, nextMission }: SubmissionSuccessCardProps) {
  const commitmentLabel =
    submission.commitmentMade && submission.commitmentDetails.trim()
      ? submission.commitmentDetails
      : 'No commitment recorded'

  const followUpLabel =
    submission.followUpRequired === 'yes'
      ? `${submission.followUpPurpose} · ${submission.followUpDate}`
      : 'Not required'

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted text-2xl text-primary">
        ✓
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-text-heading">Visit Recorded</h2>
        <p className="mt-2 text-secondary">
          Campaign record and JIH Portal updated automatically.
        </p>
      </div>

      <dl className="space-y-3 rounded-(--radius-card) border border-border bg-surface p-6 text-left shadow-card">
        <div>
          <dt className="text-sm text-secondary">Connection Number</dt>
          <dd className="font-semibold text-text-heading">{submission.assignmentNumber}</dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Karkun Name</dt>
          <dd className="font-semibold text-text-heading">{submission.workerName}</dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Submission Date</dt>
          <dd className="font-semibold text-text-heading">
            {submission.submissionDate.slice(0, 10)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Visit Date</dt>
          <dd className="font-semibold text-text-heading">{submission.visitDate}</dd>
        </div>
        {submission.visitConducted === 'yes' && (
          <>
            <div>
              <dt className="text-sm text-secondary">Current Commitment</dt>
              <dd className="font-semibold text-text-heading">{commitmentLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-secondary">JIH App Registration</dt>
              <dd className="font-semibold text-text-heading">
                {submission.jihAppRegistrationStatus}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-secondary">Follow-up</dt>
              <dd className="font-semibold text-text-heading">{followUpLabel}</dd>
            </div>
          </>
        )}
      </dl>

      {nextMission && (
        <div className="rounded-(--radius-card) border border-primary/30 bg-primary-muted/30 p-5 text-left">
          <p className="text-sm font-medium text-primary">Next Mission</p>
          <p className="mt-2 text-lg font-semibold text-text-heading">{nextMission.title}</p>
          {nextMission.visitName && (
            <p className="mt-1 text-sm text-secondary">
              {nextMission.visitName}
              {nextMission.area ? ` · ${nextMission.area}` : ''}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link to={ROUTES.RUKN}>
          <PrimaryButton type="button" fullWidth>
            Return to Today&apos;s Mission
          </PrimaryButton>
        </Link>
        <Link to={ROUTES.RUKN_CAMPAIGN_RECORD}>
          <SecondaryButton type="button" fullWidth>
            View Campaign Record
          </SecondaryButton>
        </Link>
      </div>
    </div>
  )
}
