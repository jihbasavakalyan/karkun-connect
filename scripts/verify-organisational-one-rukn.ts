/**
 * One current organisational Rukn across campaign connections and Muttafiq relationships.
 * Run: npx vite-node scripts/verify-organisational-one-rukn.ts
 *
 * upsertActiveDurable remains a Muttafiq-only read-then-write check (not transactional).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import { setJwtRoleClaimOverrideForTests } from '@/lib/auth/ensureJwtRoleClaim'
import { unassignActiveCampaignConnectionsForPerson } from '@/lib/connections/unassignActiveCampaignConnectionsForPerson'
import { getConnectedKarkunsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import { convertKarkunToMuttafiqPreservingIdentity } from '@/lib/peopleLifecycle/conversionService'
import { createKarkun, createMuttafiq } from '@/lib/peopleStore'
import { getPersonCategory } from '@/lib/peopleClassification'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { clearLocalMuttafiqRelationshipsForTests } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import { assignMuttafiqRuknLinkAsAdmin } from '@/services/karkunRequestService'
import { moveToKarkunRegistry } from '@/services/peopleClassificationService'
import { assignRukn } from '@/services/assignmentService'
import { getRecentConnectionLedger } from '@/services/connectionLedgerService'
import {
  appendAssignment,
  getActiveAssignmentsForKarkun,
  getAllAssignments,
} from '@/stores/assignmentStore'
import {
  clearMuttafiqRelationshipStore,
  getActiveMuttafiqRelationshipsForPerson,
  getActiveMuttafiqRelationshipsForRukn,
  getConnectedMuttafiqDisplayRowsForRukn,
  getRuknHomeMuttafiqRows,
  reloadMuttafiqRelationshipStoreFromPersistence,
} from '@/stores/muttafiqRelationshipStore'
import { ruknMaster } from '@/data/ruknMaster'
import { DEFAULT_PLACE } from '@/types/people.types'
import { muttafiqRuknRelationshipId, type MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function administratorJwt() {
  return {
    ok: true as const,
    role: 'administrator' as const,
    ruknId: null,
    forceRefreshed: false,
    timeline: {
      t1GetIdTokenCalled: 0,
      t2GetIdTokenResolved: 0,
      forceRefreshed: false,
      role: 'administrator',
      ruknId: null,
      issuedAtTime: null,
      expirationTime: null,
    },
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

function seedRelationship(row: MuttafiqRuknRelationship): void {
  const repos = getRepositories()
  const existing = repos.muttafiqRelationship.loadAll()
  assert(existing.ok, 'load relationships')
  repos.muttafiqRelationship.saveAll([...existing.data.filter((item) => item.id !== row.id), row])
  reloadMuttafiqRelationshipStoreFromPersistence()
}

async function seedActiveCampaign(personId: string, ruknId: string, suffix: string): Promise<string> {
  const now = nowIso()
  const assignmentId = `asgn-one-rukn-${suffix}`
  await appendAssignment({
    assignmentId,
    assignmentNumber: `ASN-OR-${suffix}`,
    ruknId,
    karkunId: personId,
    assignedDate: now.slice(0, 10),
    effectiveFrom: now.slice(0, 10),
    status: 'Active',
    assignedBy: 'Administrator',
    createdAt: now,
    updatedAt: now,
  })
  const person = getKarkunById(personId)
  if (person && getPersonCategory(person) === 'Karkun') {
    person.assignedRuknId = ruknId
    person.assignedRukn = ruknMaster.find((row) => row.id === ruknId)?.name ?? ruknId
    person.assignmentStatus = 'Assigned'
    person.campaignStatus = 'active'
    person.assignmentDate = now.slice(0, 10)
  }
  return assignmentId
}

console.log('verify-organisational-one-rukn: start')

{
  const convertSrc = read('src/lib/peopleLifecycle/conversionService.ts')
  assert(
    convertSrc.indexOf('unassignActiveCampaignConnectionsForPerson') <
      convertSrc.indexOf("person.category = 'Muttafiq'"),
    'B conversion unassigns campaign before category Muttafiq',
  )
  assert(!convertSrc.includes('connections preserved'), 'conversion remarks no longer say connections preserved')
  assert(!convertSrc.includes('preserve_connections'), 'conversion ledger is not preserve_connections')
  assert(!convertSrc.includes("eventType: 'TRANSFERRED'"), 'conversion does not label Unassign as transfer')
  const helper = read('src/lib/connections/unassignActiveCampaignConnectionsForPerson.ts')
  assert(!helper.includes('validateRuknActive'), 'unassign does not require campaign Rukn to be active')
  assert(helper.includes("eventType: 'DISCONNECTED'"), 'unassign writes DISCONNECTED ledger')
  const upsert = read('src/repositories/firestore/muttafiqRelationshipFirestoreRepository.ts')
  assert(upsert.includes('findOtherActiveMuttafiqRelationship'), 'upsertActiveDurable Muttafiq check retained')
  assert(!upsert.includes('runTransaction'), 'upsertActiveDurable not converted to a client transaction')
  const submit = read('src/services/karkunRequestService.ts')
  assert(submit.includes('unassignCampaignAfterMuttafiqLinkPermitted'), 'link approve/admin unassigns campaign after Muttafiq gates')
  const submitFn = submit.slice(
    submit.indexOf('export async function submitMuttafiqRuknLinkRequest'),
    submit.indexOf('function rejectSecondActiveMuttafiqLink'),
  )
  assert(
    !submitFn.includes('unassignActiveCampaignConnectionsForPerson'),
    'submit Muttafiq link does not unassign campaign',
  )
  const tracking = read('src/lib/publicRegistration/adminTracking.ts')
  assert(!tracking.includes('unassignActiveCampaignConnectionsForPerson'), 'registration API does not import unassign helper')
  assert(!tracking.includes("from '@/"), 'registration tracking stays serverless-safe')
  const home = read('src/stores/muttafiqRelationshipStore.ts')
  const currentFn = home.slice(
    home.indexOf('export function getCurrentValidMuttafiqRelationshipsForRukn'),
    home.indexOf('export function getRuknHomeMuttafiqRows'),
  )
  assert(currentFn.includes('treatMissingPersonAsCurrent: true'), 'Home restores missing-person-as-current')
  assert(currentFn.includes('personActives.length !== 1'), 'Home omits dual-Active without using Admin helper')
  assert(!currentFn.includes('getActiveMuttafiqRelationshipsForRukn'), 'Home population is not the Admin Active helper')
  const table = read('src/components/forms/people/RuknPeopleTable.tsx')
  assert(table.includes('getConnectedMuttafiqDisplayRowsForRukn(rukn.id).length'), 'Admin Rukn table count matches display rows')
  const aRukn = read('src/pages/admin/ARuknRegistryPage.tsx')
  assert(aRukn.includes('getConnectedMuttafiqDisplayRowsForRukn(officer.id).length'), 'Admin A-Rukn table count matches display rows')
  const csv = read('src/lib/peopleImportExport.ts')
  assert(csv.includes('getConnectedMuttafiqDisplayRowsForRukn(rukn.id).length'), 'CSV Muttafiq count matches display rows')
}

resetRepositoryProviderForTests()
setJwtRoleClaimOverrideForTests(administratorJwt())
setAdministratorDecisionSessionOverrideForTests(null)
clearLocalMuttafiqRelationshipsForTests()
clearMuttafiqRelationshipStore()

const maleRukns = ruknMaster.filter((row) => row.gender === 'Male')
const ruknA = maleRukns.find((row) => row.status === 'active')
const ruknB = maleRukns.find((row) => row.status === 'active' && row.id !== ruknA?.id)
assert(ruknA && ruknB, 'two male rukns')

{
  const created = createKarkun(
    {
      name: 'One Rukn Convert',
      gender: 'Male',
      mobile: '9111999001',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'A karkun')
  const personId = created.karkunId!
  const assigned = await assignRukn({
    ruknId: ruknA.id,
    karkunId: personId,
    effectiveFrom: nowIso().slice(0, 10),
    assignedBy: 'Administrator',
  })
  assert(assigned.success, `A assign: ${assigned.success ? '' : assigned.error}`)
  assert(getActiveAssignmentsForKarkun(personId).length === 1, 'A has Active campaign')

  const converted = await convertKarkunToMuttafiqPreservingIdentity(personId, 'Administrator')
  assert(converted.success, `A convert: ${converted.error ?? ''}`)
  const person = getKarkunById(personId)
  assert(person && getPersonCategory(person) === 'Muttafiq', 'A category Muttafiq')
  assert(getActiveAssignmentsForKarkun(personId).length === 0, 'A campaign Unassigned')
  const campaign = getAllAssignments().find((row) => row.karkunId === personId)
  assert(campaign?.status === 'Unassigned', 'A connection retained Unassigned')
  assert((person.assignedRuknId || '') === '', 'A assignedRuknId cleared')
  assert(person.assignmentStatus === 'Available', 'A assignmentStatus Available')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(personId).length === 0, 'A no Muttafiq relationship created')
  assert(
    getRecentConnectionLedger(20).some(
      (row) => row.karkunId === personId && row.eventType === 'DISCONNECTED',
    ),
    'A DISCONNECTED ledger',
  )
  console.log('  OK  A/B Karkun→Muttafiq unassigns campaign first, no Muttafiq rel')
}

{
  const created = createKarkun(
    {
      name: 'Inactive Rukn Unassign',
      gender: 'Male',
      mobile: '9111999002',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'C karkun')
  const personId = created.karkunId!
  const previousStatus = ruknA.status
  await seedActiveCampaign(personId, ruknA.id, 'inactive')
  ruknA.status = 'inactive'
  const cleaned = await unassignActiveCampaignConnectionsForPerson({
    personId,
    performedBy: 'Administrator',
  })
  ruknA.status = previousStatus
  assert(cleaned.ok, `C unassign inactive Rukn: ${cleaned.ok ? '' : cleaned.error}`)
  assert(getActiveAssignmentsForKarkun(personId).length === 0, 'C campaign Unassigned despite inactive Rukn')
  console.log('  OK  C inactive campaign Rukn can still be Unassigned')
}

{
  const created = createMuttafiq(
    {
      name: 'Link Leftover Campaign',
      gender: 'Male',
      mobile: '9111999003',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'D muttafiq')
  const personId = created.karkunId!
  const assignmentId = await seedActiveCampaign(personId, ruknA.id, 'link')
  const person = getKarkunById(personId)!
  person.assignedRuknId = ruknA.id
  person.assignmentStatus = 'Assigned'
  const assigned = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknB.id,
    establishedBy: 'Administrator',
  })
  assert(assigned.ok, `D admin link: ${assigned.ok ? '' : assigned.error}`)
  assert(getActiveAssignmentsForKarkun(personId).length === 0, 'D campaign Unassigned')
  assert(getAllAssignments().find((row) => row.assignmentId === assignmentId)?.status === 'Unassigned', 'D ASN retained')
  reloadMuttafiqRelationshipStoreFromPersistence()
  const rels = getActiveMuttafiqRelationshipsForPerson(personId)
  assert(rels.length === 1 && rels[0]?.ruknId === ruknB.id, 'D one Muttafiq Active')
  const after = getKarkunById(personId)!
  assert((after.assignedRuknId || '') === '', 'D denorm cleared')
  console.log('  OK  D Admin Muttafiq link unassigns leftover campaign')
}

{
  const created = createMuttafiq(
    {
      name: 'Same Rukn Leftover',
      gender: 'Male',
      mobile: '9111999004',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'E muttafiq')
  const personId = created.karkunId!
  await seedActiveCampaign(personId, ruknA.id, 'same')
  const assigned = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknA.id,
    establishedBy: 'Administrator',
  })
  assert(assigned.ok, `E same-Rukn link: ${assigned.ok ? '' : assigned.error}`)
  assert(getActiveAssignmentsForKarkun(personId).length === 0, 'E campaign Unassigned')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(personId).length === 1, 'E one Muttafiq current')
  console.log('  OK  E same-Rukn leftover campaign Unassigned; one Muttafiq current')
}

{
  const created = createMuttafiq(
    {
      name: 'Reject Second Muttafiq',
      gender: 'Male',
      mobile: '9111999005',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'F muttafiq')
  const personId = created.karkunId!
  const assignmentId = await seedActiveCampaign(personId, ruknA.id, 'keep')
  const person = getKarkunById(personId)!
  person.assignedRuknId = ruknA.id
  person.assignmentStatus = 'Assigned'
  seedRelationship({
    id: muttafiqRuknRelationshipId(ruknA.id, personId),
    ruknId: ruknA.id,
    ruknName: ruknA.name,
    personId,
    personName: person.name,
    status: 'Active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    establishedBy: 'Administrator',
  })
  const blocked = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknB.id,
    establishedBy: 'Administrator',
  })
  assert(!blocked.ok, 'F second Muttafiq Active rejected')
  assert(getActiveAssignmentsForKarkun(personId).length === 1, 'F campaign NOT unassigned on reject')
  assert(getAllAssignments().find((row) => row.assignmentId === assignmentId)?.status === 'Active', 'F leftover still Active')
  assert(getKarkunById(personId)?.assignedRuknId === ruknA.id, 'F denorm unchanged on reject')
  console.log('  OK  F second Muttafiq Active rejected without campaign unassign')
}

{
  const created = createMuttafiq(
    {
      name: 'Move To Karkun Leftover',
      gender: 'Male',
      mobile: '9111999006',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'G muttafiq')
  const personId = created.karkunId!
  const linked = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknA.id,
    establishedBy: 'Administrator',
  })
  assert(linked.ok, 'G link')
  await seedActiveCampaign(personId, ruknB.id, 'mk')
  const moved = await moveToKarkunRegistry(personId, 'Administrator')
  assert(moved.success, `G move: ${moved.error ?? ''}`)
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(personId).length === 0, 'G Muttafiq rels Ended')
  const repos = getRepositories()
  const retained = repos.muttafiqRelationship.loadAll()
  assert(retained.ok && retained.data.some((row) => row.personId === personId && row.status === 'Ended'), 'G Ended retained')
  assert(getActiveAssignmentsForKarkun(personId).length === 0, 'G campaign Unassigned')
  const karkun = getKarkunById(personId)!
  assert(getPersonCategory(karkun) === 'Karkun', 'G category Karkun')
  assert(karkun.assignmentStatus === 'Available', 'G Available')
  assert((karkun.assignedRuknId || '') === '', 'G denorm cleared')
  assert(
    !getConnectedKarkunsForRukn(ruknB.id).some((row) => row.id === personId),
    'G not connected Karkun until assignRukn',
  )
  assert(!getRuknHomeMuttafiqRows(ruknA.id).some((row) => row.counterpartId === personId), 'G off Muttafiq Home')

  const assigned = await assignRukn({
    ruknId: ruknA.id,
    karkunId: personId,
    effectiveFrom: nowIso().slice(0, 10),
    assignedBy: 'Administrator',
  })
  assert(assigned.success, `H assignRukn: ${assigned.error ?? ''}`)
  assert(getActiveAssignmentsForKarkun(personId).length === 1, 'H exactly one Active campaign')
  assert(getActiveAssignmentsForKarkun(personId)[0]?.ruknId === ruknA.id, 'H current Rukn')

  const { removeAssignment } = await import('@/services/assignmentService')
  const removed = await removeAssignment({
    ruknId: ruknA.id,
    karkunId: personId,
    effectiveFrom: nowIso().slice(0, 10),
    removalReason: 'Other',
    assignedBy: 'Administrator',
  })
  assert(removed.success, 'I disconnect Karkun campaign before reverse convert')
  const reversed = await convertKarkunToMuttafiqPreservingIdentity(personId, 'Administrator')
  assert(reversed.success, `I reverse convert: ${reversed.error ?? ''}`)
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(personId).length === 0, 'I Ended Muttafiq rel not restored')
  console.log('  OK  G/H/I M→K leftover campaign, explicit assignRukn, reverse does not restore')
}

{
  const created = createMuttafiq(
    {
      name: 'Dual Admin List',
      gender: 'Male',
      mobile: '9111999007',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'J muttafiq')
  const personId = created.karkunId!
  const at = nowIso()
  seedRelationship({
    id: muttafiqRuknRelationshipId(ruknA.id, personId),
    ruknId: ruknA.id,
    ruknName: ruknA.name,
    personId,
    personName: 'Dual Admin List',
    status: 'Active',
    createdAt: at,
    updatedAt: at,
    establishedBy: 'Administrator',
  })
  seedRelationship({
    id: muttafiqRuknRelationshipId(ruknB.id, personId),
    ruknId: ruknB.id,
    ruknName: ruknB.name,
    personId,
    personName: 'Dual Admin List',
    status: 'Active',
    createdAt: at,
    updatedAt: at,
    establishedBy: 'Administrator',
  })
  assert(
    getActiveMuttafiqRelationshipsForRukn(ruknA.id).some((row) => row.personId === personId),
    'J listed on first Rukn',
  )
  assert(
    getActiveMuttafiqRelationshipsForRukn(ruknB.id).some((row) => row.personId === personId),
    'J listed on second Rukn',
  )
  const rowsA = getConnectedMuttafiqDisplayRowsForRukn(ruknA.id).filter((row) => row.counterpartId === personId)
  const rowsB = getConnectedMuttafiqDisplayRowsForRukn(ruknB.id).filter((row) => row.counterpartId === personId)
  assert(rowsA.length === 1 && rowsA[0]?.needsReview === true, 'J Admin display Needs review on first Rukn')
  assert(rowsB.length === 1 && rowsB[0]?.relationshipLabel === 'Needs review', 'J no winner selected')
  assert(!getRuknHomeMuttafiqRows(ruknA.id).some((row) => row.counterpartId === personId), 'J omitted from first Home')
  assert(!getRuknHomeMuttafiqRows(ruknB.id).some((row) => row.counterpartId === personId), 'J omitted from second Home')
  console.log('  OK  J dual Active Muttafiq visible on both Admin lists as Needs review; omitted from Home')
}

console.log('verify-organisational-one-rukn: OK')
