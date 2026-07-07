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
}

const CARD_CONFIG: {
  key: keyof ExecutionSummaryCounts
  label: string
  section: string
  statusStyle: ExecutionStatusDisplay
}[] = [
  { key: 'pending', label: 'Pending', section: 'pending', statusStyle: 'Pending' },
  { key: 'inProgress', label: 'In Progress', section: 'in-progress', statusStyle: 'In Progress' },
  {
    key: 'followUpRequired',
    label: 'Follow-up Required',
    section: 'follow-up',
    statusStyle: 'Follow-up Required',
  },
  {
    key: 'completedToday',
    label: 'Completed Today',
    section: 'completed-today',
    statusStyle: 'Completed',
  },
]

export function ExecutionSummaryCards({ counts, linkBase }: ExecutionSummaryCardsProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CARD_CONFIG.map(({ key, label, section, statusStyle }) => {
        const count = counts[key]
        const content = (
          <div
            className={[
              'flex flex-col rounded-lg border px-4 py-4 transition-shadow',
              getExecutionStatusStyle(statusStyle),
              linkBase ? 'hover:shadow-card' : '',
            ].join(' ')}
          >
            <span className="text-sm font-medium">{label}</span>
            <span className="mt-2 text-3xl font-semibold">{count}</span>
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
