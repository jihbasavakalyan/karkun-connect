import { Link } from 'react-router-dom'
import { adminKarkunProfilePath } from '@/constants/routes'
import { VISIT_STATUS_LABELS } from '@/types/karkun-registry.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type AssignedKarkunListProps = {
  karkunan: KarkunRegistryRecord[]
}

export function AssignedKarkunList({ karkunan }: AssignedKarkunListProps) {
  if (karkunan.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-secondary">No Karkun connected to this Rukn yet.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {karkunan.map((karkun) => {
        const commitmentLabel = karkun.currentCommitment.trim()
          ? karkun.currentCommitment
          : 'No commitment recorded'

        return (
          <li key={karkun.id}>
            <Link
              to={adminKarkunProfilePath(karkun.id)}
              className="block rounded-(--radius-card) border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-text-heading">{karkun.name}</p>
                  <p className="mt-1 text-sm text-secondary">
                    {karkun.area} · {karkun.mobile}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary">Open Karkun →</span>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-secondary">Meeting Status</dt>
                  <dd className="font-medium text-text-heading">
                    {VISIT_STATUS_LABELS[karkun.visitStatus]}
                  </dd>
                </div>
                <div>
                  <dt className="text-secondary">Current Commitment</dt>
                  <dd className="font-medium text-text-heading">{commitmentLabel}</dd>
                </div>
                <div>
                  <dt className="text-secondary">JIH App Registration</dt>
                  <dd className="font-medium text-text-heading">
                    {karkun.jihAppRegistrationStatus}
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
