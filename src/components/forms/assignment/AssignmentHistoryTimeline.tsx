import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { partitionConnectionPresentation } from '@/lib/connections/partitionConnectionPresentation'
import type { AssignmentRecord } from '@/types/assignment'
import { getRemovalReasonLabel, getReplacementReasonLabel } from '@/types/assignment'

type AssignmentHistoryTimelineProps = {
  history: AssignmentRecord[]
  /** @deprecated Prefer activeAssignments — single primary is insufficient for multi-Active Rukns. */
  currentAssignment?: AssignmentRecord | null
  /** KC-003.1 — all current Active connections (shown above History). */
  activeAssignments?: AssignmentRecord[]
  perspective: 'rukn' | 'karkun'
  /**
   * KC-0053 — When the page already renders Connected Karkuns, hide the duplicate
   * "Current Connections" block and show History only.
   */
  showCurrent?: boolean
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
  activeAssignments,
  perspective,
  showCurrent = true,
}: AssignmentHistoryTimelineProps) {
  const { current, historical } = partitionConnectionPresentation(history, {
    activeAssignments,
    currentAssignment,
  })
  const visibleCurrent = showCurrent ? current : []

  if (visibleCurrent.length === 0 && historical.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-6 text-center shadow-card">
        <p className="text-secondary">No connection history yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visibleCurrent.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
            {visibleCurrent.length === 1 && visibleCurrent[0]!.status === 'Suspended'
              ? 'Suspended Connection'
              : visibleCurrent.length === 1
                ? 'Current Connection'
                : 'Current Connections'}
          </h3>
          <ul className="space-y-3">
            {visibleCurrent.map((record) => {
              const title =
                perspective === 'rukn'
                  ? getKarkunById(record.karkunId)?.name ?? 'Unknown Karkun'
                  : getRuknById(record.ruknId)?.name ?? 'Unknown Rukn'
              const latestTransfer = record.transferHistory?.[record.transferHistory.length - 1]
              const transferNote = latestTransfer
                ? `Last transferred ${formatDate(latestTransfer.at)} from ${
                    getRuknById(latestTransfer.fromRuknId)?.name ?? latestTransfer.fromRuknId
                  } to ${getRuknById(latestTransfer.toRuknId)?.name ?? latestTransfer.toRuknId}`
                : undefined
              return (
                <li key={record.assignmentId}>
                  <HistoryCard
                    highlight
                    title={title}
                    subtitle={`Since ${formatDate(record.effectiveFrom)}`}
                    assignmentNumber={record.assignmentNumber}
                    createdBy={record.assignedBy}
                    eventDate={record.effectiveFrom}
                    remarks={[transferNote, record.remarks].filter(Boolean).join(' — ') || undefined}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {historical.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-secondary">
            History
          </h3>
          <ul className="space-y-3">
            {historical.map((record) => {
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
                      reason={
                        record.replacementReason
                          ? getReplacementReasonLabel(record.replacementReason)
                          : undefined
                      }
                      remarks={record.remarks}
                    />
                  </li>
                )
              }

              if (record.status === 'Unassigned') {
                const isTransfer = record.removalReason === 'Transferred'
                const survivingAsn =
                  record.remarks?.match(/Surviving connection:\s*(ASN-\d+)/i)?.[1] ??
                  record.assignmentNumber
                return (
                  <li key={record.assignmentId}>
                    <HistoryCard
                      title={
                        isTransfer
                          ? `Transferred — ${perspective === 'rukn' ? karkunName : ruknName}`
                          : `Connection removed — ${perspective === 'rukn' ? karkunName : ruknName}`
                      }
                      subtitle={
                        isTransfer
                          ? `Transferred on ${formatDate(record.endedDate ?? record.updatedAt)}`
                          : `Removed on ${formatDate(record.endedDate ?? record.updatedAt)}`
                      }
                      assignmentNumber={survivingAsn || '—'}
                      createdBy={record.assignedBy}
                      eventDate={record.endedDate ?? record.updatedAt}
                      reason={
                        record.removalReason
                          ? getRemovalReasonLabel(record.removalReason)
                          : undefined
                      }
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

              // Non-Active unknown statuses — still history-only, never "Connected to".
              return (
                <li key={record.assignmentId}>
                  <HistoryCard
                    title={`${record.status} — ${perspective === 'rukn' ? karkunName : ruknName}`}
                    subtitle={`Updated ${formatDate(record.updatedAt || record.effectiveFrom)}`}
                    assignmentNumber={record.assignmentNumber}
                    createdBy={record.assignedBy}
                    eventDate={record.updatedAt || record.effectiveFrom}
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
