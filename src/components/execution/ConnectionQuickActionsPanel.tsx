/**
 * KC-0083 — Compact Quick Actions on Connection Detail (execution-first).
 * Reuses KC-0082 matrix cycle helpers — no new persistence.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import {
  baitulMaalStatusChip,
  buildCampaignMatrixRows,
  cycleBaitulMaalCampaignForKarkun,
  cycleIjtemaForKarkun,
  cycleJihAppForKarkun,
  ijtemaStatusChip,
  jihStatusChip,
  saveMatrixRemarks,
  toggleVisitForKarkun,
} from '@/lib/campaignExecutionMatrix'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'

type ConnectionQuickActionsPanelProps = {
  karkunId: string
  ruknId: string
}

export function ConnectionQuickActionsPanel({
  karkunId,
  ruknId,
}: ConnectionQuickActionsPanelProps) {
  const { user } = useAuth()
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    const a = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const i = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    const b = subscribeToBaitulMaalStore(() => setTick((v) => v + 1))
    return () => {
      a()
      i()
      b()
    }
  }, [])

  void tick
  void peopleVersion

  const row = buildCampaignMatrixRows(ruknId).find((r) => r.karkunId === karkunId)
  const rowRemarks = row?.remarks ?? ''

  useEffect(() => {
    setRemarks(rowRemarks)
  }, [rowRemarks, karkunId])

  if (!row) return null

  const jih = jihStatusChip(row.jih)
  const ijtema = ijtemaStatusChip(row.ijtema)
  const baitul = baitulMaalStatusChip(row.baitulMaal)

  const run = (fn: () => { success: true } | { success: false; error: string }) => {
    setError('')
    setSavedNote(false)
    const result = fn()
    if (!result.success) {
      setError(result.error)
      return
    }
    setTick((v) => v + 1)
  }

  const actionClass =
    'flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-heading transition-colors active:bg-primary/10'

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-3 shadow-card"
      aria-label="Quick Actions"
    >
      <h2 className="text-sm font-semibold text-text-heading">Quick Actions</h2>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <div className="mt-2 grid gap-2">
        <button
          type="button"
          className={actionClass}
          onClick={() => run(() => toggleVisitForKarkun(karkunId, ruknId, user?.uid))}
          aria-pressed={row.visitDone}
        >
          <span>{row.visitDone ? '☑' : '☐'} Visit</span>
          <span className="text-xs text-secondary">{row.visitDone ? 'Done' : 'Pending'}</span>
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() =>
            run(() => {
              const result = cycleJihAppForKarkun(karkunId, ruknId)
              return result.success
                ? { success: true as const }
                : { success: false as const, error: result.error }
            })
          }
        >
          <span>
            {row.jih === 'not_discussed' ? '☐' : '☑'} JIH Registration
          </span>
          <span className="text-xs text-secondary">
            {jih.emoji} {jih.label}
          </span>
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() =>
            run(() => {
              const result = cycleIjtemaForKarkun(karkunId, ruknId, user?.uid)
              return result.success
                ? { success: true as const }
                : { success: false as const, error: result.error }
            })
          }
        >
          <span>{row.ijtema === 'Pending' ? '☐' : '☑'} Weekly Ijtema</span>
          <span className="text-xs text-secondary">
            {ijtema.emoji} {ijtema.label}
          </span>
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() =>
            run(() => {
              const result = cycleBaitulMaalCampaignForKarkun(
                karkunId,
                user?.displayName ?? user?.uid ?? 'Rukn',
              )
              return result.success
                ? { success: true as const }
                : { success: false as const, error: result.error }
            })
          }
        >
          <span>{row.baitulMaal === 'not_discussed' ? '☐' : '☑'} Baitul Maal</span>
          <span className="text-xs text-secondary">
            {baitul.emoji} {baitul.label}
          </span>
        </button>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-secondary">Remarks (Optional)</span>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          dir="auto"
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Optional notes…"
        />
      </label>
      <button
        type="button"
        className="mt-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-heading"
        onClick={() => {
          run(() => saveMatrixRemarks(karkunId, ruknId, remarks, user?.uid))
          setSavedNote(true)
        }}
      >
        {savedNote ? 'Remarks saved' : 'Save Remarks'}
      </button>
    </section>
  )
}
