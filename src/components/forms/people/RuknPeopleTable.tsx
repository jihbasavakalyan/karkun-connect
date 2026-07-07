import { Link } from 'react-router-dom'
import type { Rukn } from '@/data/ruknMaster'
import { adminRuknDetailPath } from '@/constants/routes'
import type { PersonStatus } from '@/types/karkun-registry.types'
import { formatPersonStatus, type PeopleSortField } from '@/types/people.types'

type RuknPeopleTableProps = {
  records: Rukn[]
  selectedIds: string[]
  sortField: PeopleSortField
  sortDirection: 'asc' | 'desc'
  onToggleSort: (field: PeopleSortField) => void
  onToggleSelection: (id: string) => void
  onToggleSelectAll: () => void
  onEdit: (rukn: Rukn) => void
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

export function RuknPeopleTable({
  records,
  selectedIds,
  sortField,
  sortDirection,
  onToggleSort,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
}: RuknPeopleTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-secondary">No Rukn match your search or filters.</p>
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
              <th className="px-4 py-3 font-semibold text-text-heading">Gender</th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Mobile"
                  field="mobile"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Status"
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3 font-semibold text-text-heading">Updated</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rukn) => (
              <tr key={rukn.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(rukn.id)}
                    aria-label={`Select ${rukn.name}`}
                    onChange={() => onToggleSelection(rukn.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-text-heading">
                  <Link to={adminRuknDetailPath(rukn.id)} className="hover:text-primary hover:underline">
                    {rukn.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-secondary">{rukn.gender}</td>
                <td className="px-4 py-3 text-secondary">{rukn.mobile || '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={rukn.status} />
                </td>
                <td className="px-4 py-3 text-secondary">{rukn.updatedAt.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => onEdit(rukn)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 md:hidden">
        {records.map((rukn) => (
          <li
            key={rukn.id}
            className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(rukn.id)}
                aria-label={`Select ${rukn.name}`}
                onChange={() => onToggleSelection(rukn.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link to={adminRuknDetailPath(rukn.id)} className="font-semibold text-text-heading">
                    {rukn.name}
                  </Link>
                  <StatusBadge status={rukn.status} />
                </div>
                <p className="mt-1 text-sm text-secondary">
                  {rukn.gender} · {rukn.mobile || 'No mobile'}
                </p>
                <div className="mt-3 text-sm">
                  <button type="button" className="font-medium text-primary" onClick={() => onEdit(rukn)}>
                    Edit
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
