/**
 * Rukn Home — Weekly Ijtema attendance (KC-006 / KC-009.1).
 * Dirty tracking is touch-based so Present/Absent/Excused all enable Save.
 */

import { useEffect, useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import {
  getFilterWeekEndingDate,
  getIjtemaAttendanceForKarkun,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import {
  formatWeekLabel,
  getIjtemaWeekFilterOptions,
  type IjtemaAttendanceStatus,
} from '@/types/ijtemaAttendance'

type RuknIjtemaAttendancePanelProps = {
  ruknId: string
}

type DraftStatus = IjtemaAttendanceStatus | 'Not recorded'

const STATUS_OPTIONS: IjtemaAttendanceStatus[] = ['Present', 'Absent', 'Excused']

export function RuknIjtemaAttendancePanel({ ruknId }: RuknIjtemaAttendancePanelProps) {
  const { user } = useAuth()
  const { assignmentVersion, getAssignedKarkunanForRukn } = useAssignmentEngine()
  const [attendanceVersion, setAttendanceVersion] = useState(0)
  const [weekFilter, setWeekFilter] = useState('')
  const [draft, setDraft] = useState<Record<string, DraftStatus>>({})
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [touchedIds, setTouchedIds] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState('')
  const { busy: saving, run } = useBusyAction()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    return subscribeToIjtemaAttendanceStore(() => setAttendanceVersion((value) => value + 1))
  }, [])

  const connected = useMemo(
    () => getAssignedKarkunanForRukn(ruknId),
    [ruknId, assignmentVersion, getAssignedKarkunanForRukn],
  )
  const weekEndingDate = getFilterWeekEndingDate(weekFilter)
  const weekOptions = useMemo(() => getIjtemaWeekFilterOptions(), [])
  const connectedKey = connected.map((karkun) => karkun.id).join('|')

  useEffect(() => {
    const nextDraft: Record<string, DraftStatus> = {}
    const nextRemarks: Record<string, string> = {}
    for (const karkun of connected) {
      const attendance = getIjtemaAttendanceForKarkun(karkun.id, weekEndingDate)
      nextDraft[karkun.id] = attendance.status
      nextRemarks[karkun.id] = attendance.remarks ?? ''
    }
    setDraft(nextDraft)
    setRemarks(nextRemarks)
    setTouchedIds(new Set())
    setMessage('')
    // connectedKey captures membership without resetting on new array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable key
  }, [connectedKey, weekEndingDate, attendanceVersion])

  if (connected.length === 0) {
    return null
  }

  const dirtyCount = connected.filter((karkun) => {
    if (touchedIds.has(karkun.id)) return true
    const saved = getIjtemaAttendanceForKarkun(karkun.id, weekEndingDate)
    const draftStatus = draft[karkun.id] ?? 'Not recorded'
    const draftRemark = (remarks[karkun.id] ?? '').trim()
    if (draftStatus === 'Not recorded') {
      return saved.status !== 'Not recorded'
    }
    return draftStatus !== saved.status || draftRemark !== (saved.remarks ?? '').trim()
  }).length

  const markTouched = (ids: string[]) => {
    setTouchedIds((current) => {
      const next = new Set(current)
      for (const id of ids) next.add(id)
      return next
    })
  }

  const setStatus = (karkunId: string, status: IjtemaAttendanceStatus) => {
    markTouched([karkunId])
    setDraft((current) => ({ ...current, [karkunId]: status }))
  }

  const handleSave = () => {
    void run(
      async () => {
        let updated = 0
        let error: string | undefined

        for (const karkun of connected) {
          const status = draft[karkun.id]
          if (!status || status === 'Not recorded') continue

          const result = updateIjtemaAttendance({
            karkunId: karkun.id,
            weekEndingDate,
            status,
            remarks: remarks[karkun.id],
            updatedBy: user?.displayName ?? user?.uid ?? ruknId,
            ruknId,
          })

          if (result.success) {
            updated += 1
          } else {
            error = result.error
            break
          }
        }

        if (error) {
          setMessage(error)
          return
        }
        setTouchedIds(new Set())
        setMessage(`Saved attendance for ${updated} Karkun${updated === 1 ? '' : 's'}.`)
      },
      { key: `home-ijtema:${ruknId}`, waitForPendingWrites: true, minMs: 400 },
    )
  }

  const markAll = (status: IjtemaAttendanceStatus) => {
    markTouched(connected.map((karkun) => karkun.id))
    setDraft((current) => {
      const next = { ...current }
      for (const karkun of connected) {
        next[karkun.id] = status
      }
      return next
    })
  }

  const markedCount = connected.filter((karkun) => {
    const status = draft[karkun.id] ?? 'Not recorded'
    return status !== 'Not recorded'
  }).length

  const canSave =
    dirtyCount > 0 &&
    connected.some((karkun) => {
      const status = draft[karkun.id]
      return Boolean(status && status !== 'Not recorded')
    })

  return (
    <section className="cd-panel cd-panel-secondary rukn-ijtema-compact" aria-label="Weekly Ijtema attendance">
      <div className="rukn-ijtema-summary">
        <div>
          <h2 className="cd-section-heading cd-section-heading-sm">Weekly Ijtema</h2>
          <p className="cd-caption mt-0.5">
            {markedCount} / {connected.length} Marked
          </p>
        </div>
        <button
          type="button"
          className="rukn-ijtema-expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '▲ Hide' : '▼ Record Attendance'}
        </button>
      </div>

      {expanded ? (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor="rukn-ijtema-week" className="text-sm font-medium text-text-heading">
                Week
              </label>
              <select
                id="rukn-ijtema-week"
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {weekOptions.map((option) => (
                  <option key={option.value || 'current'} value={option.value}>
                    {option.label}
                    {option.value === '' || option.value === weekEndingDate
                      ? ` (${formatWeekLabel(weekEndingDate)})`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                type="button"
                className="min-h-10 px-3 py-2 text-sm"
                onClick={() => markAll('Present')}
              >
                All Present
              </SecondaryButton>
              <SecondaryButton
                type="button"
                className="min-h-10 px-3 py-2 text-sm"
                onClick={() => markAll('Absent')}
              >
                All Absent
              </SecondaryButton>
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {connected.map((karkun) => (
              <li
                key={karkun.id}
                className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-text-heading">{karkun.name}</p>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={`Attendance for ${karkun.name}`}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <label
                        key={status}
                        className={[
                          'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold',
                          draft[karkun.id] === status
                            ? 'border-primary bg-primary-muted text-primary'
                            : 'border-border bg-surface text-secondary',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`ijtema-${karkun.id}`}
                          checked={draft[karkun.id] === status}
                          onChange={() => setStatus(karkun.id, status)}
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={remarks[karkun.id] ?? ''}
                  onChange={(e) => {
                    markTouched([karkun.id])
                    setRemarks((current) => ({ ...current, [karkun.id]: e.target.value }))
                  }}
                  placeholder="Remarks (optional)"
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PrimaryButton
              type="button"
              disabled={saving || !canSave}
              loading={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : `Save attendance${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
            </PrimaryButton>
            {message ? <p className="text-sm text-secondary">{message}</p> : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
