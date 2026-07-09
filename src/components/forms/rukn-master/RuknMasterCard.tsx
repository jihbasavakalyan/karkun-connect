import type { Rukn } from '@/data/ruknMaster'
import { Icon } from '@/components/ui/Icon'

type RuknMasterCardProps = {
  rukn: Rukn
}

export function RuknMasterCard({ rukn }: RuknMasterCardProps) {
  const mobileLabel = rukn.mobile.trim() ? rukn.mobile : 'Mobile Not Added'
  const statusLabel = rukn.status === 'active' ? 'Active' : 'Inactive'

  return (
    <article className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">{rukn.name}</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2 text-secondary">
          <Icon name="location" size="sm" />
          <dd className="text-text-heading">{rukn.place}</dd>
        </div>
        <div className="flex items-start gap-2 text-secondary">
          <Icon name="smartphone" size="sm" />
          <dd className={rukn.mobile.trim() ? 'text-text-heading' : 'text-secondary'}>
            {mobileLabel}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Status</dt>
          <dd className="font-medium text-primary">Status: {statusLabel}</dd>
        </div>
      </dl>
    </article>
  )
}
