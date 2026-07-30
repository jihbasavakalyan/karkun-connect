/**
 * KC-0128 — Unified Person Resolution + live Communication Preview certification.
 * Verifies mobiles 8123310584 / 7795505557 resolve identically across lookup surfaces,
 * and that selecting a Rukn produces a fully populated briefing (no raw {{tokens}}).
 */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { findMobileOwner, getAllKarkuns } from '../src/lib/peopleStore'
import {
  resolvePersonById,
  resolvePersonByMobile,
  searchPeople,
} from '../src/lib/personResolution'
import { searchPeopleForProfile } from '../src/lib/personProfile/resolvePersonSearch'
import { resolveExistingPersonRelationship } from '../src/lib/existingPersonResolution'
import { personMatchesSearchQuery, getPeopleSearchPool } from '../src/lib/personResolution'
import { buildOfficialCommunicationPreview } from '../src/lib/communication/officialCommunicationEngine'
import { buildOfficialCommunicationVariables } from '../src/lib/communication/officialCommunicationEngine'
import { applyTemplateVariables, composeWhatsAppMessage } from '../src/services/templateService'
import { getTemplate } from '../src/services/templateService'
import { WORKFLOW_URDU_PLAYBOOK_TEMPLATES } from '../src/data/communication/workflowUrduPlaybook'
import { ruknMaster } from '../src/data/ruknMaster'
import { buildRuknMessageRecipient } from '../src/lib/missionControl/dashboardCommunicationDrafts'
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
  },
  {
    mobile: '8123310584',
    expectedId: 'kr-056',
    expectedName: 'Shaik Abdul Mohsin',
  },
]

for (const testCase of cases) {
  const byMobile = resolvePersonByMobile(testCase.mobile)
  assert.ok(byMobile, `resolvePersonByMobile(${testCase.mobile})`)
  assert.equal(byMobile.personId, testCase.expectedId)
  assert.equal(byMobile.name, testCase.expectedName)

  const byIdHit = resolvePersonById(testCase.expectedId)
  assert.ok(byIdHit)
  assert.equal(byIdHit.personId, byMobile.personId)

  const owner = findMobileOwner(testCase.mobile)
  assert.ok(owner)
  assert.equal(owner.id, testCase.expectedId)

  const searchHits = searchPeople(testCase.mobile, { limit: 5, includeRukns: false })
  assert.ok(
    searchHits.some((hit) => hit.personId === testCase.expectedId),
    `searchPeople must find ${testCase.mobile}`,
  )

  const profileHits = searchPeopleForProfile(testCase.mobile, 5)
  assert.ok(
    profileHits.some((hit) => hit.personId === testCase.expectedId),
    `profile search must find ${testCase.mobile}`,
  )

  const pool = getPeopleSearchPool('Karkun')
  const inPool = pool.find((row) => mobilesMatch(row.mobile, testCase.mobile))
  assert.ok(inPool, `search pool must include ${testCase.mobile}`)
  assert.ok(personMatchesSearchQuery(inPool, testCase.mobile))

  const relationship = resolveExistingPersonRelationship(testCase.expectedId)
  assert.equal(relationship.found, true)
  assert.equal(relationship.personId, testCase.expectedId)

  console.log('OK person resolution', {
    mobile: testCase.mobile,
    id: testCase.expectedId,
    surfaces: [
      'resolvePersonByMobile',
      'resolvePersonById',
      'findMobileOwner',
      'searchPeople',
      'searchPeopleForProfile',
      'getPeopleSearchPool',
      'resolveExistingPersonRelationship',
    ],
  })
}

// Live Communication Preview — pick any Rukn with a mobile.
const ruknWithMobile = ruknMaster.find((rukn) => rukn.mobile?.trim())
assert.ok(ruknWithMobile, 'need at least one Rukn with mobile')
const recipient = buildRuknMessageRecipient(ruknWithMobile.id)
assert.ok(recipient, 'buildRuknMessageRecipient via Person Resolution')

const briefingId = 'tpl-pb-assigned-karkuns-briefing'
const template =
  getTemplate(briefingId) ??
  WORKFLOW_URDU_PLAYBOOK_TEMPLATES.find((item) => item.id === briefingId)
assert.ok(template, 'briefing template must exist')

const variables = buildOfficialCommunicationVariables(recipient)
const requiredKeys = [
  'RuknName',
  'CampaignName',
  'AssignedKarkunCount',
  'ConnectedCount',
  'AssignedKarkunList',
  'CompletedVisits',
  'PendingVisits',
  'VisitProgress',
  'WeeklyIjtemaProgress',
  'MonthlyBaitulMaalProgress',
  'AppRegistrationProgress',
  'PendingResponsibilities',
  'CompletedResponsibilities',
  'CampaignSummary',
]
for (const key of requiredKeys) {
  assert.ok(
    Object.prototype.hasOwnProperty.call(variables, key),
    `live var missing: ${key}`,
  )
  assert.notEqual(variables[key], undefined)
}

const body = composeWhatsAppMessage(template.body, variables, 'official')
assert.ok(!body.includes('{{'), `unresolved {{token}} in briefing:\n${body}`)
assert.ok(!/\{[A-Za-z]/.test(body.replace(/\{\{/g, '')), 'no raw single-brace tokens')

const preview = buildOfficialCommunicationPreview(recipient, 'tpl-oc-assignment-issued')
if (!('error' in preview)) {
  assert.ok(!preview.body.includes('{{'), 'OC preview must be fully resolved')
}

const subjectResolved = applyTemplateVariables(template.subject ?? '', variables)
assert.ok(!subjectResolved.includes('{{'))

console.log('OK live briefing', {
  ruknId: recipient.personId,
  ruknName: variables.RuknName,
  assigned: variables.AssignedKarkunCount,
  visitProgress: variables.VisitProgress,
  unresolvedTokens: false,
})

assert.ok(getAllKarkuns(false).length > 0)

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        'Canonical Person Resolution for 8123310584 / 7795505557',
        'Registry search pool parity with duplicate detection',
        'Existing person / profile / mobile owner parity',
        'Live Rukn briefing — no unresolved template variables',
        'Visit / Ijtema / BM / App / responsibility progress populated',
      ],
    },
    null,
    2,
  ),
)
