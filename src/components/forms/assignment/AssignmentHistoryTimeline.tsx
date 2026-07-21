import { useMemo, useState } from 'react'
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

type HistoryTone = 'connected' | 'transfer' | 'removed' | 'replaced' | 'suspended' | 'completed' | 'other'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function toneMeta(tone: HistoryTone): { icon: string; label: string; className: string } {
  switch (tone) {
    case 'connected':
      return {
        icon: '🟢',
        label: 'Connected',
        className: 'border-l-emerald-500 bg-emerald-50/40 border-emerald-100',
      }
    case 'transfer':
      return {
        icon: '🔄',
        label: 'Transfer',
        className: 'border-l-sky-500 bg-sky-50/50 border-sky-100',
      }
    case 'removed':
      return {
        icon: '🔴',
        label: 'Removed',
        className: 'border-l-rose-500 bg-rose-50/40 border-rose-100',
      }
    case 'replaced':
      return {
        icon: '🟠',
        label: 'Replaced',
        className: 'border-l-orange-500 bg-orange-50/40 border-orange-100',
      }
    case 'suspended':
      return {
        icon: '⏸️',
        label: 'Suspended',
        className: 'border-l-amber-500 bg-amber-50/40 border-amber-100',
      }
    case 'completed':
      return {
        icon: '✅',
        label: 'Completed',
        className: 'border-l-slate-500 bg-slate-50 border-slate-200',
      }
    default:
      return {
        icon: '•',
        label: 'Event',
        className: 'border-l-slate-400 bg-slate-50/80 border-slate-200',
      }
  }
}

