/**
 * KC-0083 / KC-0098 — Compact Quick Actions with single-action protection.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
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
import {
  EXECUTION_PERSIST_FAILED_EVENT,
  confirmExecutionSaveFeedback,
  type ExecutionPersistFailedDetail,
} from '@/lib/executionPersistEvents'

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
  const { busy, busyKey, run } = useBusyAction()
  const [tick, setTick] = useState(0)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    const a = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const i = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    const b = subscribeToBaitulMaalStore(() => setTick((v) => v + 1))
    const onPersistFailed = (event: Event) => {
      const detail = (event as CustomEvent<ExecutionPersistFailedDetail>).detail
      if (!detail) return
      setSavedNote(false)
      setError(`Save failed (${detail.label}): ${detail.message}`)
    }
    window.addEventListener(EXECUTION_PERSIST_FAILED_EVENT, onPersistFailed)
    return () => {
      a()
      i()
      b()
      window.removeEventListener(EXECUTION_PERSIST_FAILED_EVENT, onPersistFailed)
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

  const runAction = (
    key: string,
    fn: () => { success: true } | { success: false; error: string },
    successMessage?: string,
  ) => {
    void run(
      async () => {
        setError('')
        setSavedNote(false)
        const result = fn()
        if (!result.success) {
          setError(result.error)
          return
        }
        setTick((v) => v + 1)
        if (successMessage) {
          await confirmExecutionSaveFeedback(successMessage)
        }
      },
      { key, waitForPendingWrites: Boolean(successMessage), minMs: 400 },
    )
  }

  const actionClass =
    'flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-heading transition-colors active:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-3 shadow-card"
      aria-label="Quick Actions"
    >
      <h2 className="text-sm font-semibold text-text-heading">Quick Actions</h2>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {busy ? <p className="mt-2 text-xs text-secondary">Saving…</p> : null}
      <div className="mt-2 grid gap-2">
        <button
          type="button"
          className={actionClass}
          disabled={busy}
          aria-busy={busyKey === `qa:${karkunId}:visit` || undefined}
          onClick={() =>
            runAction(
              `qa:${karkunId}:visit`,
              () => toggleVisitForKarkun(karkunId, ruknId, user?.uid),
              '✅ Visit recorded successfully',
            )
          }
          aria-pressed={row.visitDone}
        >
          <span>{row.visitDone ? '☑' : '☐'} Visit</span>
          <span className="text-xs text-secondary">
            {busyKey === `qa:${karkunId}:visit` ? 'Saving…' : row.visitDone ? 'Done' : 'Pending'}
          </span>
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={busy}
          onClick={() =>
            runAction(`qa:${karkunId}:jih`, () => {
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
            {busyKey === `qa:${karkunId}:jih` ? 'Saving…' : `${jih.emoji} ${jih.label}`}
          </span>
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={busy}
          onClick={() =>
            runAction(`qa:${karkunId}:ijtema`, () => {
              const result = cycleIjtemaForKarkun(karkunId, ruknId, user?.uid)
              return result.success
                ? { success: true as const }
                : { success: false as const, error: result.error }
            })
          }
        >
          <span>{row.ijtema === 'Pending' ? '☐' : '☑'} Weekly Ijtema</span>
          <span className="text-xs text-secondary">
            {busyKey === `qa:${karkunId}:ijtema`
              ? 'Saving…'
              : `${ijtema.emoji} ${ijtema.label}`}
          </span>
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={busy}
          onClick={() =>
            runAction(`qa:${karkunId}:baitul`, () => {
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
            {busyKey === `qa:${karkunId}:baitul`
              ? 'Saving…'
              : `${baitul.emoji} ${baitul.label}`}
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
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
          placeholder="Optional notes…"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        className="mt-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-heading disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          void run(
            async () => {
              setError('')
              setSavedNote(false)
              const result = saveMatrixRemarks(karkunId, ruknId, remarks, user?.uid)
              if (!result.success) {
                setError(result.error)
                return
              }
              setTick((v) => v + 1)
              setSavedNote(true)
              await confirmExecutionSaveFeedback('✅ Remarks saved successfully')
            },
            { key: `qa:${karkunId}:remarks`, waitForPendingWrites: true, minMs: 400 },
          )
        }}
      >
        {busyKey === `qa:${karkunId}:remarks`
          ? 'Saving…'
          : savedNote
            ? 'Remarks saved'
            : 'Save Remarks'}
      </button>
    </section>
  )
}
