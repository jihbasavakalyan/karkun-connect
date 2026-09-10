/**
 * Current-valid Muttafiq relationship predicate, Home/list agreement,
 * registration isolation, and conversion End behaviour.
 * Run: npx vite-node scripts/verify-current-muttafiq-relationship.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import { setJwtRoleClaimOverrideForTests } from '@/lib/auth/ensureJwtRoleClaim'
import { isCurrentValidMuttafiqRelationship } from '@/lib/connections/currentMuttafiqRelationship'
import {
  isCurrentValidMuttafiqRelationship as sharedPredicate,
} from '@/lib/connections/currentValidMuttafiqPredicate'
import { buildTrainingRegistrationRuknProgress } from '@/lib/publicRegistration/adminTracking'
import { buildRuknOrganisationalInformation } from '@/lib/rukn/ruknOrganisationalInformation'
import { createKarkun, createMuttafiq } from '@/lib/peopleStore'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { clearLocalMuttafiqRelationshipsForTests } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import { assignMuttafiqRuknLinkAsAdmin } from '@/services/karkunRequestService'
import { moveToKarkunRegistry, moveToMuttafiqeen } from '@/services/peopleClassificationService'
import {
  clearMuttafiqRelationshipStore,
  getActiveMuttafiqRelationshipsForPerson,
  getCurrentValidMuttafiqRelationshipsForRukn,
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

function seedRelationship(row: MuttafiqRuknRelationship): void {
  const repos = getRepositories()
  const existing = repos.muttafiqRelationship.loadAll()
  assert(existing.ok, 'load relationships')
  repos.muttafiqRelationship.saveAll([...existing.data.filter((item) => item.id !== row.id), row])
  reloadMuttafiqRelationshipStoreFromPersistence()
}

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

console.log('verify-current-muttafiq-relationship: start')

{
  const home = read('src/stores/muttafiqRelationshipStore.ts')
  assert(home.includes('getCurrentValidMuttafiqRelationshipsForRukn'), 'Home uses current-valid query')
  assert(home.includes('treatMissingPersonAsCurrent: true'), 'Home keeps unreadable Muttafiq person docs')
  assert(home.includes('isCurrentValidMuttafiqRelationship(row, getKarkunById(personId)'), 'Home uses client helper with loaded person')
  const org = read('src/lib/rukn/ruknOrganisationalInformation.ts')
  assert(org.includes('getRuknHomeMuttafiqRows(ruknId).length'), 'org count is Home list length')
  assert(!org.includes('getActiveMuttafiqRelationshipsForRukn(ruknId).length'), 'org count is not raw Active')
  const tracking = read('src/lib/publicRegistration/adminTracking.ts')
  assert(tracking.includes('isCurrentValidMuttafiqRelationship'), 'registration uses current-valid predicate')
  assert(
    tracking.includes("from '../connections/currentValidMuttafiqPredicate.js'"),
    'registration imports the serverless-safe predicate',
  )
  assert(!tracking.includes('currentMuttafiqRelationship'), 'registration does not import currentMuttafiqRelationship')
  const predicate = read('src/lib/connections/currentValidMuttafiqPredicate.ts')
  assert(!predicate.includes("from '@/"), 'shared predicate has no Vite @/ imports')
  assert(!predicate.includes('firebase'), 'shared predicate has no Firebase')
  assert(!predicate.includes('import.meta.env'), 'shared predicate has no Vite env')
  assert(!predicate.includes('mockKarkunRegistry'), 'shared predicate has no mock registry')
  assert(!predicate.includes('assignedRuknId'), 'shared predicate does not use assignedRuknId')
  assert(!predicate.includes('getConnectedKarkunsForRukn'), 'shared predicate does not use campaign helpers')
  const currentLib = read('src/lib/connections/currentMuttafiqRelationship.ts')
  assert(currentLib.includes("from './currentValidMuttafiqPredicate.js'"), 'client helper uses the shared predicate')
  assert(currentLib.includes('treatMissingPersonAsCurrent'), 'client helper keeps Home missing-person option')
  assert(!predicate.includes('treatMissingPersonAsCurrent'), 'pure predicate does not treat missing persons as current')
  const conversion = read('src/services/peopleClassificationService.ts')
  assert(conversion.includes('endActiveMuttafiqRelationshipsForPerson'), 'Muttafiq→Karkun ends relationships')
  assert(
    conversion.includes('unassignActiveCampaignConnectionsForPerson'),
    'Muttafiq→Karkun unassigns leftover campaign connections',
  )
  assert(
    conversion.includes('Does not restore or recreate Ended Muttafiq–Rukn relationships'),
    'Karkun→Muttafiq does not restore relationships',
  )
  const rules = read('firestore.rules')
  assert(rules.includes('match /muttafiqRelationships/{relationshipId}'), 'rules match unchanged path')
  assert(!predicate.includes('assignmentStore'), 'shared predicate does not read campaign connections')
  const endLib = read('src/lib/connections/endActiveMuttafiqRelationshipsForPerson.ts')
  assert(!endLib.includes('FIRESTORE_COLLECTIONS.connections'), 'conversion End does not use campaign connections')
}

resetRepositoryProviderForTests()
setJwtRoleClaimOverrideForTests(administratorJwt())
setAdministratorDecisionSessionOverrideForTests(null)
clearLocalMuttafiqRelationshipsForTests()
clearMuttafiqRelationshipStore()

const rukn = ruknMaster.find((row) => row.status === 'active' && row.gender === 'Male')
assert(rukn, 'active male rukn')

const created = createMuttafiq(
  {
    name: 'Current Valid Muttafiq',
    gender: 'Male',
    mobile: '9111888001',
    place: DEFAULT_PLACE,
    status: 'active',
  },
  'verify',
  { requireNewPersonIntake: false },
)
assert(created.success && created.karkunId, 'A fixture')
const personId = created.karkunId!

const assigned = await assignMuttafiqRuknLinkAsAdmin({
  personId,
  ruknId: rukn.id,
  establishedBy: 'Administrator',
})
assert(assigned.ok, 'A assign')
reloadMuttafiqRelationshipStoreFromPersistence()

const person = MOCK_KARKUN_REGISTRY.find((row) => row.id === personId)
assert(person, 'person in registry')
const active = getActiveMuttafiqRelationshipsForPerson(personId)
assert(active.length === 1 && active[0]!.status === 'Active', 'A relationship Active')
assert(isCurrentValidMuttafiqRelationship(active[0]!, person), 'A: Active + Muttafiq + not deleted is current')

const homeA = getRuknHomeMuttafiqRows(rukn.id)
assert(homeA.some((row) => row.counterpartId === personId), 'A on Home list')
const orgA = buildRuknOrganisationalInformation(rukn.id, { peopleReady: true, programmesReady: false })
assert(orgA.people.muttafiqeen === homeA.length, 'E: Home count == Home list length')
console.log('  OK  A current relationship + E count equals list')

{
  const endedRow = {
    ...active[0]!,
    status: 'Ended' as const,
    updatedAt: nowIso(),
  }
  assert(!isCurrentValidMuttafiqRelationship(endedRow, person), 'B: Ended is not current')
  seedRelationship(endedRow)
  assert(
    !getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === personId),
    'B Ended stays off Home',
  )
  seedRelationship({ ...endedRow, status: 'Active' })
  console.log('  OK  B Ended is not current')
}

{
  const originalArchive = { isArchived: person.isArchived, archiveKind: person.archiveKind }
  person.isArchived = true
  person.archiveKind = 'admin_delete'
  const rel = getActiveMuttafiqRelationshipsForPerson(personId)[0]!
  assert(!isCurrentValidMuttafiqRelationship(rel, person), 'C: soft-deleted is not current')
  assert(
    !getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === personId),
    'C soft-deleted off Home',
  )
  person.isArchived = originalArchive.isArchived
  person.archiveKind = originalArchive.archiveKind
  console.log('  OK  C soft-deleted is not current')
}

{
  const karkun = createKarkun(
    {
      name: 'Always Karkun',
      gender: 'Male',
      mobile: '9111888002',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(karkun.success && karkun.karkunId, 'D karkun')
  const karkunId = karkun.karkunId!
  const karkunPerson = MOCK_KARKUN_REGISTRY.find((row) => row.id === karkunId)
  assert(karkunPerson, 'D person')
  const stale: MuttafiqRuknRelationship = {
    id: muttafiqRuknRelationshipId(rukn.id, karkunId),
    ruknId: rukn.id,
    ruknName: rukn.name,
    personId: karkunId,
    personName: karkunPerson.name,
    status: 'Active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    establishedBy: 'Administrator',
  }
  seedRelationship(stale)
  assert(!isCurrentValidMuttafiqRelationship(stale, karkunPerson), 'D: current Karkun is not current Muttafiq')
  assert(
    !getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === karkunId),
    'D Karkun with stale Active relationship off Home',
  )
  console.log('  OK  D current Karkun is not current Muttafiq')
}

{
  const progress = buildTrainingRegistrationRuknProgress({
    ruknId: rukn.id,
    rukn: { id: rukn.id, name: rukn.name, status: 'active', mobile: '9000000000' },
    karkuns: [
      {
        id: personId,
        name: person.name,
        mobile: person.mobile,
        gender: person.gender,
        category: 'Muttafiq',
      },
    ],
    connections: [],
    muttafiqRelationships: [
      {
        ruknId: rukn.id,
        personId,
        personName: person.name,
        status: 'Active',
      },
    ],
    registrations: [],
  })
  assert(progress.muttafiqConnectedCount === 1, 'F: registration Muttafiq uses current-valid relationship')
  assert(progress.connectedCount === 0, 'F: Muttafiq not mixed into Karkun totals')

  const campaignOnly = buildTrainingRegistrationRuknProgress({
    ruknId: rukn.id,
    rukn: { id: rukn.id, name: rukn.name, status: 'active', mobile: '9000000000' },
    karkuns: [
      {
        id: 'kr-campaign-only-mt',
        name: 'Campaign Only Muttafiq',
        mobile: '9111888003',
        gender: 'Male',
        category: 'Muttafiq',
      },
    ],
    connections: [{ ruknId: rukn.id, karkunId: 'kr-campaign-only-mt', status: 'Active' }],
    muttafiqRelationships: [],
    registrations: [],
  })
  assert(campaignOnly.muttafiqConnectedCount === 0, 'G: campaign connection alone is not a current Muttafiq relationship')
  assert(campaignOnly.connectedCount === 0, 'G: Muttafiq campaign row is not a current Karkun')

  const missingRel: MuttafiqRuknRelationship = {
    id: muttafiqRuknRelationshipId(rukn.id, 'missing-mt-home'),
    ruknId: rukn.id,
    ruknName: rukn.name,
    personId: 'missing-mt-home',
    personName: 'Ghost Muttafiq',
    status: 'Active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    establishedBy: 'Administrator',
  }
  assert(!isCurrentValidMuttafiqRelationship(missingRel, undefined), 'default client helper: missing person is not current')
  assert(
    isCurrentValidMuttafiqRelationship(missingRel, undefined, { treatMissingPersonAsCurrent: true }),
    'Home option: missing person stays current',
  )
  assert(!sharedPredicate(missingRel, null), 'shared predicate missing person is not current')
  seedRelationship(missingRel)
  assert(
    getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === 'missing-mt-home'),
    'Home includes missing person when relationship is Active',
  )
  assert(
    !getConnectedMuttafiqDisplayRowsForRukn(rukn.id).some((row) => row.counterpartId === 'missing-mt-home'),
    'Admin display still requires a person record',
  )
  const orgMissing = buildRuknOrganisationalInformation(rukn.id, {
    peopleReady: true,
    programmesReady: false,
  })
  assert(orgMissing.people.muttafiqeen === getRuknHomeMuttafiqRows(rukn.id).length, 'Home count still equals list')
  const missingProgress = buildTrainingRegistrationRuknProgress({
    ruknId: rukn.id,
    rukn: { id: rukn.id, name: rukn.name, status: 'active', mobile: '9000000000' },
    karkuns: [],
    connections: [],
    muttafiqRelationships: [
      { ruknId: rukn.id, personId: 'missing-mt-home', personName: 'Ghost Muttafiq', status: 'Active' },
    ],
    registrations: [],
  })
  assert(missingProgress.muttafiqConnectedCount === 0, 'registration excludes missing person')

  const assignedOnlyId = 'kr-assigned-only-mt'
  const assignedOnlyProgress = buildTrainingRegistrationRuknProgress({
    ruknId: rukn.id,
    rukn: { id: rukn.id, name: rukn.name, status: 'active', mobile: '9000000000' },
    karkuns: [
      {
        id: assignedOnlyId,
        name: 'Assigned Only',
        mobile: '9111888009',
        gender: 'Male',
        category: 'Muttafiq',
      },
    ],
    connections: [],
    muttafiqRelationships: [],
    registrations: [],
  })
  assert(assignedOnlyProgress.muttafiqConnectedCount === 0, 'person metadata without a relationship is never current')
  assert(
    !getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === assignedOnlyId),
    'Home does not invent a relationship from assignedRuknId',
  )
  assert(isCurrentValidMuttafiqRelationship(active[0]!, person) === sharedPredicate(active[0]!, person), 'client re-export matches shared predicate')
  console.log('  OK  F registration + G campaign + missing person + assignedRuknId isolation')
}

{
  const storeSrc = read('src/stores/muttafiqRelationshipStore.ts')
  const currentFn = storeSrc.slice(
    storeSrc.indexOf('export function getCurrentValidMuttafiqRelationshipsForRukn'),
    storeSrc.indexOf('export function getRuknHomeMuttafiqRows'),
  )
  assert(currentFn.includes('personActives.length !== 1'), 'Home omits dual-Active people without picking a winner')
  assert(currentFn.includes('treatMissingPersonAsCurrent: true'), 'Home keeps missing-person-as-current')
  const adminFn = storeSrc.slice(
    storeSrc.indexOf('export function getActiveMuttafiqRelationshipsForRukn'),
    storeSrc.indexOf('export function getMuttafiqConnectionViewForPerson'),
  )
  assert(!adminFn.includes('personActives'), 'Admin-by-Rukn Active list does not drop dual-Active people')
  const otherRukn = ruknMaster.find((row) => row.status === 'active' && row.id !== rukn.id)
  assert(otherRukn, 'second rukn')
  const dual = createMuttafiq(
    {
      name: 'Dual Rukn Muttafiq',
      gender: 'Male',
      mobile: '9111888011',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(dual.success && dual.karkunId, 'dual person')
  const dualId = dual.karkunId!
  const dualPerson = MOCK_KARKUN_REGISTRY.find((row) => row.id === dualId)
  assert(dualPerson, 'dual in registry')
  const relA: MuttafiqRuknRelationship = {
    id: muttafiqRuknRelationshipId(rukn.id, dualId),
    ruknId: rukn.id,
    ruknName: rukn.name,
    personId: dualId,
    personName: dualPerson.name,
    status: 'Active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    establishedBy: 'Administrator',
  }
  const relB: MuttafiqRuknRelationship = {
    id: muttafiqRuknRelationshipId(otherRukn.id, dualId),
    ruknId: otherRukn.id,
    ruknName: otherRukn.name,
    personId: dualId,
    personName: dualPerson.name,
    status: 'Active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    establishedBy: 'Administrator',
  }
  seedRelationship(relA)
  seedRelationship(relB)
  assert(sharedPredicate(relA, dualPerson), 'P is current-valid for R001 regardless of R002')
  assert(sharedPredicate(relB, dualPerson), 'P is current-valid for R002 regardless of R001')
  assert(
    !getCurrentValidMuttafiqRelationshipsForRukn(rukn.id).some((row) => row.personId === dualId),
    'Home current-valid omits conflicted P on first Rukn',
  )
  assert(
    !getCurrentValidMuttafiqRelationshipsForRukn(otherRukn.id).some((row) => row.personId === dualId),
    'Home current-valid omits conflicted P on second Rukn',
  )
  assert(
    !getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === dualId),
    'first Rukn Home does not list conflicted P',
  )
  assert(
    !getRuknHomeMuttafiqRows(otherRukn.id).some((row) => row.counterpartId === dualId),
    'second Rukn Home does not list conflicted P',
  )
  const adminA = getConnectedMuttafiqDisplayRowsForRukn(rukn.id).filter((row) => row.counterpartId === dualId)
  const adminB = getConnectedMuttafiqDisplayRowsForRukn(otherRukn.id).filter((row) => row.counterpartId === dualId)
  assert(adminA.length === 1 && adminA[0]?.needsReview === true, 'Admin first Rukn keeps conflicted P as Needs review')
  assert(adminB.length === 1 && adminB[0]?.relationshipLabel === 'Needs review', 'Admin second Rukn keeps conflicted P; no winner')
  const personFields = {
    id: dualId,
    name: dualPerson.name,
    mobile: dualPerson.mobile,
    gender: dualPerson.gender,
    category: 'Muttafiq' as const,
  }
  const progressA = buildTrainingRegistrationRuknProgress({
    ruknId: rukn.id,
    rukn: { id: rukn.id, name: rukn.name, status: 'active', mobile: '9000000000' },
    karkuns: [personFields],
    connections: [],
    muttafiqRelationships: [relA, relB, relA],
    registrations: [],
  })
  const progressB = buildTrainingRegistrationRuknProgress({
    ruknId: otherRukn.id,
    rukn: { id: otherRukn.id, name: otherRukn.name, status: 'active', mobile: '9000000001' },
    karkuns: [personFields],
    connections: [],
    muttafiqRelationships: [relA, relB, relB],
    registrations: [],
  })
  assert(progressA.muttafiqConnectedCount === 1, 'registration R001 counts P once despite duplicate input and R002 row')
  assert(progressA.muttafiqeen.some((row) => row.karkunId === dualId), 'registration R001 includes P')
  assert(progressB.muttafiqConnectedCount === 1, 'registration R002 counts P once despite duplicate input and R001 row')
  assert(progressB.muttafiqeen.some((row) => row.karkunId === dualId), 'registration R002 includes P')
  console.log('  OK  dual Active omitted on Home; Admin and registration remain independent')
}

{
  const convertPerson = createMuttafiq(
    {
      name: 'Convert Then End',
      gender: 'Male',
      mobile: '9111888004',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(convertPerson.success && convertPerson.karkunId, 'H fixture')
  const convertId = convertPerson.karkunId!
  const linked = await assignMuttafiqRuknLinkAsAdmin({
    personId: convertId,
    ruknId: rukn.id,
    establishedBy: 'Administrator',
  })
  assert(linked.ok, 'H assign')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(convertId).length === 1, 'H active before conversion')

  const converted = await moveToKarkunRegistry(convertId)
  assert(converted.success, 'H convert')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(convertId).length === 0, 'H Active relationships ended')
  const repos = getRepositories()
  const all = repos.muttafiqRelationship.loadAll()
  assert(all.ok, 'H load after convert')
  const retained = all.data.find((row) => row.personId === convertId)
  assert(retained, 'H document retained')
  assert(retained.status === 'Ended', 'H status Ended')
  assert(
    !getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === convertId),
    'H converted person off Home',
  )

  const back = moveToMuttafiqeen(convertId)
  assert(back.success, 'I convert back to Muttafiq')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(convertId).length === 0, 'I does not restore Active relationship')
  const afterBack = repos.muttafiqRelationship.loadAll()
  assert(afterBack.ok, 'I load')
  const stillEnded = afterBack.data.find((row) => row.personId === convertId)
  assert(stillEnded?.status === 'Ended', 'I historical Ended remains Ended')
  assert(
    !getRuknHomeMuttafiqRows(rukn.id).some((row) => row.counterpartId === convertId),
    'I Home stays empty until a new current relationship is established',
  )
  console.log('  OK  H conversion Ends + I reverse does not restore')
}

console.log('verify-current-muttafiq-relationship: OK')
