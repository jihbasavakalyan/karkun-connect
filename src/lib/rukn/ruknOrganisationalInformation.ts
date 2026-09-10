/**
 * Rukn Home organisational information — scoped read model.
 * Does not call the Admin organisational dashboard builder (org-wide people + mansooba documents).
 */

import { meqatiYearUrduRange, resolveMeqatiYear, type MeqatiYear } from '@/lib/dashboard/meqatiYear'
import { buildRuknMeqatiActivities } from '@/lib/rukn/ruknMeqatiActivities'
import { getConnectedKarkunsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import { getActiveMuttafiqRelationshipsForRukn } from '@/stores/muttafiqRelationshipStore'

export type RuknOrgMetricValue = number | null

export type RuknOrganisationalInformation = {
  year: MeqatiYear
  yearUrduRange: string
  people: {
    rukns: RuknOrgMetricValue
    aRukns: RuknOrgMetricValue
    karkuns: RuknOrgMetricValue
    muttafiqeen: RuknOrgMetricValue
    connections: RuknOrgMetricValue
  }
  assignedActivities: {
    activities: RuknOrgMetricValue
    completed: RuknOrgMetricValue
    inProgress: RuknOrgMetricValue
    remaining: RuknOrgMetricValue
    progressPct: RuknOrgMetricValue
  }
}

function countAssignedSlice(ruknId: string): {
  karkuns: number
  connections: number
  muttafiqeen: number
} {
  const connected = getConnectedKarkunsForRukn(ruknId)
  return {
    karkuns: connected.length,
    connections: connected.length,
    muttafiqeen: getActiveMuttafiqRelationshipsForRukn(ruknId).length,
  }
}

export function buildRuknOrganisationalInformation(
  ruknId: string,
  options: { peopleReady: boolean; programmesReady: boolean },
  asOf?: Date | string,
): RuknOrganisationalInformation {
  const year = resolveMeqatiYear(asOf)
  const peopleReady = options.peopleReady && Boolean(ruknId.trim())
  const programmesReady = options.programmesReady && Boolean(ruknId.trim())

  const assigned = peopleReady ? countAssignedSlice(ruknId) : null
  const items = programmesReady ? buildRuknMeqatiActivities(ruknId, asOf) : []

  let completed = 0
  let inProgress = 0
  let remaining = 0
  for (const item of items) {
    if (item.yearStatusLabel === 'مکمل') completed += 1
    else if (item.yearStatusLabel === 'جاری') inProgress += 1
    else if (item.yearStatusLabel === 'باقی') remaining += 1
  }
  const activities = items.length
  const statusKnown = completed + inProgress + remaining
  const hasActivitySlice = programmesReady && activities > 0

  return {
    year,
    yearUrduRange: meqatiYearUrduRange(year),
    people: {
      rukns: null,
      aRukns: null,
      karkuns: assigned ? assigned.karkuns : null,
      muttafiqeen: assigned ? assigned.muttafiqeen : null,
      connections: assigned ? assigned.connections : null,
    },
    assignedActivities: {
      activities: hasActivitySlice ? activities : null,
      completed: hasActivitySlice ? completed : null,
      inProgress: hasActivitySlice ? inProgress : null,
      remaining: hasActivitySlice ? remaining : null,
      progressPct:
        hasActivitySlice && statusKnown > 0
          ? Math.round((completed / activities) * 100)
          : null,
    },
  }
}

export function formatRuknOrgMetric(value: RuknOrgMetricValue): string {
  return value == null ? '—' : String(value)
}
