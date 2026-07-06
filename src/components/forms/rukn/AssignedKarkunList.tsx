import { Link } from 'react-router-dom'
import { adminKarkunProfilePath } from '@/constants/routes'
import { VISIT_STATUS_LABELS } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { CampaignStatusBadge } from '@/components/forms/karkunan/CampaignStatusBadge'

type AssignedKarkunListProps = {
  karkunan: KarkunRegistryRecord[]
}

export function AssignedKarkunList({ karkunan }: AssignedKarkunListProps) {
  if (karkunan.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-secondary">No Karkun assigned to this Rukn yet.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {karkunan.map((karkun) => (
        <li key={karkun.id}>
          <Link
            to={adminKarkunProfilePath(karkun.id)}
            className="flex flex-col gap-3 rounded-(--radius-card) border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-text-heading">{karkun.name}</p>
              <p className="mt-1 text-sm text-secondary">
                {karkun.area} · {karkun.mobile}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CampaignStatusBadge status={karkun.campaignStatus} />
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-text-heading">
                {VISIT_STATUS_LABELS[karkun.visitStatus]}
              </span>
              <span className="text-sm font-medium text-primary">Open Karkun →</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
