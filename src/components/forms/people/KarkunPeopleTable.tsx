import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { adminKarkunProfilePath } from '@/constants/routes'
import type { PersonStatus } from '@/types/karkun-registry.types'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { formatPersonStatus, type PeopleSortField } from '@/types/people.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import { RuknAssignmentSelect } from '@/components/forms/people/RuknAssignmentSelect'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  PEOPLE_TABLE_CELL_CLASS,
  PEOPLE_TABLE_CLASS,
  PEOPLE_TABLE_MOBILE_CLASS,
  PEOPLE_TABLE_NAME_CLASS,
  PEOPLE_TABLE_ROW_CLASS,
  PEOPLE_TABLE_WRAPPER_CLASS,
} from '@/components/forms/people/peopleTableDisplay'

type KarkunPeopleTableProps = {
  records: KarkunRegistryRecord[]
  selectedIds: string[]
  sortField: PeopleSortField
  sortDirection: 'asc' | 'desc'
  onToggleSort: (field: PeopleSortField) => void
  onToggleSelection: (id: string) => void
  onToggleSelectAll: () => void
  onEdit: (karkun: KarkunRegistryRecord) => void
  onAssignmentChange: (karkun: KarkunRegistryRecord, ruknId: string) => boolean
  assignmentErrors?: Record<string, string>
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

export function KarkunPeopleTable({
  records,
  selectedIds,
  sortField,
  sortDirection,
  onToggleSort,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onAssignmentChange,
  assignmentErrors = {},
}: KarkunPeopleTableProps) {
  const [pendingRukns, setPendingRukns] = useState<Record<string, string>>({})

  const pendingValueFor = (karkun: KarkunRegistryRecord) =>
    pendingRukns[karkun.id] ?? karkun.assignedRuknId

  const hasPendingChange = (karkun: KarkunRegistryRecord) =>
    pendingValueFor(karkun) !== karkun.assignedRuknId

  const handlePendingChange = (karkun: KarkunRegistryRecord, ruknId: string) => {
    setPendingRukns((current) => ({ ...current, [karkun.id]: ruknId }))
  }

  const clearPending = (karkunId: string) => {
    setPendingRukns((current) => {
      if (!(karkunId in current)) {
        return current
      }
      const next = { ...current }
      delete next[karkunId]
      return next
    })
  }

  const handleSaveAssignment = (karkun: KarkunRegistryRecord) => {
    const saved = onAssignmentChange(karkun, pendingValueFor(karkun))
    if (saved) {
      clearPending(karkun.id)
    }
  }

  if (records.length === 0) {
    return (
      <div className="ds-empty" role="status">
        <p className="ds-empty-description">No Karkun match your search or filters.</p>
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
              <th className="px-4 py-3">
                <SortHeader
                  label="Mobile"
                  field="mobile"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3 font-semibold text-text-heading">Connected Rukn</th>
              <th className="px-4 py-3 font-semibold text-text-heading">Connection</th>
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
              <tr key={karkun.id} className={PEOPLE_TABLE_ROW_CLASS}>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(karkun.id)}
                    aria-label={`Select ${karkun.name}`}
                    onChange={() => onToggleSelection(karkun.id)}
                  />
                </td>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
                  <Link
                    to={adminKarkunProfilePath(karkun.id)}
                    className={`${PEOPLE_TABLE_NAME_CLASS} hover:text-primary hover:underline`}
                  >
                    {formatPersonNameForDisplay(karkun.name)}
                  </Link>
                </td>
                <td className={`${PEOPLE_TABLE_CELL_CLASS} ${PEOPLE_TABLE_MOBILE_CLASS}`}>
                  {karkun.mobile}
                </td>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
                  <div className="flex flex-col gap-1.5">
                    <RuknAssignmentSelect
                      karkunId={karkun.id}
                      value={pendingValueFor(karkun)}
                      compact
                      error={assignmentErrors[karkun.id]}
                      onChange={(ruknId) => handlePendingChange(karkun, ruknId)}
                    />
                    {hasPendingChange(karkun) && (
                      <div className="flex items-center gap-1.5">
                        <PrimaryButton
                          type="button"
                          className="px-2.5 py-1 text-xs"
                          onClick={() => handleSaveAssignment(karkun)}
                        >
                          Save
                        </PrimaryButton>
                        <SecondaryButton
                          type="button"
                          className="px-2.5 py-1 text-xs"
                          onClick={() => clearPending(karkun.id)}
                        >
                          Cancel
                        </SecondaryButton>
                      </div>
                    )}
                  </div>
                </td>
                <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>{getConnectionStatusLabel(karkun.assignmentStatus)}</td>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
                  <PersonStatusBadge status={karkun.status} />
                </td>
                <td className={PEOPLE_TABLE_CELL_CLASS}>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => onEdit(karkun)}
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
                    className={`${PEOPLE_TABLE_NAME_CLASS} hover:text-primary hover:underline`}
                  >
                    {formatPersonNameForDisplay(karkun.name)}
                  </Link>
                  <PersonStatusBadge status={karkun.status} />
                </div>
                <p className={`mt-1 ${PEOPLE_TABLE_MOBILE_CLASS}`}>{karkun.mobile}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex flex-col gap-1">
                    <dt className="text-secondary">Connected Rukn</dt>
                    <dd className="flex flex-col gap-2">
                      <RuknAssignmentSelect
                        karkunId={karkun.id}
                        value={pendingValueFor(karkun)}
                        error={assignmentErrors[karkun.id]}
                        onChange={(ruknId) => handlePendingChange(karkun, ruknId)}
                      />
                      {hasPendingChange(karkun) && (
                        <div className="flex items-center gap-2">
                          <PrimaryButton
                            type="button"
                            className="px-3 py-1.5 text-sm"
                            onClick={() => handleSaveAssignment(karkun)}
                          >
                            Save
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            className="px-3 py-1.5 text-sm"
                            onClick={() => clearPending(karkun.id)}
                          >
                            Cancel
                          </SecondaryButton>
                        </div>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Connection</dt>
                    <dd className="font-medium">{getConnectionStatusLabel(karkun.assignmentStatus)}</dd>
                  </div>
                </dl>
                <div className="mt-3 text-sm">
                  <button type="button" className="font-medium text-primary" onClick={() => onEdit(karkun)}>
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
