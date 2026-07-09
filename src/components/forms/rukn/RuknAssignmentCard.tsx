import { Link } from 'react-router-dom'
import type { Rukn } from '@/data/ruknMaster'
import type { RuknAssignmentStats } from '@/lib/ruknAssignments'
import { adminRuknDetailPath } from '@/constants/routes'
import { Icon } from '@/components/ui/Icon'

type RuknAssignmentCardProps = {
  rukn: Rukn
  stats: RuknAssignmentStats
}

export function RuknAssignmentCard({ rukn, stats }: RuknAssignmentCardProps) {
  const mobileLabel = rukn.mobile.trim() ? rukn.mobile : 'Mobile Not Added'

  return (
    <Link
      to={adminRuknDetailPath(rukn.id)}
      className="block rounded-(--radius-card) border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <h2 className="text-lg font-semibold text-text-heading">{rukn.name}</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <dt className="text-secondary">
            <Icon name="smartphone" size="sm" />
          </dt>
          <dd className={rukn.mobile.trim() ? 'text-text-heading' : 'text-secondary'}>
            {mobileLabel}
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-3">
          <div>
            <dt className="text-secondary">Connected</dt>
            <dd className="text-lg font-semibold text-text-heading">{stats.assignedCount}</dd>
          </div>
          <div>
            <dt className="text-secondary">Completed</dt>
            <dd className="text-lg font-semibold text-text-heading">{stats.completedCount}</dd>
          </div>
          <div>
            <dt className="text-secondary">Available Capacity</dt>
            <dd className="text-lg font-semibold text-primary">{stats.availableCapacity}</dd>
          </div>
        </div>
      </dl>
    </Link>
  )
}
