/**
 * Universal read-only search across existing KC entities.
 * Uses peopleStore, campaignService, assignmentStore, ROUTES — no duplicated business rules.
 */

import { getAllKarkuns, getAllMuttafiqeen, getAllRukns, findMobileOwner } from '@/lib/peopleStore'
import { isSoftRemoved } from '@/lib/peopleClassification'
import { matchesKarkunRegistrySearch } from '@/lib/peopleSearch'
import { mobilesMatch, normalizeMobile } from '@/lib/mobileValidation'
import { adminPersonProfilePath } from '@/lib/personProfile/ProfilePresenter'
import { adminRuknDetailPath, adminAssignmentsPath } from '@/constants/routes'
import { getCampaignLibrary } from '@/services/campaignService'
import {
  getActiveAssignmentsForKarkun,
  getAllAssignments,
  searchAssignments,
} from '@/stores/assignmentStore'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { resolveNavigationTarget } from './navigationMap'
import { rankFields } from './rankMatch'
import {
  getCachedUniversalSearch,
  setCachedUniversalSearch,
} from './searchCache'
import type { RafeeqRole } from './types'
import type { UniversalSearchHit } from './universalSearchTypes'

export type { UniversalSearchHit } from './universalSearchTypes'

const MODULE_ALIASES: Array<{
  target: string
  entityType: UniversalSearchHit['entityType']
  names: string[]
}> = [
  {
    target: 'dashboard',
    entityType: 'dashboard',
    names: ['dashboard', 'home', 'ڈیش بورڈ', 'ہوم'],
  },
  {
    target: 'registry',
    entityType: 'module',
    names: ['registry', 'karkun list', 'karkuns', 'رجسٹری', 'کارکنان'],
  },
  {
    target: 'weekly_ijtema',
    entityType: 'weekly_ijtema',
    names: ['weekly ijtema', 'ijtema', 'ہفتہ وار اجتماع', 'اجتما'],
  },
  {
    target: 'attendance',
    entityType: 'attendance',
    names: ['attendance', 'حاضری'],
  },
  {
    target: 'campaign',
    entityType: 'module',
    names: ['campaign', 'campaigns', 'مہم'],
  },
  {
    target: 'reports',
    entityType: 'report',
    names: ['reports', 'report', 'رپورٹ', 'رپورٹس', 'activities'],
  },
  {
    target: 'settings',
    entityType: 'settings',
    names: ['settings', 'ترتیبات'],
  },
  {
    target: 'assignments',
    entityType: 'module',
    names: [
      'assignments',
      'assigned karkuns',
      'connections',
      'تفویض',
      'کنکشن',
      'منسلک',
    ],
  },
  {
    target: 'muttafiq',
    entityType: 'module',
    names: ['muttafiq', 'muttafiqs', 'muttafiqeen', 'متفق', 'متفقین'],
  },
  {
    target: 'baitul_maal',
    entityType: 'module',
    names: ['baitul maal', 'bait-ul-maal', 'بیت المال', 'بیتُ المال'],
  },
]

function pushHit(
  bag: Map<string, UniversalSearchHit>,
  hit: UniversalSearchHit,
): void {
  if (hit.score <= 0) return
  const existing = bag.get(hit.id)
  if (!existing || hit.score > existing.score) {
    bag.set(hit.id, hit)
  }
}

function searchPeople(
  query: string,
  bag: Map<string, UniversalSearchHit>,
): void {
  const trimmed = query.trim()
  const mobileNorm = normalizeMobile(trimmed)
  const pools: Array<{
    people: ReturnType<typeof getAllKarkuns>
    entityType: 'karkun' | 'muttafiq'
  }> = [
    { people: getAllKarkuns(), entityType: 'karkun' },
    { people: getAllMuttafiqeen(), entityType: 'muttafiq' },
  ]

  for (const { people, entityType } of pools) {
    for (const person of people) {
      // KC-027 — soft-removed never appear in Rafeeq people hits.
      if (isSoftRemoved(person)) continue

      let score = 0
      let tier = 'none'
      if (mobileNorm && mobilesMatch(person.mobile, mobileNorm)) {
        score = 100
        tier = 'exact'
      } else if (matchesKarkunRegistrySearch(person, trimmed)) {
        const ranked = rankFields(trimmed, [
          person.name,
          person.id,
          person.registryNumber,
          person.mobile,
          person.assignedRuknId,
          person.assignedRukn,
        ])
        score = ranked.score
        tier = ranked.tier
        if (score === 0) {
          score = 50
          tier = 'related'
        }
      } else {
        const ranked = rankFields(trimmed, [person.name, person.id])
        score = ranked.score
        tier = ranked.tier
      }
      if (score <= 0) continue

      const assignments = getActiveAssignmentsForKarkun(person.id)
      const descParts = [
        entityType === 'muttafiq' ? 'متفق' : 'کارکن',
        person.mobile || null,
        assignments[0] ? `ASN ${assignments[0].assignmentNumber}` : null,
        person.area || person.place || null,
      ].filter(Boolean)

      pushHit(bag, {
        id: `person:${person.id}`,
        entityType,
        name: person.name,
        description: descParts.join(' · '),
        route: adminPersonProfilePath(person.id),
        score,
        tier,
        personId: person.id,
        mobile: person.mobile,
      })
    }
  }

  collapsePeopleHitsByMobile(bag)
}

