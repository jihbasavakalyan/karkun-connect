import { Link } from 'react-router-dom'
import type { Rukn } from '@/data/ruknMaster'
import { adminRuknDetailPath } from '@/constants/routes'
import type { PersonStatus } from '@/types/karkun-registry.types'
import { formatPersonStatus, type PeopleSortField } from '@/types/people.types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  PEOPLE_TABLE_CELL_CLASS,
  PEOPLE_TABLE_CLASS,
  PEOPLE_TABLE_ROW_CLASS,
  PEOPLE_TABLE_WRAPPER_CLASS,
} from './peopleTableDisplay'

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

function PersonStatusBadge({ status }: { status: PersonStatus }) {
  return (
    <StatusBadge variant={status === 'active' ? 'healthy' : 'dormant'}>
      {formatPersonStatus(status)}
    </StatusBadge>
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
      <div className="ds-empty" role="status">
        <p className="ds-empty-description">No Rukn match your search or filters.</p>
      </div>
    )
  }

  const allSelected = records.every((r) => selectedIds.includes(r.id))

  return (
    <>
      <div className={PEOPLE_TABLE_WRAPPER_CLASS}>
        <table className={PEOPLE_TABLE_CLASS}>
          <thead>
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
              <tr key={rukn.id} className={PEOPLE_TABLE_ROW_CLASS}>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(rukn.id)}
                    aria-label={`Select ${rukn.name}`}
                    onChange={() => onToggleSelection(rukn.id)}
                  />
                </td>
                <td className={`${PEOPLE_TABLE_CELL_CLASS} font-medium text-text-heading`}>
                  <Link to={adminRuknDetailPath(rukn.id)} className="hover:text-primary hover:underline">
                    {rukn.name}
                  </Link>
                </td>
                <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>{rukn.gender}</td>
                <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>{rukn.mobile || '—'}</td>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
                  <PersonStatusBadge status={rukn.status} />
                </td>
                <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>{rukn.updatedAt.slice(0, 10)}</td>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
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
                  <PersonStatusBadge status={rukn.status} />
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
