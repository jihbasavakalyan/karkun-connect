/**
 * Bidirectional Muttafiq ↔ Rukn display (count and names from muttafiqRelationships).
 * Run: npx vite-node scripts/verify-muttafiq-bidirectional-display.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import { setJwtRoleClaimOverrideForTests } from '@/lib/auth/ensureJwtRoleClaim'
import { presentMuttafiqConnectionView } from '@/lib/connections/muttafiqConnectionView'
import {
  MUTTAFIQ_PERSON_NOT_FOUND_LABEL,
  MUTTAFIQ_RUKN_NOT_FOUND_LABEL,
  presentConnectedMuttafiqRow,
  presentConnectedRuknRow,
} from '@/lib/connections/muttafiqRelationshipDisplay'
import { isARuknId } from '@/lib/officerIdentity'
import { createMuttafiq } from '@/lib/peopleStore'
import { presentPerson360Profile } from '@/lib/personProfile/ProfilePresenter'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { clearLocalMuttafiqRelationshipsForTests } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import { assignMuttafiqRuknLinkAsAdmin } from '@/services/karkunRequestService'
import {
  clearMuttafiqRelationshipStore,
  getConnectedMuttafiqDisplayRowsForRukn,
  getMuttafiqConnectedRuknDisplayForPerson,
  reloadMuttafiqRelationshipStoreFromPersistence,
} from '@/stores/muttafiqRelationshipStore'
import { ruknMaster } from '@/data/ruknMaster'
import { DEFAULT_PLACE } from '@/types/people.types'
import { muttafiqRuknRelationshipId } from '@/types/muttafiqRelationship.types'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import { UI_LABELS } from '@/lib/uiTerminology'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
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

console.log('verify-muttafiq-bidirectional-display: start')

{
  const ruknDetail = read('src/pages/admin/RuknDetailPage.tsx')
  assert(ruknDetail.includes('getConnectedMuttafiqDisplayRowsForRukn'), 'Rukn detail uses display rows')
  assert(ruknDetail.includes('MuttafiqRuknConnectionRow'), 'Rukn detail renders counterpart row')
  assert(ruknDetail.includes('ConnectedAssignmentDeskCard'), 'Karkun assignment cards unchanged')
  assert(!ruknDetail.includes('getActiveAssignmentsForKarkun'), 'Muttafiq rows are not campaign assignments')

  const rowUi = read('src/components/relationship/MuttafiqRuknConnectionRow.tsx')
  assert(rowUi.includes('bg-amber-500/20'), 'Muttafiq row amber background')
  assert(rowUi.includes('bg-primary/15'), 'Rukn relationship row primary background')
  assert(rowUi.includes('View'), 'View action present')

  const profilePage = read('src/pages/admin/KarkunProfilePage.tsx')
  assert(profilePage.includes('getMuttafiqConnectedRuknDisplayForPerson'), 'Muttafiq profile uses display projection')
  assert(profilePage.includes('MuttafiqRuknConnectionRow'), 'Muttafiq profile renders counterpart row')

  const overview = read('src/components/personProfile/Person360Overview.tsx')
  assert(overview.includes('relationshipDisplay'), '360 profile shows relationship display')
  assert(!overview.includes('getActiveAssignmentsForKarkun'), '360 Muttafiq row is not campaign-sourced')

  const presenter = read('src/lib/personProfile/ProfilePresenter.ts')
  assert(presenter.includes('getMuttafiqConnectedRuknDisplayForPerson'), 'presenter uses relationship display')
  console.log('  OK  static UI wiring')
}

resetRepositoryProviderForTests()
setJwtRoleClaimOverrideForTests(administratorJwt())
setAdministratorDecisionSessionOverrideForTests(null)
clearLocalMuttafiqRelationshipsForTests()
clearMuttafiqRelationshipStore()

const maleRukns = ruknMaster.filter((row) => row.status === 'active' && row.gender === 'Male')
assert(maleRukns.length >= 2, 'need two male Rukns')
const ruknA = maleRukns[0]!
const ruknB = maleRukns[1]!
const aRukn =
  ruknMaster.find((row) => row.status === 'active' && isARuknId(row.id)) ??
  ruknMaster.find((row) => isARuknId(row.id))

{
  const created = createMuttafiq(
    {
      name: 'Tause Ahmed',
      gender: 'Male',
      mobile: '9000008201',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST A fixture')
  const personId = created.karkunId!
  const assigned = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknA.id,
    establishedBy: 'Administrator',
  })
  assert(assigned.ok, `TEST A assign: ${assigned.ok ? '' : assigned.error}`)
  reloadMuttafiqRelationshipStoreFromPersistence()
  const rows = getConnectedMuttafiqDisplayRowsForRukn(ruknA.id)
  const person = getKarkunById(personId)
  const expectedName = formatPersonNameForDisplay(person?.name || 'Tause Ahmed')
  const match = rows.find((row) => row.counterpartId === personId)
  assert(match, 'TEST A: Muttafiq row present for Rukn')
  assert(rows.filter((row) => row.counterpartId === personId).length === 1, 'TEST A: exactly one row for this Muttafiq')
  assert(match.counterpartName === expectedName, `TEST A: Muttafiq name displayed (${match.counterpartName})`)
  assert(match.categoryLabel === 'Muttafiq', 'TEST A: Muttafiq category')
  assert(match.statusLabel === 'Active', 'TEST A: Active status')
  assert(match.visual === 'muttafiq', 'TEST A: Muttafiq styling token')
  assert(match.counterpartIdentifier.length > 0, 'TEST A: identifier present')
  console.log('  OK  TEST A Rukn → Muttafiq')
}

{
  const created = createMuttafiq(
    {
      name: 'Kr131 Display',
      gender: 'Male',
      mobile: '9000008202',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST B fixture')
  const personId = created.karkunId!
  const now = new Date().toISOString()
  const seeded = getRepositories().muttafiqRelationship.saveAll([
    {
      id: muttafiqRuknRelationshipId(ruknA.id, personId),
      ruknId: ruknA.id,
      ruknName: '',
      personId,
      personName: 'Kr131 Display',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'seed',
    },
  ])
  assert(seeded.ok, 'TEST B seed with empty stored ruknName')
  reloadMuttafiqRelationshipStoreFromPersistence()
  const display = getMuttafiqConnectedRuknDisplayForPerson(personId)
  const profile = presentPerson360Profile(personId)
  const expectedRuknName = formatPersonNameForDisplay(ruknA.name)
  assert(display.view.status === 'one', 'TEST B: one active')
  assert(display.view.activeCount === 1, 'TEST B: count 1')
  assert(display.row, 'TEST B: Rukn row present')
  assert(display.row.counterpartId === ruknA.id, 'TEST B: identifier is live Rukn id')
  assert(display.row.counterpartName === expectedRuknName, 'TEST B: live Rukn name despite empty snapshot')
  assert(display.row.categoryLabel === 'Rukn' || display.row.categoryLabel === UI_LABELS.aRukn, 'TEST B: officer category')
  assert(display.row.statusLabel === 'Active', 'TEST B: Active')
  assert(display.row.visual === 'rukn', 'TEST B: Rukn relationship styling token')
  assert(profile.header.connectedRuknName === display.row.counterpartName, 'TEST B: header name matches row')
  assert(profile.relationshipDisplay?.row?.counterpartName === display.row.counterpartName, 'TEST B: 360 row matches')
  assert(profile.header.connectedCount === 1, 'TEST B: profile count 1')
  console.log('  OK  TEST B Muttafiq → Rukn (live name)')
}

if (aRukn) {
  const created = createMuttafiq(
    {
      name: 'A Rukn Counterpart',
      gender: 'Male',
      mobile: '9000008203',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'A Rukn fixture')
  const personId = created.karkunId!
  const assigned = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: aRukn.id,
    establishedBy: 'Administrator',
  })
  assert(assigned.ok, `A Rukn assign: ${assigned.ok ? '' : assigned.error}`)
  reloadMuttafiqRelationshipStoreFromPersistence()
  const display = getMuttafiqConnectedRuknDisplayForPerson(personId)
  assert(display.row?.counterpartId === aRukn.id, 'A Rukn id displayed')
  assert(display.row?.counterpartName === formatPersonNameForDisplay(aRukn.name), 'A Rukn name displayed')
  assert(display.row?.categoryLabel === UI_LABELS.aRukn, 'A Rukn category from officer identity')
  console.log('  OK  A Rukn counterpart resolves')
} else {
  const synthetic = presentConnectedRuknRow({
    id: 'mr_AR05_kr-synthetic',
    ruknId: 'AR05',
    ruknName: 'Synthetic A Rukn',
    personId: 'kr-synthetic',
    personName: 'Synthetic',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    establishedBy: 'seed',
  })
  assert(synthetic.categoryLabel === UI_LABELS.aRukn, 'AR## id maps to A Rukn category')
  console.log('  OK  A Rukn category from AR id (no seeded A Rukn officer)')
}

{
  const created = createMuttafiq(
    {
      name: 'History Display Muttafiq',
      gender: 'Male',
      mobile: '9000008204',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST C fixture')
  const personId = created.karkunId!
  const now = new Date().toISOString()
  const seeded = getRepositories().muttafiqRelationship.saveAll([
    {
      id: muttafiqRuknRelationshipId(ruknA.id, personId),
      ruknId: ruknA.id,
      ruknName: ruknA.name,
      personId,
      personName: 'History Display Muttafiq',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'seed',
    },
    {
      id: muttafiqRuknRelationshipId(ruknB.id, personId),
      ruknId: ruknB.id,
      ruknName: ruknB.name,
      personId,
      personName: 'History Display Muttafiq',
      status: 'Ended',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'seed',
    },
  ])
  assert(seeded.ok, 'TEST C seed active + ended')
  reloadMuttafiqRelationshipStoreFromPersistence()
  const display = getMuttafiqConnectedRuknDisplayForPerson(personId)
  const ruknARows = getConnectedMuttafiqDisplayRowsForRukn(ruknA.id)
  const ruknBRows = getConnectedMuttafiqDisplayRowsForRukn(ruknB.id)
  assert(display.view.current?.ruknId === ruknA.id, 'TEST C: current is active Rukn')
  assert(display.row?.counterpartId === ruknA.id, 'TEST C: displayed current is active')
  assert(
    ruknARows.some((row) => row.counterpartId === personId),
    'TEST C: active Rukn lists Muttafiq',
  )
  assert(
    ruknBRows.every((row) => row.counterpartId !== personId),
    'TEST C: ended Rukn does not list Muttafiq as current',
  )
  const retained = getRepositories().muttafiqRelationship.loadAll()
  assert(
    retained.ok && retained.data.some((row) => row.personId === personId && row.ruknId === ruknB.id && row.status === 'Ended'),
    'TEST C: ended history retained',
  )
  console.log('  OK  TEST C historical excluded from current')
}

{
  const created = createMuttafiq(
    {
      name: 'Unassigned Display Muttafiq',
      gender: 'Male',
      mobile: '9000008205',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST D fixture')
  const personId = created.karkunId!
  reloadMuttafiqRelationshipStoreFromPersistence()
  const display = getMuttafiqConnectedRuknDisplayForPerson(personId)
  const profile = presentPerson360Profile(personId)
  assert(display.view.status === 'none', 'TEST D: none')
  assert(display.row === null, 'TEST D: no current counterpart row')
  assert(profile.header.connectedRuknName === 'Not Connected', 'TEST D: unassigned header')
  assert(profile.relationshipDisplay?.row == null, 'TEST D: 360 has no current row')
  console.log('  OK  TEST D no active relationship')
}

{
  const created = createMuttafiq(
    {
      name: 'Duplicate Display Muttafiq',
      gender: 'Male',
      mobile: '9000008206',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST E fixture')
  const personId = created.karkunId!
  const now = new Date().toISOString()
  const seeded = getRepositories().muttafiqRelationship.saveAll([
    {
      id: muttafiqRuknRelationshipId(ruknA.id, personId),
      ruknId: ruknA.id,
      ruknName: ruknA.name,
      personId,
      personName: 'Duplicate Display Muttafiq',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'seed',
    },
    {
      id: muttafiqRuknRelationshipId(ruknB.id, personId),
      ruknId: ruknB.id,
      ruknName: ruknB.name,
      personId,
      personName: 'Duplicate Display Muttafiq',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'seed',
    },
  ])
  assert(seeded.ok, 'TEST E seed duplicates')
  reloadMuttafiqRelationshipStoreFromPersistence()
  const view = presentMuttafiqConnectionView({
    activeLinks: getRepositories().muttafiqRelationship.loadAll().ok
      ? getRepositories().muttafiqRelationship.loadAll().data.filter((row) => row.personId === personId && row.status === 'Active')
      : [],
  })
  const display = getMuttafiqConnectedRuknDisplayForPerson(personId)
  const profile = presentPerson360Profile(personId)
  assert(view.status === 'duplicate', 'TEST E: view is duplicate')
  assert(display.row === null, 'TEST E: does not silently choose a Rukn row')
  assert(display.view.connectedRuknLabel === 'Needs review', 'TEST E: needs review label')
  assert(display.view.diagnosticRuknIds.includes(ruknA.id), 'TEST E: diagnostic includes first')
  assert(display.view.diagnosticRuknIds.includes(ruknB.id), 'TEST E: diagnostic includes second')
  assert(profile.header.connectedRuknName === 'Needs review', 'TEST E: profile does not pick a name')
  assert(getConnectedMuttafiqDisplayRowsForRukn(ruknA.id).every((row) => row.counterpartId !== personId), 'TEST E: exclusive Rukn list omits duplicate person')
  console.log('  OK  TEST E duplicate Active is visible, not guessed')
}

{
  const missingPerson = presentConnectedMuttafiqRow({
    id: 'mr_R999_kr-missing',
    ruknId: ruknA.id,
    ruknName: ruknA.name,
    personId: 'kr-missing-display',
    personName: '',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    establishedBy: 'seed',
  })
  assert(missingPerson.missing, 'missing Muttafiq flagged')
  assert(missingPerson.counterpartName === MUTTAFIQ_PERSON_NOT_FOUND_LABEL, 'no fabricated Muttafiq name')
  const missingRukn = presentConnectedRuknRow({
    id: 'mr_R404_kr-x',
    ruknId: 'R404',
    ruknName: '',
    personId: 'kr-x',
    personName: 'X',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    establishedBy: 'seed',
  })
  assert(missingRukn.missing, 'missing Rukn flagged')
  assert(missingRukn.counterpartName === MUTTAFIQ_RUKN_NOT_FOUND_LABEL, 'no fabricated Rukn name')
  console.log('  OK  missing counterpart handling')
}

setJwtRoleClaimOverrideForTests(null)
setAdministratorDecisionSessionOverrideForTests(null)
console.log('verify-muttafiq-bidirectional-display: OK')
