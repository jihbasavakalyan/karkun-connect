/**
 * KC-0107 — Rukn Weekly Ijtema attendance (Present / Absent only).
 */

import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PageShell } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { getRuknById } from '@/data/ruknMaster'
import {
  EXECUTION_PERSIST_FAILED_EVENT,
  type ExecutionPersistFailedDetail,
} from '@/lib/executionPersistEvents'
import { ensureWeeklyIjtemaAttendanceWindows } from '@/lib/weeklyIjtema/attendanceWindowEngine'
import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import {
  getCurrentWeeklyIjtemaEvent,
  getRuknWeeklyIjtemaWorkspace,
  listWeeklyIjtemaEvents,
  saveWeeklyIjtemaSubmission,
} from '@/services/weeklyIjtemaService'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import {
  formatWeeklyIjtemaMeetingLabel,
  type WeeklyIjtemaMarkStatus,
} from '@/types/weeklyIjtema'

type DraftStatus = WeeklyIjtemaMarkStatus | 'Unmarked'

function buildDraftFromWorkspace(
  eventId: string,
  ruknId: string,
): Record<string, DraftStatus> {
  const result = getRuknWeeklyIjtemaWorkspace(eventId, ruknId)
  if (!result.success) return {}
  const next: Record<string, DraftStatus> = {}
  for (const karkun of result.assigned) {
    const existing = result.submission?.marks.find((mark) => mark.karkunId === karkun.id)
    next[karkun.id] = existing?.status ?? 'Unmarked'
  }
  return next
}

const STATUS_OPTIONS: { value: WeeklyIjtemaMarkStatus; label: string; urdu: string }[] = [
  { value: 'Present', label: 'Present', urdu: 'حاضر' },
  { value: 'Absent', label: 'Absent', urdu: 'غیر حاضر' },
]

export function WeeklyIjtemaRegisterPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const { assignmentVersion } = useAssignmentEngine()
  const [storeVersion, setStoreVersion] = useState(0)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, DraftStatus>>({})
  const [draftSeedKey, setDraftSeedKey] = useState('')
  const [message, setMessage] = useState('')
  const { busy: saving, progressMessage, run } = useWriteLifecycle()

  useEffect(() => {
    ensureWeeklyIjtemaAttendanceWindows()
    return subscribeToWeeklyIjtemaStore(() => setStoreVersion((v) => v + 1))
  }, [])

  useEffect(() => {
    const onPersistFailed = (event: Event) => {
      const detail = (event as CustomEvent<ExecutionPersistFailedDetail>).detail
      if (!detail) return
      if (
        detail.label !== 'compliance.weeklyIjtemaSubmissions' &&
        detail.label !== 'compliance.weeklyIjtemaEvents'
      ) {
        return
      }
      setMessage(`Save failed: ${detail.message}`)
    }
    window.addEventListener(EXECUTION_PERSIST_FAILED_EVENT, onPersistFailed)
    return () => window.removeEventListener(EXECUTION_PERSIST_FAILED_EVENT, onPersistFailed)
  }, [])

  const events = useMemo(() => {
    void storeVersion
    const all = listWeeklyIjtemaEvents()
    if (!ruknId) return all
    const gender: WeeklyIjtemaAudienceGender =
      getRuknById(ruknId)?.gender === 'Female' ? 'Female' : 'Male'
    const scoped = all.filter(
      (event) => !event.audienceGender || event.audienceGender === gender,
    )
    return scoped.length > 0 ? scoped : all
  }, [storeVersion, ruknId])

  const currentEvent = useMemo(() => {
    void storeVersion
    const gender: WeeklyIjtemaAudienceGender | undefined = ruknId
      ? getRuknById(ruknId)?.gender === 'Female'
        ? 'Female'
        : 'Male'
      : undefined
    if (selectedEventId) {
      return (
        events.find((event) => event.id === selectedEventId) ??
        getCurrentWeeklyIjtemaEvent({ audienceGender: gender })
      )
    }
    return getCurrentWeeklyIjtemaEvent({ audienceGender: gender })
  }, [events, selectedEventId, storeVersion, ruknId])

  const workspace = useMemo(() => {
    void assignmentVersion
    void storeVersion
    if (!ruknId || !currentEvent) return null
    const result = getRuknWeeklyIjtemaWorkspace(currentEvent.id, ruknId)
    return result.success ? result : null
  }, [ruknId, currentEvent, assignmentVersion, storeVersion])

  const assignedKey = workspace?.assigned.map((k) => k.id).join('|') ?? ''
  const submissionUpdatedAt = workspace?.submission?.updatedAt ?? ''
  const eventId = currentEvent?.id ?? ''
  // Seed only when meeting / roster / saved submission identity changes — not on storeVersion
  // hydrate notifies (KC-BUG-0122: those were wiping Present/Absent before Submit enabled).
  const nextSeedKey = ruknId && eventId ? `${eventId}|${assignedKey}|${submissionUpdatedAt}` : ''
  if (nextSeedKey !== draftSeedKey) {
    setDraftSeedKey(nextSeedKey)
    setDraft(nextSeedKey && ruknId && eventId ? buildDraftFromWorkspace(eventId, ruknId) : {})
  }

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const rukn = getRuknById(ruknId)
  const unmarkedCount = workspace
    ? workspace.assigned.filter((karkun) => (draft[karkun.id] ?? 'Unmarked') === 'Unmarked').length
    : 0
  const allMarked = Boolean(workspace && workspace.assigned.length > 0 && unmarkedCount === 0)
  const canSubmit = Boolean(workspace?.editable && allMarked)

  const setStatus = (karkunId: string, status: WeeklyIjtemaMarkStatus) => {
    if (!workspace?.editable) return
    setDraft((current) => ({ ...current, [karkunId]: status }))
  }

  const handleSubmit = () => {
    if (!ruknId || !workspace || !canSubmit) return
    void run({
      key: `weekly-ijtema-submit:${ruknId}`,
      queueLabels: ['compliance.weeklyIjtemaSubmissions'],
      work: async () => {
        setMessage('')
        const marks = workspace.assigned.map((karkun) => {
          const status = draft[karkun.id]
          if (status !== 'Present' && status !== 'Absent') {
            return null
          }
          return {
            karkunId: karkun.id,
            karkunName: karkun.name,
            status,
          }
        })
        if (marks.some((mark) => mark == null)) {
          throw Object.assign(
            new Error('Please mark attendance for all connected Karkuns before submitting.'),
            { code: 'validation' },
          )
        }

        const result = saveWeeklyIjtemaSubmission({
          eventId: workspace.event.id,
          ruknId,
          ruknName: rukn?.name ?? ruknId,
          marks: marks as { karkunId: string; karkunName: string; status: 'Present' | 'Absent' }[],
          submittedBy: user?.displayName ?? user?.uid ?? ruknId,
        })

        if (!result.success) {
          throw Object.assign(new Error(result.error), { code: 'unknown' })
        }

        return result
      },
      refreshUi: () => setStoreVersion((v) => v + 1),
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        setMessage(lifecycle.message)
        return
      }
      setMessage('Attendance submitted successfully.')
    })
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <header className="app-screen-header">
        <h1 className="app-screen-title">{"Today's Weekly Ijtema Attendance"}</h1>
        <p className="app-screen-subtitle">
          Mark Present (حاضر) or Absent (غیر حاضر) for connected Karkuns.
        </p>
      </header>

      {events.length > 1 ? (
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-secondary">Meeting</span>
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2"
            value={currentEvent?.id ?? ''}
            onChange={(event) => setSelectedEventId(event.target.value || null)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {formatWeeklyIjtemaMeetingLabel(event.meetingDate)} · {event.status}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!currentEvent || !workspace ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          No open Weekly Ijtema meeting yet. Please wait for Admin to create and open attendance.
        </p>
      ) : (
        <>
          <div className="mb-3 rounded-lg border border-border bg-surface px-3 py-3">
            <p className="font-semibold text-text-heading">{workspace.event.title}</p>
            <p className="text-sm text-secondary">
              {formatWeeklyIjtemaMeetingLabel(workspace.event.meetingDate)} · {workspace.event.status}
            </p>
            <p className="mt-1 text-xs text-secondary">
              Deadline{' '}
              {new Date(workspace.event.submissionDeadline).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {workspace.readOnlyReason ? (
              <p className="mt-2 text-sm text-amber-700">{workspace.readOnlyReason}</p>
            ) : null}
          </div>

          <p className="mb-3 text-xs text-secondary">
            {workspace.assigned.length} connected · {unmarkedCount} unmarked
            {workspace.submission ? ' · previously submitted' : ''}
          </p>

          {workspace.assigned.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
              No connected Karkuns yet. Connect Karkuns to record attendance.
            </p>
          ) : (
            <ul className="space-y-3">
              {workspace.assigned.map((karkun) => {
                const status = draft[karkun.id] ?? 'Unmarked'
                return (
                  <li
                    key={karkun.id}
                    className="rounded-lg border border-border bg-surface px-3 py-3 shadow-card"
                  >
                    <p className="font-semibold text-text-heading">{karkun.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          disabled={!workspace.editable}
                          className={[
                            'min-h-11 min-w-[6.5rem] rounded-lg border px-3 text-sm font-semibold',
                            status === option.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-surface text-text-heading',
                            !workspace.editable ? 'opacity-60' : '',
                          ].join(' ')}
                          onClick={() => setStatus(karkun.id, option.value)}
                        >
                          {option.label}
                          <span className="mt-0.5 block text-[0.7rem] font-normal opacity-80">
                            {option.urdu}
                          </span>
                        </button>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {!allMarked && workspace.assigned.length > 0 ? (
            <p className="mt-3 text-sm text-amber-700" role="status">
              Please mark attendance for all connected Karkuns before submitting.
            </p>
          ) : null}

          {message ? (
            <p
              className={`mt-3 text-sm ${message.includes('success') ? 'text-green-700' : 'text-red-600'}`}
            >
              {message}
            </p>
          ) : null}

          <div className="mt-4">
            <PrimaryButton
              type="button"
              fullWidth
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
              loading={saving}
            >
              {saving
                ? progressMessage || 'محفوظ کیا جا رہا ہے...'
                : workspace.submission
                  ? 'Update Attendance'
                  : 'Submit Attendance'}
            </PrimaryButton>
          </div>
        </>
      )}
    </PageShell>
  )
}
