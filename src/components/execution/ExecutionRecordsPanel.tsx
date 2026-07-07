import { Link } from 'react-router-dom'
import { adminAnnexure1Path } from '@/constants/routes'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { getSubmittedMeetingForms } from '@/stores/annexure1Store'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function ExecutionRecordsPanel() {
  const executionRecords = getSubmittedMeetingForms()

  if (executionRecords.length === 0) {
    return (
      <ExecutionEmptyState
        title="No Execution Records Yet"
        message="Execution reports will appear after visits are recorded."
      />
    )
  }

  return (
    <ul className="space-y-3">
      {executionRecords.map((form) => (
        <li
          key={form.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-text-heading">
                {form.workerName} · {form.visitDate}
              </p>
              <ExecutionStatusBadge status="Completed" />
            </div>
            <p className="mt-1 text-sm text-secondary">
              {form.assignmentNumber} · Rukn: {form.assignedRukn}
            </p>
            <p className="mt-1 text-sm text-secondary">
              {form.visitConducted === 'yes'
                ? form.discussionSummary || 'Visit recorded'
                : `Not conducted: ${form.notConductedReason}`}
            </p>
          </div>
          <Link to={adminAnnexure1Path(form.karkunId)} className="shrink-0">
            <PrimaryButton type="button" className="w-full px-4 py-2 text-sm sm:w-auto">
              View Submission
            </PrimaryButton>
          </Link>
        </li>
      ))}
    </ul>
  )
}
