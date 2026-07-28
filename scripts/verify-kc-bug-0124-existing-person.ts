/**
 * KC-BUG-0124 — certifies existing-person relationship resolution for known mobiles.
 * Uses production backup snapshot (no Firestore writes).
 */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { resolveExistingPersonRelationship } from '../src/lib/existingPersonResolution'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'

type PersonLike = {
  id: string
  name: string
  mobile: string
  assignedRukn?: string
  assignedRuknId?: string
  assignmentStatus?: string
  campaignStatus?: string
  area?: string
  place?: string
  status?: string
  category?: string
  gender?: string
  createdAt?: string
  updatedAt?: string
  updatedBy?: string
  address?: string
  isArchived?: boolean
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

const backup = JSON.parse(
  fs.readFileSync(
    'production-data/backups/karkuns-before-kc0050-2026-07-19T09-06-40-022Z.json',
    'utf8',
  ),
)
const people = walkPeople(backup)
const cases = [
  { mobile: '7795505557', expectedName: 'Md Azmatulla Saqeeb', expectedId: 'kr-492' },
  { mobile: '8123310584', expectedName: 'Shaik Abdul Mohsin', expectedId: 'kr-056' },
]

MOCK_KARKUN_REGISTRY.length = 0
for (const person of people) {
  if (person.mobile === '7795505557' || person.mobile === '8123310584') {
    MOCK_KARKUN_REGISTRY.push({
      id: person.id,
      name: person.name,
      mobile: person.mobile,
      gender: (person.gender as 'Male' | 'Female') || 'Male',
      place: person.place || 'Basavakalyan',
      status: (person.status as 'active') || 'active',
      createdAt: person.createdAt || new Date(0).toISOString(),
      updatedAt: person.updatedAt || new Date(0).toISOString(),
      updatedBy: person.updatedBy || 'import',
      address: person.address || '',
      area: person.area || '',
      assignedRukn: person.assignedRukn || '',
      assignedRuknId: person.assignedRuknId || '',
      assignmentStatus: (person.assignmentStatus as 'Available') || 'Available',
      campaignStatus: (person.campaignStatus as 'not_assigned') || 'not_assigned',
      visitStatus: 'none',
      lastVisit: null,
      commitment: null,
      currentCommitment: '',
      jihAppRegistrationStatus: 'Not Discussed',
      notes: '',
      isArchived: Boolean(person.isArchived),
      category: (person.category as 'Karkun' | 'Muttafiq') || 'Karkun',
      whatsapp: undefined,
      fatherHusbandName: undefined,
    })
  }
}

for (const testCase of cases) {
  const match = MOCK_KARKUN_REGISTRY.find((row) => row.mobile === testCase.mobile)
  assert.ok(match, `person with mobile ${testCase.mobile} must exist in snapshot`)
  const graph = resolveExistingPersonRelationship(match.id, match.name, match.mobile)
  assert.equal(graph.found, true, `${testCase.mobile} person found`)
  assert.equal(graph.name, testCase.expectedName)
  assert.ok(graph.registry, 'registry resolved')
  assert.ok(graph.connectionStatus === 'Already Connected' || graph.connectionStatus === 'Not Connected')
  assert.ok(graph.adminViewRoute.includes(match.id), 'profile route present')
  assert.ok(graph.journeyRoute.includes(match.id), 'journey route present')
  console.log('OK', {
    mobile: testCase.mobile,
    personId: graph.personId,
    name: graph.name,
    registry: graph.registry,
    connectionStatus: graph.connectionStatus,
    responsibleRukn: graph.responsibleRuknName,
    campaignStatus: graph.campaignStatus,
    eligibleToConnect: graph.eligibleToConnect,
  })
}

console.log('KC-BUG-0124 existing person resolution certify: PASS')
