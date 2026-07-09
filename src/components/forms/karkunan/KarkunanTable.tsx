import { Link } from 'react-router-dom'
import { adminKarkunProfilePath } from '@/constants/routes'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { VISIT_STATUS_LABELS } from '@/types/karkun-registry.types'
import { CampaignStatusBadge } from '@/components/forms/karkunan/CampaignStatusBadge'

type KarkunanActionsMenuProps = {
  karkunId: string
}

function ActionItem({
  label,
  onClick,
  to,
}: {
  label: string
  onClick?: () => void
  to?: string
}) {
  const className =
    'block w-full rounded-lg px-3 py-2 text-left text-sm text-text-heading hover:bg-surface-muted'

  if (to) {
    return (
      <Link to={to} className={className}>
        {label}
      </Link>
    )
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  )
}

export function KarkunanActionsMenu({ karkunId }: KarkunanActionsMenuProps) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-heading hover:shadow-card-hover">
        Actions
      </summary>
      <div className="absolute right-0 z-10 mt-2 min-w-[180px] rounded-(--radius-card) border border-border bg-surface p-2 shadow-card">
        <ActionItem label="View Profile" to={adminKarkunProfilePath(karkunId)} />
        <ActionItem label="Edit" />
        <ActionItem label="Assign" />
        <ActionItem label="Visit History" />
        <ActionItem label="Archive" />
      </div>
    </details>
  )
}

type KarkunanTableProps = {
  records: KarkunRegistryRecord[]
}

export function KarkunanTable({ records }: KarkunanTableProps) {
  if (records.length === 0) {
    return (
      <div className="ds-empty" role="status">
        <p className="ds-empty-description">No Karkunan match your search or filters.</p>
      </div>
    )
  }

  return (
    <>
      <div className="ds-table-wrap hidden md:block">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="px-4 py-3 font-semibold text-text-heading">Name</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Mobile</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Area</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Connection Status</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Connected Rukn</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Current Status</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Last Meeting</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((karkun) => (
              <tr key={karkun.id} className="ds-table-row">
                <td className="ds-table-cell font-medium text-text-heading">{karkun.name}</td>
                <td className="ds-table-cell text-secondary">{karkun.mobile}</td>
                <td className="ds-table-cell text-secondary">{karkun.area}</td>
                <td className="ds-table-cell text-secondary">{getConnectionStatusLabel(karkun.assignmentStatus)}</td>
                <td className="ds-table-cell text-secondary">
                  {karkun.assignedRukn.trim() ? karkun.assignedRukn : '—'}
                </td>
                <td className="ds-table-cell text-secondary">
                  {VISIT_STATUS_LABELS[karkun.visitStatus]}
                </td>
                <td className="ds-table-cell text-secondary">{karkun.lastVisit ?? '—'}</td>
                <td className="ds-table-cell">
                  <KarkunanActionsMenu karkunId={karkun.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 md:hidden">
        {records.map((karkun) => (
          <li
            key={karkun.id}
            className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-text-heading">{karkun.name}</p>
                <p className="mt-1 text-sm text-secondary">{karkun.mobile}</p>
              </div>
              <CampaignStatusBadge status={karkun.campaignStatus} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Area</dt>
                <dd className="font-medium text-text-heading">{karkun.area}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Current Status</dt>
                <dd className="font-medium text-text-heading">
                  {VISIT_STATUS_LABELS[karkun.visitStatus]}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Last Meeting</dt>
                <dd className="font-medium text-text-heading">{karkun.lastVisit ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Connection Status</dt>
                <dd className="font-medium text-text-heading">{getConnectionStatusLabel(karkun.assignmentStatus)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Connected Rukn</dt>
                <dd className="font-medium text-text-heading">
                  {karkun.assignedRukn.trim() ? karkun.assignedRukn : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <KarkunanActionsMenu karkunId={karkun.id} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
