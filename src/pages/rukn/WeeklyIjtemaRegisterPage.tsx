/**
 * KC-0082 — Dedicated Weekly Ijtema attendance register (operational list).
 */

import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageShell } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import {
  getCurrentIjtemaAttendance,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import {
  formatWeekLabel,
  getWeekEndingDate,
  type IjtemaAttendanceStatus,
} from '@/types/ijtemaAttendance'

const STATUS_OPTIONS: IjtemaAttendanceStatus[] = ['Present', 'Absent', 'Excused']

type DraftStatus = IjtemaAttendanceStatus | 'Pending'

export function WeeklyIjtemaRegisterPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const { assignmentVersion, getAssignedKarkunanForRukn } = useAssignmentEngine()
  const [attendanceVersion, setAttendanceVersion] = useState(0)
  const [draft, setDraft] = useState<Record<string, DraftStatus>>({})
  const [message, setMessage] = useState('')
  const { busy: saving, run } = useBusyAction()

  useEffect(() => {
    return subscribeToIjtemaAttendanceStore(() => setAttendanceVersion((v) => v + 1))
  }, [])

  const connected = useMemo(
    () => (ruknId ? getAssignedKarkunanForRukn(ruknId) : []),
    [ruknId, assignmentVersion, getAssignedKarkunanForRukn],
  )

  const weekEnding = getWeekEndingDate()
  const weekLabel = formatWeekLabel(weekEnding)
  const connectedKey = connected.map((k) => k.id).join('|')

  useEffect(() => {
    const next: Record<string, DraftStatus> = {}
    for (const karkun of connected) {
      const attendance = getCurrentIjtemaAttendance(karkun.id)
      next[karkun.id] =
        attendance.status === 'Not recorded' ? 'Pending' : attendance.status
    }
    setDraft(next)
    setMessage('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable membership key
  }, [connectedKey, attendanceVersion])

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const setStatus = (karkunId: string, status: IjtemaAttendanceStatus) => {
    setDraft((current) => ({ ...current, [karkunId]: status }))
  }

  const markAllPresent = () => {
    setDraft((current) => {
      const next = { ...current }
      for (const karkun of connected) {
        next[karkun.id] = 'Present'
      }
      return next
    })
  }

  const handleSave = () => {
    if (!ruknId) return
    void run(
      async () => {
        setMessage('')
        let updated = 0
        let error: string | undefined

        for (const karkun of connected) {
          const status = draft[karkun.id]
          if (!status || status === 'Pending') continue
          const result = updateIjtemaAttendance({
            karkunId: karkun.id,
            status,
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
        setMessage(`Saved attendance for ${updated} Karkun${updated === 1 ? '' : 's'}.`)
      },
      { key: `ijtema-register:${ruknId}`, waitForPendingWrites: true, minMs: 400 },
    )
  }

  const pendingCount = connected.filter((k) => {
    const status = draft[k.id] ?? 'Pending'
    return status === 'Pending'
  }).length

  return (
    <PageShell variant="narrow" className="app-screen">
      <header className="app-screen-header">
        <h1 className="app-screen-title">Weekly Ijtema</h1>
        <p className="app-screen-subtitle">Week ending {weekLabel}</p>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" onClick={markAllPresent}>
          Mark all Present
        </SecondaryButton>
        <p className="text-xs text-secondary">
          {connected.length} assigned · {pendingCount} pending
        </p>
      </div>

      {connected.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          No connected Karkuns yet. Connect Karkuns to record attendance.
        </p>
      ) : (
        <ul className="space-y-3">
          {connected.map((karkun) => {
            const status = draft[karkun.id] ?? 'Pending'
            return (
              <li
                key={karkun.id}
                className="rounded-lg border border-border bg-surface px-3 py-3 shadow-card"
              >
                <p className="font-semibold text-text-heading">{karkun.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={[
                        'min-h-11 min-w-[5.5rem] rounded-lg border px-3 text-sm font-semibold',
                        status === option
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface text-text-heading',
                      ].join(' ')}
                      onClick={() => setStatus(karkun.id, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {message ? (
        <p
          className={`mt-3 text-sm ${message.includes('Saved') ? 'text-green-700' : 'text-red-600'}`}
        >
          {message}
        </p>
      ) : null}

      <div className="mt-4">
        <PrimaryButton
          type="button"
          fullWidth
          onClick={handleSave}
          disabled={saving || connected.length === 0}
          loading={saving}
        >
          {saving ? 'Saving…' : 'Save Attendance'}
        </PrimaryButton>
      </div>
    </PageShell>
  )
}
