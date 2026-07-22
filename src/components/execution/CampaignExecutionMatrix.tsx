/**
 * KC-0082 — Compact Campaign Execution Matrix (one-click cells).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { ruknVisitPath } from '@/constants/routes'
import {
  baitulMaalLabel,
  buildCampaignMatrixRows,
  cycleBaitulMaalCampaignForKarkun,
  cycleIjtemaForKarkun,
  cycleJihAppForKarkun,
  jihAppLabel,
  saveMatrixRemarks,
  toggleVisitForKarkun,
  type CampaignMatrixRow,
} from '@/lib/campaignExecutionMatrix'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'

type CampaignExecutionMatrixProps = {
  ruknId: string
}

const cellBtn =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-2 text-sm font-semibold text-text-heading transition-colors active:bg-primary/10'

function VisitCell({
  done,
  onToggle,
}: {
  done: boolean
  onToggle: () => void
}) {
  return (
    <button type="button" className={cellBtn} onClick={onToggle} aria-pressed={done}>
      {done ? '☑' : '☐'}
    </button>
  )
}

export function CampaignExecutionMatrix({ ruknId }: CampaignExecutionMatrixProps) {
  const { user } = useAuth()
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [remarksDraft, setRemarksDraft] = useState('')
  const [error, setError] = useState('')

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

  const rows = buildCampaignMatrixRows(ruknId)

  if (rows.length === 0) {
    return null
  }

  const refresh = () => setTick((v) => v + 1)

  const run = (fn: () => { success: true } | { success: false; error: string }) => {
    setError('')
    const result = fn()
    if (!result.success) {
      setError(result.error)
      return
    }
    refresh()
  }

  const openRemarks = (row: CampaignMatrixRow) => {
    setExpandedId((id) => (id === row.karkunId ? null : row.karkunId))
    setRemarksDraft(row.remarks)
  }

  return (
    <section className="space-y-2" aria-label="Campaign execution matrix">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-heading">Execution Matrix</h2>
        <p className="text-xs text-secondary">Tap a cell to update</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-(--radius-card) border border-border bg-surface shadow-card">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
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
            {rows.map((row) => (
              <tr key={row.karkunId} className="border-b border-border last:border-b-0">
                <td className="sticky left-0 z-10 bg-surface px-3 py-2 align-middle">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => openRemarks(row)}
                  >
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
                  <VisitCell
                    done={row.visitDone}
                    onToggle={() =>
                      run(() =>
                        toggleVisitForKarkun(row.karkunId, ruknId, user?.uid),
                      )
                    }
                  />
                </td>
                <td className="px-2 py-2 text-center align-middle">
                  <button
                    type="button"
                    className={`${cellBtn} min-w-[4.5rem] text-xs`}
                    onClick={() =>
                      run(() => {
                        const result = cycleJihAppForKarkun(row.karkunId, ruknId)
                        return result.success
                          ? { success: true as const }
                          : { success: false as const, error: result.error }
                      })
                    }
                  >
                    {row.jih === 'not_discussed' ? '☐' : `☑ ${jihAppLabel(row.jih)}`}
                  </button>
                </td>
                <td className="px-2 py-2 text-center align-middle">
                  <button
                    type="button"
                    className={`${cellBtn} min-w-[4.25rem] text-xs`}
                    onClick={() =>
                      run(() => {
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
                  >
                    {row.ijtema === 'Pending' ? '☐' : `☑ ${row.ijtema}`}
                  </button>
                </td>
                <td className="px-2 py-2 text-center align-middle">
                  <button
                    type="button"
                    className={`${cellBtn} min-w-[4.5rem] text-xs`}
                    onClick={() =>
                      run(() => {
                        const result = cycleBaitulMaalCampaignForKarkun(
                          row.karkunId,
                          user?.displayName ?? user?.uid ?? 'Rukn',
                        )
                        return result.success
                          ? { success: true as const }
                          : { success: false as const, error: result.error }
                      })
                    }
                  >
                    {row.baitulMaal === 'not_discussed'
                      ? '☐'
                      : `☑ ${baitulMaalLabel(row.baitulMaal)}`}
                  </button>
                </td>
              </tr>
            ))}
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
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Optional notes…"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
              onClick={() => {
                run(() =>
                  saveMatrixRemarks(expandedId, ruknId, remarksDraft, user?.uid),
                )
                setExpandedId(null)
              }}
            >
              Save Remarks
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm"
              onClick={() => setExpandedId(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
