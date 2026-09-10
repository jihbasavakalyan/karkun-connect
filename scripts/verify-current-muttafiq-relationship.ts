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
  const org = read('src/lib/rukn/ruknOrganisationalInformation.ts')
  assert(org.includes('getRuknHomeMuttafiqRows(ruknId).length'), 'org count is Home list length')
  assert(!org.includes('getActiveMuttafiqRelationshipsForRukn(ruknId).length'), 'org count is not raw Active')
  const tracking = read('src/lib/publicRegistration/adminTracking.ts')
  assert(tracking.includes('isCurrentValidMuttafiqRelationship'), 'registration uses current-valid predicate')
  const conversion = read('src/services/peopleClassificationService.ts')
  assert(conversion.includes('endActiveMuttafiqRelationshipsForPerson'), 'Muttafiq→Karkun ends relationships')
  assert(
    conversion.includes('Does not restore or recreate Ended Muttafiq–Rukn relationships'),
    'Karkun→Muttafiq does not restore relationships',
  )
  const rules = read('firestore.rules')
  assert(rules.includes('match /muttafiqRelationships/{relationshipId}'), 'rules match unchanged path')
  const currentLib = read('src/lib/connections/currentMuttafiqRelationship.ts')
  assert(!currentLib.includes('assignmentStore'), 'current-valid predicate does not read campaign connections')
  assert(!currentLib.includes('getConnectedKarkunsForRukn'), 'current-valid predicate does not infer from campaign helpers')
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
  console.log('  OK  F registration + G campaign isolation')
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
