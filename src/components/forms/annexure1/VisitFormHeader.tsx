import { ACTIVE_CAMPAIGN_NAME } from '@/constants/app'
import { VISIT_STATUS_LABELS } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type VisitFormHeaderProps = {
  karkun: KarkunRegistryRecord
}

export function VisitFormHeader({ karkun }: VisitFormHeaderProps) {
  return (
    <header className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-primary">Annexure-1 · Worker Information & Meeting Form</p>
      <h1 className="mt-2 text-2xl font-semibold text-text-heading">{karkun.name}</h1>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-secondary">Assigned Area</dt>
          <dd className="font-medium text-text-heading">{karkun.area}</dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Assigned Rukn</dt>
          <dd className="font-medium text-text-heading">{karkun.assignedRukn}</dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Campaign Name</dt>
          <dd className="font-medium text-text-heading">{ACTIVE_CAMPAIGN_NAME}</dd>
        </div>
        <div>
          <dt className="text-sm text-secondary">Visit Status</dt>
          <dd className="font-medium text-text-heading">
            {VISIT_STATUS_LABELS[karkun.visitStatus]}
          </dd>
        </div>
      </dl>
    </header>
  )
}
