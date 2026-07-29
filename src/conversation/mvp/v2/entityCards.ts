/**
 * Module 12 — Entity Cards
 * Rich cards for Karkun / Muttafiq / Rukn / Campaign / Assignment / Attendance / Weekly Ijtema.
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import { searchPeopleReadOnly } from '../adapters/searchAdapter'
import type { RafeeqRole } from '../types'
import type { UniversalSearchHit } from '../universalSearchTypes'
import { reason } from './explainability'
import type { EntityCard } from './types'

/** Adapt people-only search rows into UniversalSearchHit without re-querying. */
function peopleRowsToHits(
  rows: ReturnType<typeof searchPeopleReadOnly>,
): UniversalSearchHit[] {
  return rows.map((row) => ({
    id: row.personId,
    personId: row.personId,
    entityType: 'karkun',
    name: row.name,
    description: row.mobile || 'karkun',
    route: row.profilePath,
    score: 0,
    tier: 'matched',
    mobile: row.mobile,
  }))
}

function peopleCard(hit: UniversalSearchHit): EntityCard {
  return {
    id: `card-${hit.id}`,
    entityType: hit.entityType,
    title: hit.name,
    summary: hit.description || hit.entityType,
    status: hit.tier || 'matched',
    why: [
      reason('search', 'Matched via universal search', 'universalSearch'),
      ...(hit.score > 0
        ? [reason('rank', `Search rank score ${hit.score}`, 'rankMatch')]
        : []),
    ],
    actions: [
      {
        id: `open-${hit.id}`,
        label: 'Open Profile',
        route: hit.route,
        entityType: hit.entityType,
      },
      {
        id: `call-${hit.id}`,
        label: 'Call',
        route: `?rafeeqSafe=call&name=${encodeURIComponent(hit.name)}`,
      },
      {
        id: `wa-${hit.id}`,
        label: 'WhatsApp',
        route: `?rafeeqSafe=whatsapp&name=${encodeURIComponent(hit.name)}`,
      },
    ],
  }
}

export function buildEntityCardsFromHits(
  hits: readonly UniversalSearchHit[],
): readonly EntityCard[] {
  return Object.freeze(hits.slice(0, 6).map(peopleCard))
}

export function buildOperationalEntityCards(
  role: RafeeqRole,
  ruknId: string | null,
  personQuery?: string | null,
): readonly EntityCard[] {
  const cards: EntityCard[] = []
  const bundle = getTurnMetricsBundle(ruknId)

  if (personQuery?.trim()) {
    cards.push(
      ...buildEntityCardsFromHits(
        peopleRowsToHits(searchPeopleReadOnly(personQuery, 3)),
      ),
    )
  }

  cards.push({
    id: 'card-campaign',
    entityType: 'campaign',
    title: 'Campaign',
    summary: `${bundle.campaign.connected}/${bundle.campaign.total} connected`,
    status: `${bundle.campaign.progressPct}%`,
    why: [
      reason(
        'campaign',
        `progressPct=${bundle.campaign.progressPct}`,
        'metricsService.getCampaignConnectionMetrics',
      ),
    ],
    actions: [
      {
        id: 'card-camp-open',
        label: 'Open Campaign',
        route: role === 'administrator' ? ROUTES.ADMIN : ROUTES.RUKN,
        entityType: 'campaign',
      },
    ],
  })

  cards.push({
    id: 'card-assignment',
    entityType: 'assignment',
    title: 'Assignments',
    summary: `${bundle.assignments.activeAssignments} active`,
    status: `${bundle.visits.pending} visits pending`,
    why: [
      reason(
        'assign',
        'Assignment dashboard + visit pending',
        'assignmentService + dashboardMetricsService',
      ),
    ],
    actions: [
      {
        id: 'card-asg-open',
        label: 'Open Assignment',
        route:
          role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN,
        entityType: 'assignment',
      },
    ],
  })

  cards.push({
    id: 'card-attendance',
    entityType: 'attendance',
    title: 'Attendance',
    summary: bundle.weeklyIjtemaHealth.moduleActive
      ? `${bundle.weeklyIjtemaHealth.current}/${bundle.weeklyIjtemaHealth.total}`
      : 'Module inactive',
    status: bundle.weeklyIjtemaHealth.moduleActive
      ? `${bundle.weeklyIjtemaHealth.pct}%`
      : 'inactive',
    why: [
      reason(
        'att',
        'Weekly Ijtema health slice',
        'getDashboardWeeklyIjtemaHealthSlice',
      ),
    ],
    actions: [
      {
        id: 'card-att-open',
        label: 'Open Attendance',
        route:
          role === 'administrator'
            ? ROUTES.ADMIN_WEEKLY_IJTEMA
            : ROUTES.RUKN_WEEKLY_IJTEMA,
        entityType: 'attendance',
      },
    ],
  })

  cards.push({
    id: 'card-ijtema',
    entityType: 'weekly_ijtema',
    title: 'Weekly Ijtema',
    summary: bundle.weeklyIjtemaHealth.moduleActive ? 'Active' : 'Inactive',
    status: `${bundle.weeklyIjtemaHealth.pct}%`,
    why: [
      reason('ijtema', 'Same health slice as attendance', 'getDashboardWeeklyIjtemaHealthSlice'),
    ],
    actions: [
      {
        id: 'card-ij-open',
        label: 'Open Weekly Ijtema',
        route:
          role === 'administrator'
            ? ROUTES.ADMIN_WEEKLY_IJTEMA
            : ROUTES.RUKN_WEEKLY_IJTEMA,
        entityType: 'weekly_ijtema',
      },
    ],
  })

  return Object.freeze(cards)
}

export function formatEntityCardsText(cards: readonly EntityCard[]): string {
  return cards
    .map(
      (c) =>
        `${c.title} [${c.entityType}] — ${c.summary} · ${c.status}`,
    )
    .join('\n')
}
