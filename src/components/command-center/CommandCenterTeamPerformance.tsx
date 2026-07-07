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
      <section className="enterprise-card p-6">
        <EnterpriseSectionHeader
          title="Team Performance"
          subtitle="Top performing Rukns and pending work"
        />
        <p className="mt-4 text-sm text-secondary">No active Rukn assignments yet.</p>
        <Link
          to={ROUTES.ADMIN_ASSIGNMENTS}
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Open Assignments →
        </Link>
      </section>
    )
  }

  return (
    <section className="enterprise-card overflow-hidden p-6">
      <EnterpriseSectionHeader
        title="Team Performance"
        subtitle="Sortable performance across assigned Rukns"
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wide text-secondary">
            <tr className="border-b border-border">
              {(
                [
                  ['ruknName', 'Rukn'],
                  ['assignedKarkuns', 'Assigned'],
                  ['pendingWork', 'Pending'],
                  ['completionPct', 'Completion'],
                  ['followUpPct', 'Follow-up'],
                  ['visits', 'Visits'],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="px-3 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex items-center gap-1 hover:text-text-heading"
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
                <td className="px-3 py-3">
                  <span className="font-medium text-text-heading">
                    {index < 3 && <span className="mr-1">{['🥇', '🥈', '🥉'][index]}</span>}
                    {row.ruknName}
                  </span>
                </td>
                <td className="px-3 py-3">{row.assignedKarkuns}</td>
                <td className="px-3 py-3">{row.pendingWork}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs font-semibold text-primary">
                    {row.completionPct}%
                  </span>
                </td>
                <td className="px-3 py-3">{row.followUpPct}%</td>
                <td className="px-3 py-3">{row.visits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
