import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import {
  adminAnnexure1Path,
  adminAssignmentsPath,
  adminRuknDetailPath,
} from '@/constants/routes'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { getExecutionStatusForAssignment } from '@/lib/executionStatus'
import { hasSubmittedAnnexureForAssignment } from '@/stores/annexure1Store'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { AssignmentRecord } from '@/types/assignment'
import { getFatherHusbandLabel } from '@/types/people.types'

type MappedKarkun = {
  assignment: AssignmentRecord
  karkun: KarkunRegistryRecord | undefined
}

type MappingRow = {
  ruknId: string
  ruknName: string
  gender: string
  area: string
  mobile: string
  whatsapp?: string
  count: number
  assignmentSince: string | null
  karkuns: MappedKarkun[]
}

type SortOption = 'count-desc' | 'count-asc' | 'alpha' | 'newest' | 'oldest'

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const selectClassName =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const actionLinkClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-heading transition-colors hover:border-primary hover:text-primary'

type AssignmentMappingViewProps = {
  /** Bump from the assignment engine to force recompute when assignments change. */
  version?: number
}

export function AssignmentMappingView({ version = 0 }: AssignmentMappingViewProps) {
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('count-desc')

  const rows = useMemo<MappingRow[]>(() => {
    void version
    return ruknMaster.map((rukn) => {
      const summary = getRuknAssignmentSummary(rukn.id)
      const karkuns = summary.activeAssignments.map((assignment) => ({
        assignment,
        karkun: getKarkunById(assignment.karkunId),
      }))
      return {
        ruknId: rukn.id,
        ruknName: rukn.name,
        gender: rukn.gender,
        area: rukn.place,
        mobile: rukn.mobile,
        whatsapp: rukn.whatsapp,
        count: summary.assignedKarkunCount,
        assignmentSince: summary.assignmentSince,
        karkuns,
      }
    })
  }, [version])

  const areaOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.area).filter(Boolean))).sort(),
    [rows],
  )

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = rows.filter((row) => {
      if (genderFilter && row.gender !== genderFilter) return false
      if (assignmentFilter === 'Assigned' && row.count === 0) return false
      if (assignmentFilter === 'No Assignment' && row.count > 0) return false
      if (areaFilter && row.area !== areaFilter) return false

      if (!query) return true

      const haystacks: string[] = [row.ruknName, row.mobile, row.area]
      for (const { assignment, karkun } of row.karkuns) {
        haystacks.push(assignment.assignmentNumber)
        if (karkun) {
          haystacks.push(karkun.name, karkun.mobile, karkun.fatherHusbandName ?? '')
        }
      }
      return haystacks.some((value) => value.toLowerCase().includes(query))
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'count-asc':
          return a.count - b.count
        case 'alpha':
          return a.ruknName.localeCompare(b.ruknName)
        case 'newest':
          return (b.assignmentSince ?? '').localeCompare(a.assignmentSince ?? '')
        case 'oldest':
          return (a.assignmentSince ?? '').localeCompare(b.assignmentSince ?? '')
        case 'count-desc':
        default:
          return b.count - a.count
      }
    })
    return sorted
  }, [rows, search, genderFilter, assignmentFilter, areaFilter, sortBy])

  const totalMapped = visibleRows.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="space-y-5">
      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <label htmlFor="mapping-search" className="text-sm font-medium text-text-heading">
          Search mapping
        </label>
        <input
          id="mapping-search"
          type="search"
          value={search}
          placeholder="Search by Rukn, Karkun, Father/Husband name, mobile, place, or assignment number..."
          onChange={(event) => setSearch(event.target.value)}
          className={`mt-2 ${inputClassName}`}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            aria-label="Filter by gender"
            value={genderFilter}
            onChange={(event) => setGenderFilter(event.target.value)}
            className={selectClassName}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select
            aria-label="Filter by assignment status"
            value={assignmentFilter}
            onChange={(event) => setAssignmentFilter(event.target.value)}
            className={selectClassName}
          >
            <option value="">All Rukns</option>
            <option value="Assigned">Assigned</option>
            <option value="No Assignment">No Assignment</option>
          </select>

          <select
            aria-label="Filter by area"
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value)}
            className={selectClassName}
          >
            <option value="">All Areas</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort mapping"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className={`${selectClassName} ml-auto`}
          >
            <option value="count-desc">Highest Karkun Count</option>
            <option value="count-asc">Lowest Karkun Count</option>
            <option value="alpha">Alphabetical</option>
            <option value="newest">Newest Assignment</option>
            <option value="oldest">Oldest Assignment</option>
          </select>
        </div>

        <p className="mt-3 text-sm text-secondary">
          {visibleRows.length} Rukn{visibleRows.length === 1 ? '' : 's'} · {totalMapped} active
          mapping{totalMapped === 1 ? '' : 's'}
        </p>
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center text-secondary shadow-card">
          No Rukns match the current search and filters.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleRows.map((row) => (
            <MappingCard key={row.ruknId} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}

function MappingCard({ row }: { row: MappingRow }) {
  const telLink = buildTelLink(row.mobile)
  const whatsAppLink = buildWhatsAppLink(row.whatsapp || row.mobile)

  return (
    <section className="flex flex-col rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-text-heading">{row.ruknName}</h3>
          <p className="mt-1 text-sm text-secondary">
            {row.gender} · {row.area || 'Area not set'} · {row.mobile || 'Mobile not added'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {row.count} Karkun{row.count === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={adminAssignmentsPath({ ruknId: row.ruknId })} className={actionLinkClass}>
          ➕ Add Karkun
        </Link>
        <Link to={adminRuknDetailPath(row.ruknId)} className={actionLinkClass}>
          👁 View Details
        </Link>
        {whatsAppLink && (
          <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className={actionLinkClass}
          >
            💬 WhatsApp
          </a>
        )}
        {telLink && (
          <a href={telLink} className={actionLinkClass}>
            📞 Call
          </a>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {row.karkuns.length === 0 ? (
          <p className="text-sm text-secondary">No active Karkuns assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {row.karkuns.map(({ assignment, karkun }) => (
              <KarkunRow key={assignment.assignmentId} assignment={assignment} karkun={karkun} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function KarkunRow({
  assignment,
  karkun,
}: {
  assignment: AssignmentRecord
  karkun: KarkunRegistryRecord | undefined
}) {
  const name = karkun?.name ?? assignment.karkunId
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const meetingStatus = getExecutionStatusForAssignment(assignment.assignmentId, assignment.karkunId)
  const annexureSubmitted = hasSubmittedAnnexureForAssignment(assignment.assignmentId)
  const familyLabel = karkun ? getFatherHusbandLabel(karkun.gender) : 'Father Name'

  return (
    <li className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-text-heading">{name}</p>
            <ExecutionStatusBadge status={meetingStatus} />
          </div>
          <p className="mt-0.5 text-xs text-secondary">
            {familyLabel}: {karkun?.fatherHusbandName?.trim() || '—'}
          </p>
          <p className="mt-0.5 text-xs text-secondary">
            {karkun?.mobile || 'Mobile not added'} · Assigned {assignment.effectiveFrom.slice(0, 10)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                annexureSubmitted
                  ? 'bg-green-100 text-green-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Annexure-1: {annexureSubmitted ? 'Submitted' : 'Pending'}
            </span>
            <Link to={adminAnnexure1Path(assignment.karkunId)}>
              <SecondaryButton type="button" className="px-3 py-1 text-xs">
                Open Annexure-1
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </div>
    </li>
  )
}
