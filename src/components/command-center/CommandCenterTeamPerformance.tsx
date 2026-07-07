import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ROUTES } from '@/constants/routes'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import {
  getTeamPerformanceRows,
  type TeamPerformanceRow,
} from '@/lib/commandCenterPresentation'

type SortKey = keyof Pick<
  TeamPerformanceRow,
  'ruknName' | 'assignedKarkuns' | 'pendingWork' | 'completionPct' | 'followUpPct' | 'visits'
>

export function CommandCenterTeamPerformance() {
  const rows = getTeamPerformanceRows()
  const [sortKey, setSortKey] = useState<SortKey>('completionPct')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })
  }, [rows, sortAsc, sortKey])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((value) => !value)
      return
    }
    setSortKey(key)
    setSortAsc(false)
  }

  if (sorted.length === 0) {
    return (
      <section className="cc-card-sm flex h-full min-h-[220px] flex-col">
        <EnterpriseSectionHeader title="Team Performance" />
        <p className="mt-2 text-sm text-secondary">No active Rukn assignments yet.</p>
        <Link
          to={ROUTES.ADMIN_ASSIGNMENTS}
          className="mt-auto text-sm font-medium text-primary hover:underline"
        >
          Open Assignments →
        </Link>
      </section>
    )
  }

  return (
    <section className="cc-card-sm flex h-full min-h-[220px] flex-col overflow-hidden">
      <EnterpriseSectionHeader title="Team Performance" />
      <div className="mt-2 max-h-[180px] flex-1 overflow-auto">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-wide text-secondary">
            <tr className="border-b border-border">
              {(
                [
                  ['ruknName', 'Rukn'],
                  ['assignedKarkuns', 'Asgn'],
                  ['pendingWork', 'Pend'],
                  ['completionPct', 'Done'],
                  ['visits', 'Vis'],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="px-2 py-1.5 font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex items-center gap-0.5 hover:text-text-heading"
                  >
                    {label}
                    {sortKey === key && <span aria-hidden="true">{sortAsc ? '↑' : '↓'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr
                key={row.ruknId}
                className="border-b border-border/60 transition-colors hover:bg-surface-muted/50"
              >
                <td className="max-w-[6rem] truncate px-2 py-1.5 font-medium text-text-heading">
                  {index < 3 && <span className="mr-0.5">{['🥇', '🥈', '🥉'][index]}</span>}
                  {row.ruknName}
                </td>
                <td className="px-2 py-1.5">{row.assignedKarkuns}</td>
                <td className="px-2 py-1.5">{row.pendingWork}</td>
                <td className="px-2 py-1.5">
                  <span className="rounded-full bg-primary-muted px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {row.completionPct}%
                  </span>
                </td>
                <td className="px-2 py-1.5">{row.visits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
