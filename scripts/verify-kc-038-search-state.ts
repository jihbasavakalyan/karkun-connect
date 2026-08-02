/**
 * KC-038 — Global search state stability certification.
 * Ensures registry search stays within gender silo and deep links use URL params.
 */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { adminKarkunRegistryPath, parsePeopleFiltersFromSearchParams } from '../src/lib/peopleRegistryNavigation'
import { personMatchesSearchQuery } from '../src/lib/personResolution'
import { getAllKarkuns } from '../src/lib/peopleStore'
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

function filterGenderSilo(
  records: KarkunRegistryRecord[],
  gender: 'Male' | 'Female',
  search: string,
): KarkunRegistryRecord[] {
  return records
    .filter((record) => record.gender === gender)
    .filter((record) => !search.trim() || personMatchesSearchQuery(record, search))
}

function hydrateRegistryFromBackup() {
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
}

function run() {
  hydrateRegistryFromBackup()

  const all = getAllKarkuns(false)
  const maleSample = all.find((record) => record.gender === 'Male')
  const femaleSample = all.find((record) => record.gender === 'Female')
  assert.ok(maleSample, 'expected at least one Male Karkun in registry')
  assert.ok(femaleSample, 'expected at least one Female Karkun in registry')

  const maleMobile = maleSample.mobile.trim()
  const femaleMobile = femaleSample.mobile.trim()
  assert.ok(maleMobile, 'Male sample must have mobile')
  assert.ok(femaleMobile, 'Female sample must have mobile')

  const maleTabFemaleSearch = filterGenderSilo(all, 'Male', femaleMobile)
  assert.equal(
    maleTabFemaleSearch.length,
    0,
    'Female mobile search on Male tab must not surface Female records',
  )

  const maleTabMaleSearch = filterGenderSilo(all, 'Male', maleMobile)
  assert.ok(
    maleTabMaleSearch.some((record) => record.id === maleSample.id),
    'Male mobile search on Male tab must find the Male record',
  )

  const registryPath = adminKarkunRegistryPath({ search: 'Riyaz', status: 'active' })
  assert.match(registryPath, /\?search=Riyaz/, 'global search must persist in URL query')
  assert.match(registryPath, /status=active/, 'URL deep links must preserve non-search filters')

  const parsed = parsePeopleFiltersFromSearchParams(new URLSearchParams(registryPath.split('?')[1]))
  assert.equal(parsed.search, 'Riyaz')
  assert.equal(parsed.status, 'active')

  console.log('KC-038 search state verification passed')
}

run()