/**
 * KC-027 — when two non-soft-removed docs share a mobile, keep one canonical hit.
 * Prefers findMobileOwner id; else higher score. No Firestore merge.
 */
function collapsePeopleHitsByMobile(bag: Map<string, UniversalSearchHit>): void {
  const byMobile = new Map<string, UniversalSearchHit>()
  const removeIds: string[] = []

  for (const hit of bag.values()) {
    if (hit.entityType !== 'karkun' && hit.entityType !== 'muttafiq') continue
    const mobileKey = normalizeMobile(hit.mobile ?? '')
    if (!mobileKey) continue

    const existing = byMobile.get(mobileKey)
    if (!existing) {
      byMobile.set(mobileKey, hit)
      continue
    }

    const owner = findMobileOwner(mobileKey)
    const existingIsCanonical = Boolean(owner && existing.personId === owner.id)
    const hitIsCanonical = Boolean(owner && hit.personId === owner.id)

    let keep = existing
    let drop = hit
    if (hitIsCanonical && !existingIsCanonical) {
      keep = hit
      drop = existing
    } else if (existingIsCanonical && !hitIsCanonical) {
      keep = existing
      drop = hit
    } else if (hit.score > existing.score) {
      keep = hit
      drop = existing
    } else if (hit.score === existing.score) {
      const preferHit = (hit.personId ?? hit.id).localeCompare(existing.personId ?? existing.id) < 0
      if (preferHit) {
        keep = hit
        drop = existing
      }
    }

    byMobile.set(mobileKey, keep)
    removeIds.push(drop.id)
  }

  for (const id of removeIds) {
    bag.delete(id)
  }
}

function searchRukns(query: string, bag: Map<string, UniversalSearchHit>): void {
  const trimmed = query.trim()
  const mobileNorm = normalizeMobile(trimmed)
  for (const rukn of getAllRukns()) {
    if (rukn.isArchived) continue
    let score = 0
    let tier = 'none'
    if (mobileNorm && mobilesMatch(rukn.mobile, mobileNorm)) {
      score = 100
      tier = 'exact'
    } else {
      const ranked = rankFields(trimmed, [rukn.name, rukn.id, rukn.mobile])
      score = ranked.score
      tier = ranked.tier
    }
    if (score <= 0) continue
    pushHit(bag, {
      id: `rukn:${rukn.id}`,
      entityType: 'rukn',
      name: rukn.name,
      description: ['رکن', rukn.mobile || null, rukn.id].filter(Boolean).join(' · '),
      route: adminRuknDetailPath(rukn.id),
      score,
      tier,
      personId: rukn.id,
      mobile: rukn.mobile,
    })
  }
}

function searchCampaigns(
  query: string,
  role: RafeeqRole,
  bag: Map<string, UniversalSearchHit>,
): void {
  const nav = resolveNavigationTarget('campaign', role)
  if (!nav) return
  for (const campaign of getCampaignLibrary()) {
    const ranked = rankFields(query, [
      campaign.name,
      campaign.id,
      campaign.theme,
      campaign.objective,
      campaign.status,
    ])
    if (ranked.score <= 0) continue
    pushHit(bag, {
      id: `campaign:${campaign.id}`,
      entityType: 'campaign',
      name: campaign.name,
      description: `${campaign.status === 'active' ? 'فعال مہم' : 'آرکائیو مہم'} · ${campaign.theme}`,
      route: nav.route,
      score: ranked.score,
      tier: ranked.tier,
    })
  }
}

