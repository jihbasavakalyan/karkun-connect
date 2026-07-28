/**
 * KC-0108 / KC-0127 — Rukn Monthly Baitul Maal (individual contribution recording).
 * Record one Karkun at a time as contributions arrive; other marks stay unchanged.
 */

import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
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
  upsertMonthlyBaitulMaalKarkunMark,
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
  const [draftSeedKey, setDraftSeedKey] = useState('')
  const [message, setMessage] = useState('')
  const [savingKarkunId, setSavingKarkunId] = useState<string | null>(null)
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
  const submissionUpdatedAt = workspace?.submission?.updatedAt ?? ''
  const cycleId = currentCycle?.id ?? ''
  // Seed only when cycle / roster / saved submission identity changes — not on storeVersion
  // hydrate notifies (KC-BUG-0124 mirrors KC-BUG-0122 Weekly Ijtema).
  const nextSeedKey = ruknId && cycleId ? `${cycleId}|${assignedKey}|${submissionUpdatedAt}` : ''
  if (nextSeedKey !== draftSeedKey) {
    setDraftSeedKey(nextSeedKey)
    if (!workspace) {
      setDraft({})
    } else {
      const next: Record<string, DraftStatus> = {}
      for (const karkun of workspace.assigned) {
        const existing = workspace.submission?.marks.find((mark) => mark.karkunId === karkun.id)
        next[karkun.id] = existing?.status ?? 'Unmarked'
      }
      setDraft(next)
    }
  }

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const rukn = getRuknById(ruknId)
  const contributedCount = workspace
    ? workspace.assigned.filter((karkun) => (draft[karkun.id] ?? 'Unmarked') === 'Contributed')
        .length
    : 0
  const pendingCount = workspace
    ? workspace.assigned.filter((karkun) => (draft[karkun.id] ?? 'Unmarked') === 'Pending').length
    : 0
  const unrecordedCount = workspace
    ? workspace.assigned.filter((karkun) => (draft[karkun.id] ?? 'Unmarked') === 'Unmarked')
        .length
    : 0

  const saveMark = (karkunId: string, status: MonthlyBaitulMaalMarkStatus) => {
    if (!ruknId || !workspace?.editable) return
    const karkun = workspace.assigned.find((row) => row.id === karkunId)
    if (!karkun) return

    setDraft((current) => ({ ...current, [karkunId]: status }))
    setSavingKarkunId(karkunId)
    void run(
      async () => {
        setMessage('')
        const result = upsertMonthlyBaitulMaalKarkunMark({
          cycleId: workspace.cycle.id,
          ruknId,
          ruknName: rukn?.name ?? ruknId,
          karkunId,
          karkunName: karkun.name,
          status,
          submittedBy: user?.displayName ?? user?.uid ?? ruknId,
        })

        if (!result.success) {
          setMessage(result.error)
          return
        }

        try {
          const { awaitQueuedWrite } = await import('@/repositories/firestore/firestoreRepositories')
          await awaitQueuedWrite('compliance.monthlyBaitulMaalSubmissions')
        } catch {
          // local provider has no queue
        }

        setMessage(
          status === 'Contributed'
            ? `${karkun.name} marked Contributed. Dashboard and reports update immediately.`
            : `${karkun.name} marked Pending. Other Connected Karkuns are unchanged.`,
        )
      },
      {
        key: `monthly-baitul-maal-mark:${ruknId}:${karkunId}`,
        waitForPendingWrites: true,
        minMs: 250,
      },
    ).finally(() => {
      setSavingKarkunId(null)
    })
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <header className="app-screen-header">
        <h1 className="app-screen-title">Monthly Baitul Maal</h1>
        <p className="app-screen-subtitle">
          Record each contribution individually as it is received. You do not need to update every
          Connected Karkun in one sitting.
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
            {workspace.assigned.length} connected · {contributedCount} contributed · {pendingCount}{' '}
            pending · {unrecordedCount} not yet recorded
          </p>

          {workspace.assigned.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
              No connected Karkuns yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {workspace.assigned.map((karkun) => {
                const status = draft[karkun.id] ?? 'Unmarked'
                const rowBusy = saving && savingKarkunId === karkun.id
                return (
                  <li
                    key={karkun.id}
                    className="rounded-lg border border-border bg-surface px-3 py-3 shadow-card"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-text-heading">{karkun.name}</p>
                      <p className="text-xs text-secondary">
                        {status === 'Unmarked' ? 'Not yet recorded' : status}
                        {rowBusy ? ' · Saving…' : ''}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          disabled={!workspace.editable || saving}
                          className={[
                            'min-h-11 min-w-[6.5rem] rounded-lg border px-3 text-sm font-semibold',
                            status === option.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-surface text-text-heading',
                            !workspace.editable || saving ? 'opacity-60' : '',
                          ].join(' ')}
                          onClick={() => saveMark(karkun.id, option.value)}
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

          {unrecordedCount > 0 && workspace.editable ? (
            <p className="mt-3 text-sm text-secondary" role="status">
              Unrecorded people stay unchanged until their contribution is received.
            </p>
          ) : null}

          {message ? (
            <p
              className={`mt-3 text-sm ${
                message.includes('failed') || message.includes('error') || message.includes('Error')
                  ? 'text-red-600'
                  : message.includes('marked') || message.includes('immediately')
                    ? 'text-green-700'
                    : 'text-red-600'
              }`}
            >
              {message}
            </p>
          ) : null}
        </>
      )}
    </PageShell>
  )
}
