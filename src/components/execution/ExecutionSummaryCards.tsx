import { Link } from 'react-router-dom'
import type { ExecutionStatusDisplay } from '@/lib/executionStatus'
import { getExecutionStatusStyle } from '@/lib/executionStatus'

export type ExecutionSummaryCounts = {
  pending: number
  inProgress: number
  followUpRequired: number
  completedToday: number
}

type ExecutionSummaryCardsProps = {
  counts: ExecutionSummaryCounts
  linkBase?: string
  /** Rukn personal workload labels vs Admin campaign labels. */
  variant?: 'campaign' | 'rukn'
  /** Compact horizontal strip for above-the-fold Record pages. */
  dense?: boolean
}

const CAMPAIGN_LABELS: Record<keyof ExecutionSummaryCounts, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  followUpRequired: 'Follow-up Required',
  completedToday: 'Completed Today',
}

const RUKN_LABELS: Record<keyof ExecutionSummaryCounts, string> = {
  pending: 'Pending Visits',
  inProgress: 'Visits In Progress',
  followUpRequired: 'Follow-ups Due',
  completedToday: 'Visits Completed Today',
}

const RUKN_DENSE_LABELS: Record<keyof ExecutionSummaryCounts, string> = {
  pending: 'Pending',
  inProgress: 'In progress',
  followUpRequired: 'Follow-ups',
  completedToday: 'Done today',
}

const CARD_CONFIG: {
  key: keyof ExecutionSummaryCounts
  section: string
  statusStyle: ExecutionStatusDisplay
}[] = [
  { key: 'pending', section: 'pending', statusStyle: 'Pending' },
  { key: 'inProgress', section: 'in-progress', statusStyle: 'In Progress' },
  { key: 'followUpRequired', section: 'follow-up', statusStyle: 'Follow-up Required' },
  { key: 'completedToday', section: 'completed-today', statusStyle: 'Completed' },
]

export function ExecutionSummaryCards({
  counts,
  linkBase,
  variant = 'campaign',
  dense = false,
}: ExecutionSummaryCardsProps) {
  const labels =
    dense && variant === 'rukn'
      ? RUKN_DENSE_LABELS
      : variant === 'rukn'
        ? RUKN_LABELS
        : CAMPAIGN_LABELS

  return (
    <ul
      className={
        dense
          ? 'grid grid-cols-2 gap-2 sm:grid-cols-4'
          : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
      }
    >
      {CARD_CONFIG.map(({ key, section, statusStyle }) => {
        const count = counts[key]
        const content = (
          <div
            className={[
              'flex flex-col rounded-lg border transition-shadow',
              dense ? 'px-2.5 py-2' : 'px-4 py-4',
              getExecutionStatusStyle(statusStyle),
              linkBase ? 'hover:shadow-card' : '',
            ].join(' ')}
          >
            <span className={dense ? 'text-[11px] font-medium leading-tight' : 'text-sm font-medium'}>
              {labels[key]}
            </span>
            <span className={dense ? 'mt-0.5 text-xl font-semibold' : 'mt-2 text-3xl font-semibold'}>
              {count}
            </span>
          </div>
        )

        return (
          <li key={key}>
            {linkBase ? (
              <Link to={`${linkBase}?section=${section}`} className="block">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ul>
  )
}
