/**
 * Phase 7 — Admin organisational picture (TASK-060).
 * Authority: docs/architecture/kc-phase7-admin-oversight-arch009-gate.md
 *
 * Derived visibility layer over Connection, journey, Responsibility, Work, and Occurrences.
 * Does NOT persist a picture, hierarchy, or analytics snapshot.
 */

import {
  ROUTES,
  adminActivitiesPath,
  adminAssignmentsPath,
  adminWeeklyIjtemaPath,
} from '@/constants/routes'
import { adminKarkunRegistryPath } from '@/lib/peopleRegistryNavigation'
import {
  countContinuousJourneyByStage,
  type ContinuousJourneyStageId,
} from '@/lib/journey/continuousKarkunJourney'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { listInForceResponsibilities } from '@/lib/responsibility/tenure'
import { todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'

export type OrganisationalPictureCell = {
  id: string
  label: string
  count: number
  description: string
  route: string
}

export type AdminOrganisationalPicture = {
  journey: OrganisationalPictureCell[]
  operations: OrganisationalPictureCell[]
}

const JOURNEY_ROUTES: Record<ContinuousJourneyStageId, string> = {
  connection: adminKarkunRegistryPath({ assignmentStatus: 'Unassigned' }),
  development: adminAssignmentsPath(),
  participation: adminWeeklyIjtemaPath(),
  responsibility: ROUTES.ADMIN_PLANNING,
  leadership: adminAssignmentsPath(),
}

const JOURNEY_DETAIL: Record<ContinuousJourneyStageId, string> = {
  connection: 'Not yet connected, or still at Connection',
  development: 'Connected — visit, orientation, or JIH still open',
  participation: 'Development present — Ijtema participation still open',
  responsibility: 'Participating — no in-force Responsibility yet',
  leadership: 'In-force Responsibility with connected Karkuns',
}

export function buildAdminOrganisationalPicture(
  asOfDate = todayWorkCalendarDate(),
): AdminOrganisationalPicture {
  const stats = getPeopleStatistics()
  const repos = getRepositories()
  const responsibilities = unwrapRepository(repos.responsibility.loadAll(), [])
  const workRows = unwrapRepository(repos.work.loadAll(), [])
  const occurrences = unwrapRepository(repos.occurrence.loadAll(), [])
  const inForce = listInForceResponsibilities(responsibilities, { asOfDate }).length
  const openWork = workRows.filter((row) => row.status !== 'done').length
  const openOccurrences = occurrences.filter(
    (row) => row.status === 'open' || row.status === 'scheduled',
  ).length

  const journey = countContinuousJourneyByStage(asOfDate).map((row) => ({
    id: `journey:${row.stageId}`,
    label: row.label,
    count: row.count,
    description: JOURNEY_DETAIL[row.stageId],
    route: JOURNEY_ROUTES[row.stageId],
  }))

  const operations: OrganisationalPictureCell[] = [
    {
      id: 'connected',
      label: 'Connected',
      count: stats.assignedKarkuns,
      description: 'Active connections from the existing Connection record',
      route: adminAssignmentsPath(),
    },
    {
      id: 'not-connected',
      label: 'Not connected',
      count: stats.unassignedKarkuns,
      description: 'Campaign-eligible Karkuns without an active connection',
      route: adminKarkunRegistryPath({ assignmentStatus: 'Unassigned' }),
    },
    {
      id: 'in-force-responsibility',
      label: 'In-force responsibilities',
      count: inForce,
      description: 'Phase 4 responsibilities in force today',
      route: ROUTES.ADMIN_PLANNING,
    },
    {
      id: 'open-work',
      label: 'Open work',
      count: openWork,
      description: 'Work not yet done — action stays on Planning',
      route: ROUTES.ADMIN_PLANNING,
    },
    {
      id: 'open-occurrences',
      label: 'Open occurrences',
      count: openOccurrences,
      description: 'Scheduled or open programme occurrences',
      route: adminActivitiesPath(),
    },
  ]

  return { journey, operations }
}
