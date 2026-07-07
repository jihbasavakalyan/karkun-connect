import { getAllKarkuns } from '@/lib/peopleStore'
import { getLatestSubmissionForKarkun } from '@/stores/annexure1Store'
import { getRegistrationForKarkun } from '@/services/jihWebPortalService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type DynamicCampaignList = {
  id: string
  name: string
  description: string
  filter: (karkun: KarkunRegistryRecord) => boolean
}

function isConnected(karkun: KarkunRegistryRecord): boolean {
  return karkun.assignmentStatus === 'Assigned'
}

function hasVisit(karkun: KarkunRegistryRecord): boolean {
  return karkun.visitStatus === 'completed' || Boolean(getLatestSubmissionForKarkun(karkun.id))
}

function isJihRegistered(karkun: KarkunRegistryRecord): boolean {
  return (
    karkun.jihAppRegistrationStatus === 'Registered' ||
    getRegistrationForKarkun(karkun.id).status === 'Registered'
  )
}

function daysSince(iso: string | null): number {
  if (!iso) {
    return Number.POSITIVE_INFINITY
  }
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY
  }
  return (Date.now() - then) / (1000 * 60 * 60 * 24)
}

function placeMatches(karkun: KarkunRegistryRecord, needle: string): boolean {
  const target = needle.toLowerCase()
  return (
    karkun.place.toLowerCase().includes(target) ||
    karkun.area.toLowerCase().includes(target) ||
    karkun.address.toLowerCase().includes(target)
  )
}

export const DYNAMIC_CAMPAIGN_LISTS: DynamicCampaignList[] = [
  {
    id: 'needs-first-visit',
    name: 'Needs First Visit',
    description: 'Connected Karkuns with no visit recorded yet.',
    filter: (karkun) => isConnected(karkun) && !hasVisit(karkun),
  },
  {
    id: 'pending-jih-registration',
    name: 'Pending JIH Registration',
    description: 'Connected Karkuns not yet registered in the JIH App.',
    filter: (karkun) => isConnected(karkun) && !isJihRegistered(karkun),
  },
  {
    id: 'no-contact-15-days',
    name: 'No Contact 15 Days',
    description: 'Connected Karkuns with no visit in the last 15 days.',
    filter: (karkun) => isConnected(karkun) && daysSince(karkun.lastVisit) > 15,
  },
  {
    id: 'recently-connected',
    name: 'Recently Connected',
    description: 'Karkuns connected in the last 7 days.',
    filter: (karkun) =>
      isConnected(karkun) && daysSince(karkun.assignmentDate ?? null) <= 7,
  },
  {
    id: 'women',
    name: 'Women',
    description: 'All active women Karkuns.',
    filter: (karkun) => karkun.gender === 'Female' && karkun.status === 'active',
  },
  {
    id: 'basavakalyan',
    name: 'Basavakalyan',
    description: 'Karkuns in Basavakalyan.',
    filter: (karkun) => placeMatches(karkun, 'Basavakalyan'),
  },
  {
    id: 'bidar',
    name: 'Bidar',
    description: 'Karkuns in Bidar.',
    filter: (karkun) => placeMatches(karkun, 'Bidar'),
  },
]

export function getDynamicListMembers(listId: string): KarkunRegistryRecord[] {
  const definition = DYNAMIC_CAMPAIGN_LISTS.find((list) => list.id === listId)
  if (!definition) {
    return []
  }
  return getAllKarkuns().filter(definition.filter)
}

export function getDynamicListCounts(): Record<string, number> {
  const karkuns = getAllKarkuns()
  const counts: Record<string, number> = {}
  for (const definition of DYNAMIC_CAMPAIGN_LISTS) {
    counts[definition.id] = karkuns.filter(definition.filter).length
  }
  return counts
}
