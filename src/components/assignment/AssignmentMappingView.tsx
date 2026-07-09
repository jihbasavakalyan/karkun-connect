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
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { humanizeVisitPending } from '@/lib/relationshipPresentation'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { JourneyStageBadge, RelationshipHealthBadge } from '@/components/guidance'
import { KarkunSearchField } from '@/components/relationship'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Icon } from '@/components/ui/Icon'
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
  needsAttentionCount: number
  healthyCount: number
  activityScore: number
}

type SortOption =
  | 'recently-connected'
  | 'oldest-connection'
  | 'most-active'
  | 'needs-attention'
  | 'healthy'
  | 'count-desc'

type AssignmentMappingViewProps = {
  version?: number
}

export function AssignmentMappingView({ version = 0 }: AssignmentMappingViewProps) {
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('needs-attention')

  const selectClassName =
    'rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-11'

  const rows = useMemo<MappingRow[]>(() => {
    void version
    return ruknMaster.map((rukn) => {
      const summary = getRuknAssignmentSummary(rukn.id)
      const guidanceList = getGuidanceForRuknKarkuns(rukn.id)
      const karkuns = summary.activeAssignments.map((assignment) => ({
        assignment,
        karkun: getKarkunById(assignment.karkunId),
      }))
      const needsAttentionCount = guidanceList.filter(
        (guidance) =>
          guidance.health.level === 'urgent' ||
          guidance.health.level === 'needs-attention' ||
          guidance.health.level === 'dormant',
      ).length
      const healthyCount = guidanceList.filter(
        (guidance) => guidance.health.level === 'healthy',
      ).length

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
        needsAttentionCount,
        healthyCount,
        activityScore: karkuns.filter(({ assignment }) =>
          hasSubmittedAnnexureForAssignment(assignment.assignmentId),
        ).length,
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
          haystacks.push(
            karkun.name,
            karkun.mobile,
            karkun.fatherHusbandName ?? '',
            karkun.area,
            karkun.id,
          )
        }
      }
      return haystacks.some((value) => value.toLowerCase().includes(query))
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'recently-connected':
          return (b.assignmentSince ?? '').localeCompare(a.assignmentSince ?? '')
        case 'oldest-connection':
          return (a.assignmentSince ?? '').localeCompare(b.assignmentSince ?? '')
        case 'most-active':
          return b.activityScore - a.activityScore || b.count - a.count
        case 'needs-attention':
          return b.needsAttentionCount - a.needsAttentionCount || b.count - a.count
        case 'healthy':
          return b.healthyCount - a.healthyCount || a.needsAttentionCount - b.needsAttentionCount
        case 'count-desc':
        default:
          return b.count - a.count
      }
    })
    return sorted
  }, [rows, search, genderFilter, assignmentFilter, areaFilter, sortBy])

  const totalMapped = visibleRows.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="relationship-page space-y-4">
      <div className="home-card">
        <KarkunSearchField
          id="mapping-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by Rukn, Karkun, mobile, father/husband, area, or connection number…"
          resultCount={search.trim() ? visibleRows.length : undefined}
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
            aria-label="Filter by connection status"
            value={assignmentFilter}
            onChange={(event) => setAssignmentFilter(event.target.value)}
            className={selectClassName}
          >
            <option value="">All Rukns</option>
            <option value="Assigned">Connected</option>
            <option value="No Assignment">No Connection</option>
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
            <option value="needs-attention">Needs Attention</option>
            <option value="healthy">Healthy</option>
            <option value="most-active">Most Active</option>
            <option value="recently-connected">Recently Connected</option>
            <option value="oldest-connection">Oldest Connection</option>
            <option value="count-desc">Most Connected Karkuns</option>
          </select>
        </div>

        <p className="mt-3 text-sm text-secondary">
          {visibleRows.length} Rukn{visibleRows.length === 1 ? '' : 's'} · {totalMapped} active
          connection{totalMapped === 1 ? '' : 's'}
        </p>
      </div>

      {visibleRows.length === 0 ? (
        <div className="home-card text-center text-secondary">
          No Rukns match the current search and filters.
        </div>
      ) : (
        <div className="relationship-row-list">
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
    <section className="relationship-connected-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-text-heading">{row.ruknName}</h3>
          <p className="mt-1 text-sm text-secondary">
            {row.gender} · {row.area || 'Area not set'} · {row.mobile || 'Mobile not added'}
          </p>
        </div>
        <span className="relationship-chip shrink-0">
          {row.count} connected
        </span>
      </div>

      <div className="mt-3">
        <Link
          to={adminAssignmentsPath({ ruknId: row.ruknId })}
          className="relationship-quick-action inline-flex min-h-11 items-center justify-center gap-1.5 font-semibold"
        >
          <Icon name="plus" size="sm" />
          Connect Karkun
        </Link>
      </div>

      <div className="relationship-quick-actions mt-3">
        <Link to={adminRuknDetailPath(row.ruknId)} className="relationship-quick-action">
          <Icon name="eye" size="sm" />
          View Details
        </Link>
        {whatsAppLink && (
          <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="relationship-quick-action"
          >
            <Icon name="message" size="sm" />
            WhatsApp
          </a>
        )}
        {telLink && (
          <a href={telLink} className="relationship-quick-action">
            <Icon name="phone" size="sm" />
            Call
          </a>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {row.karkuns.length === 0 ? (
          <p className="text-sm text-secondary">No active Karkuns connected yet.</p>
        ) : (
          <ul className="space-y-2">
            {row.karkuns.map(({ assignment, karkun }) => (
              <KarkunRow key={assignment.assignmentId} assignment={assignment} karkun={karkun} ruknId={row.ruknId} />
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
  ruknId,
}: {
  assignment: AssignmentRecord
  karkun: KarkunRegistryRecord | undefined
  ruknId: string
}) {
  const name = karkun?.name ?? assignment.karkunId
  const guidanceList = getGuidanceForRuknKarkuns(ruknId)
  const guidance = guidanceList.find((item) => item.karkunId === assignment.karkunId)
  const meetingStatus = getExecutionStatusForAssignment(assignment.assignmentId, assignment.karkunId)
  const annexureSubmitted = hasSubmittedAnnexureForAssignment(assignment.assignmentId)
  const familyLabel = karkun ? getFatherHusbandLabel(karkun.gender) : 'Father Name'

  return (
    <li className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-heading">{name}</p>
          <p className="mt-0.5 text-xs text-secondary">
            {familyLabel}: {karkun?.fatherHusbandName?.trim() || '—'}
          </p>
          <p className="mt-0.5 text-xs text-secondary">
            {karkun?.mobile || 'Mobile not added'} · {assignment.assignmentNumber}
          </p>
          {guidance && (
            <div className="mt-2 flex flex-wrap gap-2">
              <JourneyStageBadge stageId={guidance.currentStage} />
              <RelationshipHealthBadge health={guidance.health} />
            </div>
          )}
          <p className="mt-2 text-xs text-secondary">
            {annexureSubmitted
              ? 'Visit recorded'
              : karkun
                ? humanizeVisitPending(karkun.name)
                : 'Visit not recorded yet'}
          </p>
        </div>
        <span className="text-xs text-secondary">{meetingStatus}</span>
      </div>
      <div className="mt-2">
        <Link to={adminAnnexure1Path(assignment.karkunId)}>
          <SecondaryButton type="button" className="min-h-10 px-3 py-1.5 text-xs">
            Open Connection Journey
          </SecondaryButton>
        </Link>
      </div>
    </li>
  )
}
