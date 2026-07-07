import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import type { AssignmentRecord } from '@/types/assignment'
import { getRemovalReasonLabel, getReplacementReasonLabel } from '@/types/assignment'

type AssignmentHistoryTimelineProps = {
  history: AssignmentRecord[]
  currentAssignment?: AssignmentRecord | null
  perspective: 'rukn' | 'karkun'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function HistoryCard({
  title,
  subtitle,
  assignmentNumber,
  createdBy,
  eventDate,
  reason,
  remarks,
  highlight,
}: {
  title: string
  subtitle: string
  assignmentNumber: string
  createdBy: string
  eventDate: string
  reason?: string
  remarks?: string
  highlight?: boolean
}) {
  return (
    <article
      className={`rounded-lg border px-4 py-3 ${
        highlight ? 'border-primary bg-primary/5' : 'border-border bg-surface-muted'
      }`}
    >
      <p className="font-semibold text-text-heading">{title}</p>
      <p className="mt-1 text-sm text-secondary">{subtitle}</p>
      <dl className="mt-3 space-y-1 text-sm text-secondary">
        <div className="flex gap-2">
          <dt className="font-medium text-text-heading">Connection:</dt>
          <dd>{assignmentNumber}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-text-heading">Created by:</dt>
          <dd>{createdBy}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-text-heading">Date:</dt>
          <dd>{formatDate(eventDate)}</dd>
        </div>
      </dl>
      {reason && (
        <p className="mt-2 text-sm text-secondary">
          <span className="font-medium text-text-heading">Reason: </span>
          {reason}
        </p>
      )}
      {remarks && (
        <p className="mt-1 text-sm text-secondary">
          <span className="font-medium text-text-heading">Remarks: </span>
          {remarks}
        </p>
      )}
    </article>
  )
}

export function AssignmentHistoryTimeline({
  history,
  currentAssignment,
  perspective,
}: AssignmentHistoryTimelineProps) {
  if (history.length === 0 && !currentAssignment) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-6 text-center shadow-card">
        <p className="text-secondary">No connection history yet.</p>
      </div>
    )
  }

  const pastRecords = history.filter(
    (record) => record.assignmentId !== currentAssignment?.assignmentId,
  )

  const currentTitle =
    currentAssignment &&
    (perspective === 'rukn'
      ? getKarkunById(currentAssignment.karkunId)?.name ?? 'Unknown Karkun'
      : getRuknById(currentAssignment.ruknId)?.name ?? 'Unknown Rukn')

  return (
    <div className="space-y-4">
      {currentAssignment && currentTitle && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
            {currentAssignment.status === 'Suspended' ? 'Suspended Connection' : 'Current Connection'}
          </h3>
          <HistoryCard
            highlight
            title={currentTitle}
            subtitle={`Since ${formatDate(currentAssignment.effectiveFrom)}`}
            assignmentNumber={currentAssignment.assignmentNumber}
            createdBy={currentAssignment.assignedBy}
            eventDate={currentAssignment.effectiveFrom}
            remarks={currentAssignment.remarks}
          />
        </div>
      )}

      {pastRecords.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-secondary">
            History
          </h3>
          <ul className="space-y-3">
            {pastRecords.map((record) => {
              const karkunName = getKarkunById(record.karkunId)?.name ?? record.karkunId
              const ruknName = getRuknById(record.ruknId)?.name ?? record.ruknId

              if (record.status === 'Replaced') {
                return (
                  <li key={record.assignmentId}>
                    <HistoryCard
                      title={`Replaced — ${karkunName}`}
                      subtitle={`Replaced on ${formatDate(record.endedDate ?? record.updatedAt)}`}
                      assignmentNumber={record.assignmentNumber}
                      createdBy={record.assignedBy}
                      eventDate={record.endedDate ?? record.updatedAt}
                      reason={record.replacementReason ? getReplacementReasonLabel(record.replacementReason) : undefined}
                      remarks={record.remarks}
                    />
                  </li>
                )
              }

              if (record.status === 'Unassigned') {
                return (
                  <li key={record.assignmentId}>
                    <HistoryCard
                      title={`Connection removed — ${perspective === 'rukn' ? karkunName : ruknName}`}
                      subtitle={`Removed on ${formatDate(record.endedDate ?? record.updatedAt)}`}
                      assignmentNumber={record.assignmentNumber}
                      createdBy={record.assignedBy}
                      eventDate={record.endedDate ?? record.updatedAt}
                      reason={record.removalReason ? getRemovalReasonLabel(record.removalReason) : undefined}
                      remarks={record.remarks}
                    />
                  </li>
                )
              }

              if (record.status === 'Suspended') {
                return (
                  <li key={record.assignmentId}>
                    <HistoryCard
                      title={`Suspended — ${perspective === 'rukn' ? karkunName : ruknName}`}
                      subtitle={`Since ${formatDate(record.effectiveFrom)}`}
                      assignmentNumber={record.assignmentNumber}
                      createdBy={record.assignedBy}
                      eventDate={record.effectiveFrom}
                      remarks={record.remarks}
                    />
                  </li>
                )
              }

              if (record.status === 'Completed') {
                return (
                  <li key={record.assignmentId}>
                    <HistoryCard
                      title={`Completed — ${perspective === 'rukn' ? karkunName : ruknName}`}
                      subtitle={`Completed on ${formatDate(record.endedDate ?? record.updatedAt)}`}
                      assignmentNumber={record.assignmentNumber}
                      createdBy={record.assignedBy}
                      eventDate={record.endedDate ?? record.updatedAt}
                      remarks={record.remarks}
                    />
                  </li>
                )
              }

              return (
                <li key={record.assignmentId}>
                  <HistoryCard
                    title={`Connected to ${perspective === 'rukn' ? karkunName : ruknName}`}
                    subtitle={`Connected on ${formatDate(record.effectiveFrom)}`}
                    assignmentNumber={record.assignmentNumber}
                    createdBy={record.assignedBy}
                    eventDate={record.effectiveFrom}
                    remarks={record.remarks}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
