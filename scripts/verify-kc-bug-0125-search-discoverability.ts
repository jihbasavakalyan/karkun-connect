/**
 * KC-BUG-0125 — Search discoverability for active Karkuns.
 * Certifies mobiles that exist in production snapshots are findable via
 * the canonical registry search matcher (cross-gender, digit-aware).
 */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { getAllKarkuns } from '../src/lib/peopleStore'
import {
  matchesKarkunRegistrySearch,
  resolveSearchGenderHint,
} from '../src/lib/peopleSearch'
import { searchPeopleForProfile } from '../src/lib/personProfile/resolvePersonSearch'
import { mobilesMatch } from '../src/lib/mobileValidation'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

type PersonLike = {
  id: string
  name: string
  mobile: string
  gender?: string
  status?: string
  assignmentStatus?: string
  assignedRukn?: string
  assignedRuknId?: string
  area?: string
  place?: string
  address?: string
  isArchived?: boolean
  category?: string
  createdAt?: string
  updatedAt?: string
  updatedBy?: string
  campaignStatus?: string
  registryNumber?: string
}

function walkPeople(obj: unknown, acc: PersonLike[] = []): PersonLike[] {
  if (!obj || typeof obj !== 'object') return acc
  if (Array.isArray(obj)) {
    for (const item of obj) walkPeople(item, acc)
    return acc
  }
  const row = obj as PersonLike
  if (row.mobile && row.id && row.name) acc.push(row)
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') walkPeople(value, acc)
  }
  return acc
}

function toRecord(person: PersonLike): KarkunRegistryRecord {
  return {
    id: person.id,
    name: person.name,
    mobile: person.mobile,
    gender: (person.gender as 'Male' | 'Female') || 'Male',
    place: person.place || 'Basavakalyan',
    status: (person.status as 'active' | 'inactive') || 'active',
    createdAt: person.createdAt || new Date(0).toISOString(),
    updatedAt: person.updatedAt || new Date(0).toISOString(),
    updatedBy: person.updatedBy || 'import',
    address: person.address || '',
    area: person.area || '',
    assignedRukn: person.assignedRukn || '',
    assignedRuknId: person.assignedRuknId || '',
    assignmentStatus: (person.assignmentStatus as 'Available' | 'Assigned') || 'Available',
    campaignStatus: (person.campaignStatus as 'not_assigned') || 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: Boolean(person.isArchived),
    category: (person.category as 'Karkun' | 'Muttafiq') || 'Karkun',
    registryNumber: person.registryNumber,
  }
}

const backup = JSON.parse(
  fs.readFileSync(
    'production-data/backups/karkuns-before-kc0050-2026-07-19T09-06-40-022Z.json',
    'utf8',
  ),
)
const people = walkPeople(backup)
const byId = new Map<string, PersonLike>()
for (const person of people) {
  if (!byId.has(person.id)) byId.set(person.id, person)
}

MOCK_KARKUN_REGISTRY.length = 0
for (const person of byId.values()) {
  MOCK_KARKUN_REGISTRY.push(toRecord(person))
}

const cases = [
  {
    mobile: '7795505557',
    expectedId: 'kr-492',
    expectedName: 'Md Azmatulla Saqeeb',
    expectedGender: 'Female' as const,
  },
  {
    mobile: '8123310584',
    expectedId: 'kr-056',
    expectedName: 'Shaik Abdul Mohsin',
    expectedGender: 'Male' as const,
  },
]

const activePool = getAllKarkuns(false)
assert.ok(activePool.length > 0, 'active registry pool must be non-empty')

for (const testCase of cases) {
  const inPool = activePool.find((row) => mobilesMatch(row.mobile, testCase.mobile))
  assert.ok(inPool, `${testCase.mobile} must be in getAllKarkuns()`)
  assert.equal(inPool.id, testCase.expectedId)
  assert.equal(inPool.gender, testCase.expectedGender)

  assert.ok(
    matchesKarkunRegistrySearch(inPool, testCase.mobile),
    `${testCase.mobile} must match canonical search`,
  )
  assert.ok(
    matchesKarkunRegistrySearch(inPool, inPool.name.split(' ')[0]!),
    `${testCase.mobile} must match by name token`,
  )
  assert.ok(
    matchesKarkunRegistrySearch(inPool, testCase.expectedId),
    `${testCase.mobile} must match by person id`,
  )

  const hint = resolveSearchGenderHint(activePool, testCase.mobile)
  assert.equal(hint, testCase.expectedGender, `gender hint for ${testCase.mobile}`)

  const profileHits = searchPeopleForProfile(testCase.mobile, 5)
  assert.ok(
    profileHits.some((hit) => hit.personId === testCase.expectedId),
    `global/profile search must find ${testCase.mobile}`,
  )

  // Simulate prior bug: Male-tab-only pool would miss Female mobile.
  const maleOnly = activePool.filter((row) => row.gender === 'Male')
  const maleHit = maleOnly.find((row) => matchesKarkunRegistrySearch(row, testCase.mobile))
  if (testCase.expectedGender === 'Female') {
    assert.equal(maleHit, undefined, 'Female mobile must not appear in Male-only browse pool')
    const cross = activePool.filter((row) => matchesKarkunRegistrySearch(row, testCase.mobile))
    assert.equal(cross.length, 1, 'cross-gender search must surface Female record')
  }

  console.log('OK', {
    mobile: testCase.mobile,
    id: inPool.id,
    name: inPool.name,
    gender: inPool.gender,
    searchable: true,
  })
}

// Registry count sanity: searchable actives ⊆ registry pool
const searchableCount = activePool.filter((row) =>
  matchesKarkunRegistrySearch(row, row.mobile),
).length
assert.equal(searchableCount, activePool.length, 'every active karkun searchable by own mobile')

console.log(
  JSON.stringify(
    {
      ok: true,
      activeRegistryCount: activePool.length,
      checks: [
        '7795505557 searchable (Female cross-gender)',
        '8123310584 searchable (Male)',
        'Canonical digit-aware matcher',
        'Gender hint for tab auto-switch',
        'Global/profile search parity',
        'Every active mobile self-matches',
      ],
    },
    null,
    2,
  ),
)