function HistoryCard({
  title,
  subtitle,
  assignmentNumber,
  createdBy,
  eventDate,
  reason,
  remarks,
  tone,
  highlight,
}: {
  title: string
  subtitle: string
  assignmentNumber: string
  createdBy: string
  eventDate: string
  reason?: string
  remarks?: string
  tone: HistoryTone
  highlight?: boolean
}) {
  const meta = toneMeta(tone)
  return (
    <article
      className={`relative rounded-md border border-l-4 px-4 py-3 shadow-none ${
        highlight
          ? 'border-primary/30 bg-primary/5 border-l-primary'
          : meta.className
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base leading-none" aria-hidden>
          {meta.icon}
        </span>
        <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
          {meta.label}
        </span>
      </div>
      <p className="mt-1.5 font-semibold text-text-heading">{title}</p>
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

function RemovedConnectionsGroup({
  dateLabel,
  records,
  perspective,
}: {
  dateLabel: string
  records: AssignmentRecord[]
  perspective: 'rukn' | 'karkun'
}) {
  const [expanded, setExpanded] = useState(false)
  const names = records.map((record) =>
    perspective === 'rukn'
      ? getKarkunById(record.karkunId)?.name ?? record.karkunId
      : getRuknById(record.ruknId)?.name ?? record.ruknId,
  )
  const meta = toneMeta('removed')

  return (
    <li className="relative pl-6">
      <span
        className="absolute left-[0.4rem] top-4 h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100"
        aria-hidden
      />
      <article className={`rounded-md border border-l-4 px-4 py-3 shadow-none ${meta.className}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base leading-none" aria-hidden>
                {meta.icon}
              </span>
              <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                {meta.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-secondary">{dateLabel}</p>
            <p className="mt-0.5 font-semibold text-text-heading">Connections Removed</p>
            <p className="mt-1 text-sm text-secondary">
              {records.length} Karkun{records.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </button>
        </div>
        {expanded ? (
          <ul className="mt-3 space-y-1 border-t border-rose-100 pt-3 text-sm text-text-heading">
            {names.map((name, index) => (
              <li key={`${records[index]!.assignmentId}-${name}`}>{name}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </li>
  )
}

type HistoryItem =
  | { kind: 'single'; record: AssignmentRecord }
  | { kind: 'removed-group'; day: string; records: AssignmentRecord[] }

function buildHistoryItems(
  historical: AssignmentRecord[],
  perspective: 'rukn' | 'karkun',
): HistoryItem[] {
  // KC-0068 — group consecutive same-day connection removals (presentation only).
  const items: HistoryItem[] = []
  let pendingGroup: AssignmentRecord[] = []
  let pendingDay: string | null = null

  const flushGroup = () => {
    if (pendingGroup.length === 0) return
    if (pendingGroup.length === 1) {
      items.push({ kind: 'single', record: pendingGroup[0]! })
    } else {
      items.push({ kind: 'removed-group', day: pendingDay!, records: [...pendingGroup] })
    }
    pendingGroup = []
    pendingDay = null
  }

  for (const record of historical) {
    const isPlainRemoval =
      perspective === 'rukn' &&
      record.status === 'Unassigned' &&
      record.removalReason !== 'Transferred'

    if (isPlainRemoval) {
      const key = dayKey(record.endedDate ?? record.updatedAt)
      if (pendingDay === key) {
        pendingGroup.push(record)
      } else {
        flushGroup()
        pendingDay = key
        pendingGroup = [record]
      }
      continue
    }

    flushGroup()
    items.push({ kind: 'single', record })
  }

  flushGroup()
  return items
}

function toneForRecord(record: AssignmentRecord): HistoryTone {
  if (record.status === 'Active') return 'connected'
  if (record.status === 'Replaced') return 'replaced'
  if (record.status === 'Suspended') return 'suspended'
  if (record.status === 'Completed') return 'completed'
  if (record.status === 'Unassigned' && record.removalReason === 'Transferred') return 'transfer'
  if (record.status === 'Unassigned') return 'removed'
  return 'other'
}

function renderSingleHistoryItem(
  record: AssignmentRecord,
  perspective: 'rukn' | 'karkun',
) {
  const karkunName = getKarkunById(record.karkunId)?.name ?? record.karkunId
  const ruknName = getRuknById(record.ruknId)?.name ?? record.ruknId
  const tone = toneForRecord(record)

  if (record.status === 'Replaced') {
    return (
      <HistoryCard
        tone={tone}
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
    )
  }

  if (record.status === 'Unassigned') {
    const isTransfer = record.removalReason === 'Transferred'
    const survivingAsn =
      record.remarks?.match(/Surviving connection:\s*(ASN-\d+)/i)?.[1] ??
      record.assignmentNumber
    return (
      <HistoryCard
        tone={tone}
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
          record.removalReason ? getRemovalReasonLabel(record.removalReason) : undefined
        }
        remarks={record.remarks}
      />
    )
  }

  if (record.status === 'Suspended') {
    return (
      <HistoryCard
        tone={tone}
        title={`Suspended — ${perspective === 'rukn' ? karkunName : ruknName}`}
        subtitle={`Since ${formatDate(record.effectiveFrom)}`}
        assignmentNumber={record.assignmentNumber}
        createdBy={record.assignedBy}
        eventDate={record.effectiveFrom}
        remarks={record.remarks}
      />
    )
  }

  if (record.status === 'Completed') {
    return (
      <HistoryCard
        tone={tone}
        title={`Completed — ${perspective === 'rukn' ? karkunName : ruknName}`}
        subtitle={`Completed on ${formatDate(record.endedDate ?? record.updatedAt)}`}
        assignmentNumber={record.assignmentNumber}
        createdBy={record.assignedBy}
        eventDate={record.endedDate ?? record.updatedAt}
        remarks={record.remarks}
      />
    )
  }

  return (
    <HistoryCard
      tone={tone}
      title={`${record.status} — ${perspective === 'rukn' ? karkunName : ruknName}`}
      subtitle={`Updated ${formatDate(record.updatedAt || record.effectiveFrom)}`}
      assignmentNumber={record.assignmentNumber}
      createdBy={record.assignedBy}
      eventDate={record.updatedAt || record.effectiveFrom}
      remarks={record.remarks}
    />
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
  const historyItems = useMemo(
    () => buildHistoryItems(historical, perspective),
    [historical, perspective],
  )

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
                    tone="connected"
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

      {historyItems.length > 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Connection History
          </h3>
          <ul className="relative space-y-3 before:absolute before:bottom-2 before:left-[0.7rem] before:top-2 before:w-px before:bg-slate-300">
            {historyItems.map((item) => {
              if (item.kind === 'removed-group') {
                return (
                  <RemovedConnectionsGroup
                    key={`removed-${item.day}`}
                    dateLabel={formatDate(item.day)}
                    records={item.records}
                    perspective={perspective}
                  />
                )
              }
              return (
                <li key={item.record.assignmentId} className="relative pl-6">
                  <span
                    className="absolute left-[0.4rem] top-4 h-2.5 w-2.5 rounded-full bg-slate-400 ring-4 ring-slate-100"
                    aria-hidden
                  />
                  {renderSingleHistoryItem(item.record, perspective)}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
