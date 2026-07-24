/**
 * KC-0082/0083 / KC-0098 — Campaign Execution Matrix with single-action protection.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { ruknVisitPath } from '@/constants/routes'
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
  type CampaignMatrixRow,
  type MatrixStatusTone,
} from '@/lib/campaignExecutionMatrix'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import {
  EXECUTION_PERSIST_FAILED_EVENT,
  confirmExecutionSaveFeedback,
  type ExecutionPersistFailedDetail,
} from '@/lib/executionPersistEvents'

type CampaignExecutionMatrixProps = {
  ruknId: string
}

const toneClass: Record<MatrixStatusTone, string> = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  progress: 'border-amber-200 bg-amber-50 text-amber-900',
  idle: 'border-border bg-surface-muted text-secondary',
}

function StatusChip({
  emoji,
  label,
  tone,
  pressed,
  disabled,
  busy,
  onClick,
}: {
  emoji: string
  label: string
  tone: MatrixStatusTone
  pressed?: boolean
  disabled?: boolean
  busy?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={`inline-flex min-h-11 max-w-[7.5rem] items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${toneClass[tone]}`}
      onClick={onClick}
      aria-pressed={pressed}
      aria-busy={busy || undefined}
      title={busy ? 'Saving…' : label}
    >
      <span aria-hidden="true">{busy ? '…' : emoji}</span>
      <span className="truncate">{busy ? 'Saving…' : label}</span>
    </button>
  )
}

export function CampaignExecutionMatrix({ ruknId }: CampaignExecutionMatrixProps) {
  const { user } = useAuth()
  const peopleVersion = usePeopleStore()
  const { busy, busyKey, run } = useBusyAction()
  const [tick, setTick] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [remarksDraft, setRemarksDraft] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const a = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const i = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    const b = subscribeToBaitulMaalStore(() => setTick((v) => v + 1))
    const onPersistFailed = (event: Event) => {
      const detail = (event as CustomEvent<ExecutionPersistFailedDetail>).detail
      if (!detail) return
      // detail.message is already operator-safe via toOperatorPersistError.
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

  const rows = buildCampaignMatrixRows(ruknId)

  if (rows.length === 0) {
    return null
  }

  const refresh = () => setTick((v) => v + 1)

  const runCell = (
    key: string,
    fn: () => { success: true } | { success: false; error: string },
    successMessage?: string,
  ) => {
    void run(
      async () => {
        setError('')
        const result = fn()
        if (!result.success) {
          setError(result.error)
          return result
        }
        refresh()
        if (successMessage) {
          await confirmExecutionSaveFeedback(successMessage)
        }
        return result
      },
      { key, waitForPendingWrites: Boolean(successMessage), minMs: 400 },
    )
  }

  const openRemarks = (row: CampaignMatrixRow) => {
    setExpandedId((id) => (id === row.karkunId ? null : row.karkunId))
    setRemarksDraft(row.remarks)
  }

  return (
    <section className="space-y-2" aria-label="Campaign execution matrix">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-heading">Execution Matrix</h2>
        <p className="text-xs text-secondary">
          {busy ? 'Saving…' : 'Tap a cell to update'}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-(--radius-card) border border-border bg-surface shadow-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs uppercase tracking-wide text-secondary">
              <th className="sticky left-0 z-10 bg-surface-muted px-3 py-2.5 font-semibold">
                Karkun
              </th>
              <th className="px-2 py-2.5 text-center font-semibold">Visit</th>
              <th className="px-2 py-2.5 text-center font-semibold">JIH App</th>
              <th className="px-2 py-2.5 text-center font-semibold">Ijtema</th>
              <th className="px-2 py-2.5 text-center font-semibold">Baitul Maal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const jih = jihStatusChip(row.jih)
              const ijtema = ijtemaStatusChip(row.ijtema)
              const baitul = baitulMaalStatusChip(row.baitulMaal)
              const rowBusy = busy
              return (
                <tr key={row.karkunId} className="border-b border-border last:border-b-0">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2 align-middle">
                    <button type="button" className="text-left" onClick={() => openRemarks(row)}>
                      <span className="block font-semibold text-primary">{row.karkunName}</span>
                      {row.area ? (
                        <span className="text-xs text-secondary">{row.area}</span>
                      ) : null}
                    </button>
                    <Link
                      to={ruknVisitPath(row.karkunId)}
                      className="mt-0.5 block text-[10px] text-secondary hover:underline"
                    >
                      Details
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <StatusChip
                      emoji={row.visitDone ? '🟢' : '⚪'}
                      label={row.visitDone ? 'Done' : 'Pending'}
                      tone={row.visitDone ? 'done' : 'idle'}
                      pressed={row.visitDone}
                      busy={busyKey === `matrix:${row.karkunId}:visit`}
                      disabled={rowBusy}
                      onClick={() =>
                        runCell(
                          `matrix:${row.karkunId}:visit`,
                          () => toggleVisitForKarkun(row.karkunId, ruknId, user?.uid),
                          '✅ Visit recorded successfully',
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <StatusChip
                      emoji={jih.emoji}
                      label={jih.label}
                      tone={jih.tone}
                      busy={busyKey === `matrix:${row.karkunId}:jih`}
                      disabled={rowBusy}
                      onClick={() =>
                        runCell(`matrix:${row.karkunId}:jih`, () => {
                          const result = cycleJihAppForKarkun(row.karkunId, ruknId)
                          return result.success
                            ? { success: true as const }
                            : { success: false as const, error: result.error }
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <StatusChip
                      emoji={ijtema.emoji}
                      label={ijtema.label}
                      tone={ijtema.tone}
                      busy={busyKey === `matrix:${row.karkunId}:ijtema`}
                      disabled={rowBusy}
                      onClick={() =>
                        runCell(`matrix:${row.karkunId}:ijtema`, () => {
                          const result = cycleIjtemaForKarkun(
                            row.karkunId,
                            ruknId,
                            user?.uid,
                          )
                          return result.success
                            ? { success: true as const }
                            : { success: false as const, error: result.error }
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <StatusChip
                      emoji={baitul.emoji}
                      label={baitul.label}
                      tone={baitul.tone}
                      busy={busyKey === `matrix:${row.karkunId}:baitul`}
                      disabled={rowBusy}
                      onClick={() =>
                        runCell(`matrix:${row.karkunId}:baitul`, () => {
                          const result = cycleBaitulMaalCampaignForKarkun(
                            row.karkunId,
                            user?.displayName ?? user?.uid ?? 'Rukn',
                          )
                          return result.success
                            ? { success: true as const }
                            : { success: false as const, error: result.error }
                        })
                      }
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {expandedId ? (
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-sm font-medium text-text-heading">
            {rows.find((r) => r.karkunId === expandedId)?.karkunName} — Remarks (Optional)
          </p>
          <textarea
            value={remarksDraft}
            onChange={(e) => setRemarksDraft(e.target.value)}
            rows={2}
            dir="auto"
            disabled={busy}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            placeholder="Optional notes…"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void run(
                  async () => {
                    setError('')
                    const result = saveMatrixRemarks(
                      expandedId,
                      ruknId,
                      remarksDraft,
                      user?.uid,
                    )
                    if (!result.success) {
                      setError(result.error)
                      return
                    }
                    refresh()
                    setExpandedId(null)
                    await confirmExecutionSaveFeedback('✅ Remarks saved successfully')
                  },
                  {
                    key: `matrix:${expandedId}:remarks`,
                    waitForPendingWrites: true,
                    minMs: 400,
                  },
                )
              }}
            >
              {busyKey === `matrix:${expandedId}:remarks` ? 'Saving…' : 'Save Remarks'}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary disabled:opacity-60"
              onClick={() => setExpandedId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
