import { Link } from 'react-router-dom'
import type { KarkunNextAction } from '@/types/guidance'

type NextActionCardProps = {
  action: KarkunNextAction
  karkunName?: string
  compact?: boolean
}

export function NextActionCard({ action, karkunName, compact = false }: NextActionCardProps) {
  return (
    <div
      className={`rounded-lg border border-primary/20 bg-primary-muted/30 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {karkunName && (
        <p className="text-xs font-medium uppercase tracking-wide text-secondary">{karkunName}</p>
      )}
      <p className={`font-semibold text-text-heading ${karkunName ? 'mt-1' : ''}`}>
        {action.label}
      </p>
      <p className="mt-1 text-sm text-secondary">{action.description}</p>
      {action.dueHint && <p className="mt-1 text-xs text-primary">{action.dueHint}</p>}
      <Link
        to={action.route}
        className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
      >
        Open →
      </Link>
    </div>
  )
}
