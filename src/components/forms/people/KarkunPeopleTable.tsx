import { Link } from 'react-router-dom'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { adminKarkunProfilePath } from '@/constants/routes'
import type { PersonStatus } from '@/types/karkun-registry.types'
import { formatPersonStatus, type PeopleSortField } from '@/types/people.types'

type KarkunPeopleTableProps = {
  records: KarkunRegistryRecord[]
  selectedIds: string[]
  sortField: PeopleSortField
  sortDirection: 'asc' | 'desc'
  onToggleSort: (field: PeopleSortField) => void
  onToggleSelection: (id: string) => void
  onToggleSelectAll: () => void
  onEdit: (karkun: KarkunRegistryRecord) => void
  onToggleStatus: (karkun: KarkunRegistryRecord) => void
  onUpdateMobile: (karkun: KarkunRegistryRecord) => void
  onUnassign?: (karkun: KarkunRegistryRecord) => void
}

function SortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onToggleSort,
}: {
  label: string
  field: PeopleSortField
  sortField: PeopleSortField
  sortDirection: 'asc' | 'desc'
  onToggleSort: (field: PeopleSortField) => void
}) {
  const active = sortField === field
  return (
    <button
      type="button"
      className="font-semibold text-text-heading hover:text-primary"
      onClick={() => onToggleSort(field)}
    >
      {label} {active ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
    </button>
  )
}

function StatusBadge({ status }: { status: PersonStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {formatPersonStatus(status)}
    </span>
  )
}

export function KarkunPeopleTable({
  records,
  selectedIds,
  sortField,
  sortDirection,
  onToggleSort,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onToggleStatus,
  onUpdateMobile,
  onUnassign,
}: KarkunPeopleTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-secondary">No Karkun match your search or filters.</p>
      </div>
    )
  }

  const allSelected = records.every((r) => selectedIds.includes(r.id))

  return (
    <>
      <div className="hidden overflow-x-auto rounded-(--radius-card) border border-border bg-surface shadow-card md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  aria-label="Select all on page"
                  onChange={onToggleSelectAll}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Name"
                  field="name"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Mobile"
                  field="mobile"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3 font-semibold text-text-heading">Area</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Assigned Rukn</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Assignment</th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Status"
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3 font-semibold text-text-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((karkun) => (
              <tr key={karkun.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(karkun.id)}
                    aria-label={`Select ${karkun.name}`}
                    onChange={() => onToggleSelection(karkun.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-text-heading">
                  <Link
                    to={adminKarkunProfilePath(karkun.id)}
                    className="hover:text-primary hover:underline"
                  >
                    {karkun.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-secondary">{karkun.mobile}</td>
                <td className="px-4 py-3 text-secondary">{karkun.area || '—'}</td>
                <td className="px-4 py-3 text-secondary">
                  {karkun.assignedRukn.trim() ? karkun.assignedRukn : '—'}
                </td>
                <td className="px-4 py-3 text-secondary">{karkun.assignmentStatus}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={karkun.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => onEdit(karkun)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => onUpdateMobile(karkun)}
                    >
                      Mobile
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => onToggleStatus(karkun)}
                    >
                      {karkun.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    {onUnassign && karkun.assignmentStatus === 'Assigned' && (
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={() => onUnassign(karkun)}
                      >
                        Unassign
                      </button>
                    )}
                  </div>
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
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(karkun.id)}
                aria-label={`Select ${karkun.name}`}
                onChange={() => onToggleSelection(karkun.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={adminKarkunProfilePath(karkun.id)}
                    className="font-semibold text-text-heading"
                  >
                    {karkun.name}
                  </Link>
                  <StatusBadge status={karkun.status} />
                </div>
                <p className="mt-1 text-sm text-secondary">{karkun.mobile}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Assigned Rukn</dt>
                    <dd className="font-medium">{karkun.assignedRukn || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Assignment</dt>
                    <dd className="font-medium">{karkun.assignmentStatus}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <button type="button" className="font-medium text-primary" onClick={() => onEdit(karkun)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="font-medium text-primary"
                    onClick={() => onUpdateMobile(karkun)}
                  >
                    Mobile
                  </button>
                  <button
                    type="button"
                    className="font-medium text-primary"
                    onClick={() => onToggleStatus(karkun)}
                  >
                    {karkun.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
