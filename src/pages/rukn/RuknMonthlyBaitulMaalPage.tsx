/**
 * KC-0108 — Rukn Monthly Baitul Maal submission (Contributed / Pending only).
 */

import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PageShell } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { getRuknById } from '@/data/ruknMaster'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import {
  getCurrentMonthlyBaitulMaalCycle,
  getRuknMonthlyBaitulMaalWorkspace,
  listMonthlyBaitulMaalCycles,
  saveMonthlyBaitulMaalSubmission,
} from '@/services/monthlyBaitulMaalService'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import {
  formatMonthlyBaitulMaalLabel,
  type MonthlyBaitulMaalMarkStatus,
} from '@/types/monthlyBaitulMaal'

type DraftStatus = MonthlyBaitulMaalMarkStatus | 'Unmarked'

const STATUS_OPTIONS: { value: MonthlyBaitulMaalMarkStatus; label: string }[] = [
  { value: 'Contributed', label: 'Contributed' },
  { value: 'Pending', label: 'Pending' },
]

export function RuknMonthlyBaitulMaalPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const { assignmentVersion } = useAssignmentEngine()
  const [storeVersion, setStoreVersion] = useState(0)
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, DraftStatus>>({})
  const [message, setMessage] = useState('')
  const { busy: saving, run } = useBusyAction()

  useEffect(() => subscribeToMonthlyBaitulMaalStore(() => setStoreVersion((v) => v + 1)), [])

  const cycles = useMemo(() => {
    void storeVersion
    return listMonthlyBaitulMaalCycles()
  }, [storeVersion])

  const currentCycle = useMemo(() => {
    void storeVersion
    if (selectedCycleId) {
      return cycles.find((cycle) => cycle.id === selectedCycleId) ?? getCurrentMonthlyBaitulMaalCycle()
    }
    return getCurrentMonthlyBaitulMaalCycle()
  }, [cycles, selectedCycleId, storeVersion])

  const workspace = useMemo(() => {
    void assignmentVersion
    void storeVersion
    if (!ruknId || !currentCycle) return null
    const result = getRuknMonthlyBaitulMaalWorkspace(currentCycle.id, ruknId)
    return result.success ? result : null
  }, [ruknId, currentCycle, assignmentVersion, storeVersion])

  const assignedKey = workspace?.assigned.map((k) => k.id).join('|') ?? ''

  useEffect(() => {
    if (!workspace) {
      setDraft({})
      return
    }
    const next: Record<string, DraftStatus> = {}
    for (const karkun of workspace.assigned) {
      const existing = workspace.submission?.marks.find((mark) => mark.karkunId === karkun.id)
      next[karkun.id] = existing?.status ?? 'Unmarked'
    }
    setDraft(next)
    setMessage('')
  }, [assignedKey, workspace?.cycle.id, workspace?.submission?.updatedAt, storeVersion])

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const rukn = getRuknById(ruknId)
  const unmarkedCount = workspace
    ? workspace.assigned.filter((karkun) => (draft[karkun.id] ?? 'Unmarked') === 'Unmarked')
        .length
    : 0
  const allMarked = Boolean(workspace && workspace.assigned.length > 0 && unmarkedCount === 0)
  const canSubmit = Boolean(workspace?.editable && allMarked)

  const setStatus = (karkunId: string, status: MonthlyBaitulMaalMarkStatus) => {
    if (!workspace?.editable) return
    setDraft((current) => ({ ...current, [karkunId]: status }))
  }

  const handleSubmit = () => {
    if (!ruknId || !workspace || !canSubmit) return
    void run(
      async () => {
        setMessage('')
        const marks = workspace.assigned.map((karkun) => {
          const status = draft[karkun.id]
          if (status !== 'Contributed' && status !== 'Pending') {
            setMessage(
              'Please mark contribution status for all assigned Karkuns before submitting.',
            )
            return null
          }
          return {
            karkunId: karkun.id,
            karkunName: karkun.name,
            status,
          }
        })
        if (marks.some((mark) => mark == null)) return

        const result = saveMonthlyBaitulMaalSubmission({
          cycleId: workspace.cycle.id,
          ruknId,
          ruknName: rukn?.name ?? ruknId,
          marks: marks as {
            karkunId: string
            karkunName: string
            status: MonthlyBaitulMaalMarkStatus
          }[],
          submittedBy: user?.displayName ?? user?.uid ?? ruknId,
        })

        if (!result.success) {
          setMessage(result.error)
          return
        }
        setMessage('Baitul Maal status submitted successfully.')
      },
      { key: `monthly-baitul-maal-submit:${ruknId}`, waitForPendingWrites: true, minMs: 400 },
    )
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <header className="app-screen-header">
        <h1 className="app-screen-title">Monthly Baitul Maal</h1>
        <p className="app-screen-subtitle">
          Mark Contributed or Pending for assigned Karkuns. No amounts are recorded.
        </p>
      </header>

      {cycles.length > 1 ? (
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-secondary">Month</span>
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2"
            value={currentCycle?.id ?? ''}
            onChange={(event) => setSelectedCycleId(event.target.value || null)}
          >
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {formatMonthlyBaitulMaalLabel(cycle.monthKey)} · {cycle.status}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!currentCycle || !workspace ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          No open Baitul Maal cycle yet. Please wait for Admin to create and open a cycle.
        </p>
      ) : (
        <>
          <div className="mb-3 rounded-lg border border-border bg-surface px-3 py-3">
            <p className="font-semibold text-text-heading">{workspace.cycle.title}</p>
            <p className="text-sm text-secondary">
              {formatMonthlyBaitulMaalLabel(workspace.cycle.monthKey)} · {workspace.cycle.status}
            </p>
            <p className="mt-1 text-xs text-secondary">
              Deadline{' '}
              {new Date(workspace.cycle.submissionDeadline).toLocaleString('en-GB', {
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
            {workspace.assigned.length} assigned · {unmarkedCount} unmarked
            {workspace.submission ? ' · previously submitted' : ''}
          </p>

          {workspace.assigned.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
              No assigned Karkuns yet.
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
              Please mark contribution status for all assigned Karkuns before submitting.
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
                ? 'Submitting…'
                : workspace.submission
                  ? 'Update Status'
                  : 'Submit Status'}
            </PrimaryButton>
          </div>
        </>
      )}
    </PageShell>
  )
}