function searchAssignmentRecords(
  query: string,
  role: RafeeqRole,
  bag: Map<string, UniversalSearchHit>,
): void {
  const trimmed = query.trim()
  const byNumber = searchAssignments(trimmed)
  const candidates =
    byNumber.length > 0
      ? byNumber
      : getAllAssignments().filter((record) => {
          const karkun = getKarkunById(record.karkunId)
          const rukn = getRuknById(record.ruknId)
          return (
            rankFields(trimmed, [
              record.assignmentNumber,
              record.assignmentId,
              record.karkunId,
              record.ruknId,
              karkun?.name,
              rukn?.name,
            ]).score > 0
          )
        })

  const navRoute =
    role === 'administrator'
      ? adminAssignmentsPath()
      : resolveNavigationTarget('assignments', role)?.route ?? adminAssignmentsPath()

  for (const record of candidates.slice(0, 12)) {
    const karkun = getKarkunById(record.karkunId)
    const rukn = getRuknById(record.ruknId)
    const ranked = rankFields(trimmed, [
      record.assignmentNumber,
      record.assignmentId,
      record.karkunId,
      record.ruknId,
      karkun?.name,
      rukn?.name,
    ])
    const score = ranked.score > 0 ? ranked.score : 50
    pushHit(bag, {
      id: `assignment:${record.assignmentId}`,
      entityType: 'assignment',
      name: record.assignmentNumber,
      description: [
        karkun?.name ?? record.karkunId,
        rukn ? `→ ${rukn.name}` : null,
        record.status,
      ]
        .filter(Boolean)
        .join(' · '),
      route: navRoute,
      score,
      tier: ranked.tier === 'none' ? 'related' : ranked.tier,
    })
  }
}

function searchModules(
  query: string,
  role: RafeeqRole,
  bag: Map<string, UniversalSearchHit>,
): void {
  for (const mod of MODULE_ALIASES) {
    const ranked = rankFields(query, [mod.target, ...mod.names])
    if (ranked.score <= 0) continue
    const nav = resolveNavigationTarget(mod.target, role)
    if (!nav) continue
    pushHit(bag, {
      id: `module:${mod.target}`,
      entityType: mod.entityType,
      name: nav.label,
      description: `ماڈیول کھولیں · ${mod.target}`,
      route: nav.route,
      score: ranked.score + 5,
      tier: ranked.tier,
    })
  }
}

/**
 * Universal search entry — ranked, cached, read-only.
 */
export function searchUniversal(
  query: string,
  role: RafeeqRole,
  limit = 12,
  signal?: AbortSignal,
): UniversalSearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  if (signal?.aborted) return []

  const cacheKey = `${role}:${trimmed.toLowerCase()}`
  const cached = getCachedUniversalSearch(cacheKey)
  if (cached) return cached.slice(0, limit)

  const bag = new Map<string, UniversalSearchHit>()
  searchPeople(trimmed, bag)
  if (signal?.aborted) return []
  searchRukns(trimmed, bag)
  searchCampaigns(trimmed, role, bag)
  searchAssignmentRecords(trimmed, role, bag)
  searchModules(trimmed, role, bag)

  const hits = [...bag.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  })

  setCachedUniversalSearch(cacheKey, hits)
  return hits.slice(0, limit)
}

/** People-only subset for communication / karkun-info handlers. */
export function searchPeopleReadOnly(
  query: string,
  limit = 8,
): Array<{
  personId: string
  name: string
  mobile: string
  profilePath: string
}> {
  const people = searchUniversal(query, 'administrator', Math.max(limit * 3, 12)).filter(
    (hit) =>
      hit.entityType === 'karkun' ||
      hit.entityType === 'muttafiq' ||
      hit.entityType === 'rukn',
  )

  // Defense: collapse again by normalized mobile for the people-only view.
  const seenMobile = new Set<string>()
  const collapsed: typeof people = []
  for (const hit of people) {
    const key = normalizeMobile(hit.mobile ?? '')
    if (key) {
      if (seenMobile.has(key)) continue
      seenMobile.add(key)
    }
    collapsed.push(hit)
  }

  return collapsed.slice(0, limit).map((hit) => ({
    personId: hit.personId ?? hit.id,
    name: hit.name,
    mobile: hit.mobile ?? '',
    profilePath: hit.route,
  }))
}
