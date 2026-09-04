import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { adminKarkunProfilePath } from '@/constants/routes'
import type { PersonStatus } from '@/types/karkun-registry.types'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { formatPersonStatus, type PeopleSortField } from '@/types/people.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import { getMuttafiqDisplayNumber } from '@/lib/peopleClassification'
import { getRuknById } from '@/data/ruknMaster'
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
import { EmptyState } from '@/components/ui/EmptyState'
import { UI_LABELS } from '@/lib/uiTerminology'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { getPendingKarkunRequests, subscribeToKarkunRequestStore } from '@/services/karkunRequestService'
import { getActiveMuttafiqRelationshipsByPersonId } from '@/stores/muttafiqRelationshipStore'
import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'

type KarkunPeopleTableProps = {
  records: KarkunRegistryRecord[]
  selectedIds: string[]
  sortField: PeopleSortField
  sortDirection: 'asc' | 'desc'
  onToggleSort: (field: PeopleSortField) => void
  onToggleSelection: (id: string) => void
  onToggleSelectAll: () => void
  onEdit: (karkun: KarkunRegistryRecord) => void
  onAssignmentChange?: (karkun: KarkunRegistryRecord, ruknId: string) => boolean
  assignmentErrors?: Record<string, string>
  /** KC-0101 — campaign assignment controls (Karkun registry only). */
  showAssignmentControls?: boolean
  /**
   * Increment A follow-up — read-only Connected Rukn from muttafiqRelationships
   * (never campaign connections / assignedRuknId).
   */
  showMuttafiqRelationshipColumns?: boolean
  /** Increment A — open Connect Rukn request modal for this Muttafiq. */
  onConnectRukn?: (person: KarkunRegistryRecord) => void
  emptyTitle?: string
  emptyLabel?: string
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

function formatLinkedRuknNames(links: MuttafiqRuknRelationship[]): string {
  return links
    .map((link) =>
      formatPersonNameForDisplay(getRuknById(link.ruknId)?.name ?? link.ruknName),
    )
    .join(', ')
}

function resolveMuttafiqRelationshipDisplay(
  activeLinks: MuttafiqRuknRelationship[],
  hasPendingLink: boolean,
): { linkedRuknLabel: string; relationshipLabel: string } {
  if (activeLinks.length > 0) {
    return {
      linkedRuknLabel: formatLinkedRuknNames(activeLinks),
      relationshipLabel: UI_LABELS.connected,
    }
  }
  if (hasPendingLink) {
    return {
      linkedRuknLabel: '—',
      relationshipLabel: UI_LABELS.pending,
    }
  }
  return {
    linkedRuknLabel: '—',
    relationshipLabel: UI_LABELS.notConnected,
  }
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
  showAssignmentControls = true,
  showMuttafiqRelationshipColumns = false,
  onConnectRukn,
  emptyTitle,
  emptyLabel = 'No Karkun match your search or filters.',
}: KarkunPeopleTableProps) {
  const [pendingRukns, setPendingRukns] = useState<Record<string, string>>({})
  const [requestTick, setRequestTick] = useState(0)
  const relationshipVersion = useMuttafiqRelationshipStore()
  const activeLinksByPerson = useMemo(() => {
    void relationshipVersion
    if (!showMuttafiqRelationshipColumns) {
      return new Map<string, MuttafiqRuknRelationship[]>()
    }
    return getActiveMuttafiqRelationshipsByPersonId()
  }, [relationshipVersion, showMuttafiqRelationshipColumns])

  useEffect(() => {
    if (!showMuttafiqRelationshipColumns) return
    return subscribeToKarkunRequestStore(() => setRequestTick((value) => value + 1))
  }, [showMuttafiqRelationshipColumns])

  const pendingMuttafiqLinkPersonIds = useMemo(() => {
    void requestTick
    if (!showMuttafiqRelationshipColumns) {
      return new Set<string>()
    }
    const ids = new Set<string>()
    for (const request of getPendingKarkunRequests()) {
      if (request.kind === 'muttafiq_rukn_link' && request.sourcePersonId) {
        ids.add(request.sourcePersonId)
      }
    }
    return ids
  }, [requestTick, showMuttafiqRelationshipColumns])

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
    if (!onAssignmentChange) return
    const saved = onAssignmentChange(karkun, pendingValueFor(karkun))
    if (saved) {
      clearPending(karkun.id)
    }
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon="search"
        title={emptyTitle ?? UI_LABELS.noSearchResults}
        description={emptyLabel ?? UI_LABELS.noSearchResultsHint}
      />
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
              {showAssignmentControls ? (
                <>
                  <th className="px-4 py-3 font-semibold text-text-heading">
                    {UI_LABELS.connectedRukn}
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-heading">
                    {UI_LABELS.connection}
                  </th>
                </>
              ) : null}
              {showMuttafiqRelationshipColumns ? (
                <>
                  <th className="px-4 py-3 font-semibold text-text-heading">
                    {UI_LABELS.connectedRukn}
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-heading">Relationship</th>
                </>
              ) : null}
              <th className="px-4 py-3">
                <SortHeader
                  label={UI_LABELS.personStatus}
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
            {records.map((karkun) => {
              const muttafiqLinks = activeLinksByPerson.get(karkun.id) ?? []
              const { linkedRuknLabel, relationshipLabel } = resolveMuttafiqRelationshipDisplay(
                muttafiqLinks,
                pendingMuttafiqLinkPersonIds.has(karkun.id),
              )

              return (
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
                    {getMuttafiqDisplayNumber(karkun) ? (
                      <p className="mt-0.5 text-xs text-secondary">
                        {getMuttafiqDisplayNumber(karkun)}
                      </p>
                    ) : null}
                  </td>
                  <td className={`${PEOPLE_TABLE_CELL_CLASS} ${PEOPLE_TABLE_MOBILE_CLASS}`}>
                    {karkun.mobile}
                  </td>
                  {showAssignmentControls ? (
                    <>
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
                      <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>
                        {getConnectionStatusLabel(karkun.assignmentStatus)}
                      </td>
                    </>
                  ) : null}
                  {showMuttafiqRelationshipColumns ? (
                    <>
                      <td className={PEOPLE_TABLE_CELL_CLASS}>{linkedRuknLabel}</td>
                      <td className={`${PEOPLE_TABLE_CELL_CLASS} text-secondary`}>
                        {relationshipLabel}
                      </td>
                    </>
                  ) : null}
                  <td className={PEOPLE_TABLE_CELL_CLASS}>
                    <div className="flex flex-col items-start gap-1">
                      <PersonStatusBadge status={karkun.status} />
                      {karkun.needsReview && !karkun.isArchived ? (
                        <StatusBadge variant="warning">🟡 Needs Review</StatusBadge>
                      ) : null}
                      {karkun.isArchived ? (
                        <StatusBadge variant="dormant">
                          {karkun.archiveKind === 'admin_delete' ? 'Removed' : 'Merged'}
                        </StatusBadge>
                      ) : null}
                    </div>
                  </td>
                  <td className={PEOPLE_TABLE_CELL_CLASS}>
                    <div className="flex flex-col items-start gap-1">
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={() => onEdit(karkun)}
                      >
                        Edit
                      </button>
                      {onConnectRukn ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => onConnectRukn(karkun)}
                        >
                          {UI_LABELS.connectRukn}
                        </button>
                      ) : null}
                      {showMuttafiqRelationshipColumns &&
                      pendingMuttafiqLinkPersonIds.has(karkun.id) &&
                      muttafiqLinks.length === 0 ? (
                        <span className="text-xs text-secondary">{UI_LABELS.pending}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 md:hidden">
        {records.map((karkun) => {
          const muttafiqLinks = activeLinksByPerson.get(karkun.id) ?? []
          const { linkedRuknLabel, relationshipLabel } = resolveMuttafiqRelationshipDisplay(
            muttafiqLinks,
            pendingMuttafiqLinkPersonIds.has(karkun.id),
          )

          return (
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
                    <div className="min-w-0">
                      <Link
                        to={adminKarkunProfilePath(karkun.id)}
                        className={`${PEOPLE_TABLE_NAME_CLASS} hover:text-primary hover:underline`}
                      >
                        {formatPersonNameForDisplay(karkun.name)}
                      </Link>
                      {getMuttafiqDisplayNumber(karkun) ? (
                        <p className="mt-0.5 text-xs text-secondary">
                          {getMuttafiqDisplayNumber(karkun)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <PersonStatusBadge status={karkun.status} />
                      {karkun.needsReview && !karkun.isArchived ? (
                        <StatusBadge variant="warning">🟡 Needs Review</StatusBadge>
                      ) : null}
                    </div>
                  </div>
                  <p className={`mt-1 ${PEOPLE_TABLE_MOBILE_CLASS}`}>{karkun.mobile}</p>
                  <dl className="mt-3 space-y-1 text-sm">
                    {showAssignmentControls ? (
                      <>
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
                          <dd className="font-medium">
                            {getConnectionStatusLabel(karkun.assignmentStatus)}
                          </dd>
                        </div>
                      </>
                    ) : null}
                    {showMuttafiqRelationshipColumns ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <dt className="text-secondary">{UI_LABELS.connectedRukn}</dt>
                          <dd className="font-medium text-right">{linkedRuknLabel}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-secondary">Relationship</dt>
                          <dd className="font-medium">{relationshipLabel}</dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                  <div className="mt-3 flex flex-col items-start gap-1 text-sm">
                    <button
                      type="button"
                      className="font-medium text-primary"
                      onClick={() => onEdit(karkun)}
                    >
                      Edit
                    </button>
                    {onConnectRukn ? (
                      <button
                        type="button"
                        className="font-medium text-primary"
                        onClick={() => onConnectRukn(karkun)}
                      >
                        {UI_LABELS.connectRukn}
                      </button>
                    ) : null}
                    {showMuttafiqRelationshipColumns &&
                    pendingMuttafiqLinkPersonIds.has(karkun.id) &&
                    muttafiqLinks.length === 0 ? (
                      <span className="text-xs text-secondary">{UI_LABELS.pending}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
