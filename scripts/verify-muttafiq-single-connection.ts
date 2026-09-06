/**
 * Muttafiq may have exactly one active Rukn relationship.
 * Run: npx vite-node scripts/verify-muttafiq-single-connection.ts
 */
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import { setJwtRoleClaimOverrideForTests } from '@/lib/auth/ensureJwtRoleClaim'
import { inspectDuplicateActiveMuttafiqLinks } from '@/lib/connections/oneActiveRukn'
import { presentMuttafiqConnectionView } from '@/lib/connections/muttafiqConnectionView'
import { createMuttafiq } from '@/lib/peopleStore'
import { presentPerson360Profile } from '@/lib/personProfile/ProfilePresenter'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { clearLocalMuttafiqRelationshipsForTests } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import { assignMuttafiqRuknLinkAsAdmin, submitMuttafiqRuknLinkRequest } from '@/services/karkunRequestService'
import {
  clearMuttafiqRelationshipStore,
  getActiveMuttafiqRelationshipsForPerson,
  getMuttafiqConnectionViewForPerson,
  reloadMuttafiqRelationshipStoreFromPersistence,
} from '@/stores/muttafiqRelationshipStore'
import { ruknMaster } from '@/data/ruknMaster'
import { DEFAULT_PLACE } from '@/types/people.types'
import { muttafiqRuknRelationshipId } from '@/types/muttafiqRelationship.types'
import { UI_LABELS } from '@/lib/uiTerminology'

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

console.log('verify-muttafiq-single-connection: start')

resetRepositoryProviderForTests()
setJwtRoleClaimOverrideForTests(administratorJwt())
setAdministratorDecisionSessionOverrideForTests(null)
clearLocalMuttafiqRelationshipsForTests()
clearMuttafiqRelationshipStore()

const maleRukns = ruknMaster.filter((row) => row.status === 'active' && row.gender === 'Male')
assert(maleRukns.length >= 2, 'need two male Rukns')
const ruknA = maleRukns[0]!
const ruknB = maleRukns[1]!

{
  const created = createMuttafiq(
    {
      name: 'Zero Link Muttafiq',
      gender: 'Male',
      mobile: '9000008101',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'zero-link fixture')
  const personId = created.karkunId!
  reloadMuttafiqRelationshipStoreFromPersistence()
  const listView = getMuttafiqConnectionViewForPerson(personId)
  const profile = presentPerson360Profile(personId)
  assert(listView.status === 'none', '0 relationships: none')
  assert(listView.activeCount === 0, '0 relationships: count 0')
  assert(listView.connectedRuknLabel === '—', '0 relationships: list Connected Rukn is —')
  assert(listView.relationshipLabel === UI_LABELS.notConnected, '0 relationships: Not Connected')
  assert(profile.header.connectedRuknName === 'Not Connected', '0 relationships: profile Connected Rukn')
  assert(profile.header.connectedCount === 0, '0 relationships: profile count 0')
  assert(profile.responsibility.connectionStatus === UI_LABELS.notConnected, '0 relationships: profile relationship')
  console.log('  OK  0 relationships')
}

{
  const created = createMuttafiq(
    {
      name: 'One Link Muttafiq',
      gender: 'Male',
      mobile: '9000008102',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'one-link fixture')
  const personId = created.karkunId!
  const assigned = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknA.id,
    establishedBy: 'Administrator',
  })
  assert(assigned.ok, `one-link assign: ${assigned.ok ? '' : assigned.error}`)
  reloadMuttafiqRelationshipStoreFromPersistence()
  const listView = getMuttafiqConnectionViewForPerson(personId)
  const profile = presentPerson360Profile(personId)
  assert(listView.status === 'one', '1 active: one')
  assert(listView.activeCount === 1, '1 active: count 1')
  assert(listView.relationshipLabel === UI_LABELS.connected, '1 active: Connected')
  assert(listView.current?.ruknId === ruknA.id, '1 active: current rukn')
  assert(profile.header.connectedCount === 1, '1 active: profile count 1')
  assert(profile.header.connectedRuknName === listView.connectedRuknLabel, 'list/profile Connected Rukn match')
  assert(profile.responsibility.connectionStatus === listView.relationshipLabel, 'list/profile relationship match')
  assert(profile.relationshipDisplay?.row?.counterpartId === ruknA.id, '360 counterpart is the Active Rukn')
  assert(profile.relationshipDisplay?.row?.counterpartName === listView.connectedRuknLabel, '360 name matches list')
  console.log('  OK  1 active relationship + list/profile identical')
}

{
  const created = createMuttafiq(
    {
      name: 'Reject Second Muttafiq',
      gender: 'Male',
      mobile: '9000008103',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'reject-second fixture')
  const personId = created.karkunId!
  const first = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknA.id,
    establishedBy: 'Administrator',
  })
  assert(first.ok, 'first assign')
  const second = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknB.id,
    establishedBy: 'Administrator',
  })
  assert(!second.ok, 'admin second active is rejected')
  const request = await submitMuttafiqRuknLinkRequest({
    personId,
    requestingRuknId: ruknB.id,
    createdBy: 'Verify Rukn',
  })
  assert(!request.ok, 'rukn second request is rejected')
  assert(
    !request.ok && request.error.includes('already has an active Rukn relationship'),
    'rukn second request names existing active link',
  )
  reloadMuttafiqRelationshipStoreFromPersistence()
  const active = getActiveMuttafiqRelationshipsForPerson(personId)
  assert(active.length === 1, 'still one active after rejected second')
  assert(active[0]?.ruknId === ruknA.id, 'original relationship preserved')
  console.log('  OK  attempted second relationship is rejected')
}

{
  const created = createMuttafiq(
    {
      name: 'History Inactive Muttafiq',
      gender: 'Male',
      mobile: '9000008104',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'history fixture')
  const personId = created.karkunId!
  const first = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknA.id,
    establishedBy: 'Administrator',
  })
  assert(first.ok, `history first assign: ${first.ok ? '' : first.error}`)
  if (!first.ok) throw new Error(first.error)
  const now = new Date().toISOString()
  const ended = await getRepositories().muttafiqRelationship.endDurable({
    ...first.relationship,
    status: 'Ended',
    updatedAt: now,
  })
  assert(ended.ok, 'end first relationship as history')
  reloadMuttafiqRelationshipStoreFromPersistence()
  const afterEnd = getMuttafiqConnectionViewForPerson(personId)
  assert(afterEnd.activeCount === 0, 'ended relationship does not count as active')
  assert(afterEnd.relationshipLabel === UI_LABELS.notConnected, 'ended is Not Connected')
  const allRows = getRepositories().muttafiqRelationship.loadAll()
  assert(allRows.ok && allRows.data.some((row) => row.personId === personId && row.status === 'Ended'), 'history row retained')
  const second = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: ruknB.id,
    establishedBy: 'Administrator',
  })
  assert(second.ok, `reconnect after history: ${second.ok ? '' : second.error}`)
  reloadMuttafiqRelationshipStoreFromPersistence()
  const view = getMuttafiqConnectionViewForPerson(personId)
  assert(view.activeCount === 1, 'reconnect has one active')
  assert(view.current?.ruknId === ruknB.id, 'reconnect current is new Rukn')
  const retained = getRepositories().muttafiqRelationship.loadAll()
  assert(
    retained.ok && retained.data.some((row) => row.personId === personId && row.ruknId === ruknA.id && row.status === 'Ended'),
    'previous Ended history still present',
  )
  console.log('  OK  historical/inactive relationship does not count as active')
}

{
  const created = createMuttafiq(
    {
      name: 'Duplicate Report Muttafiq',
      gender: 'Male',
      mobile: '9000008105',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'duplicate fixture')
  const personId = created.karkunId!
  const now = new Date().toISOString()
  const seeded = getRepositories().muttafiqRelationship.saveAll([
    {
      id: muttafiqRuknRelationshipId(ruknA.id, personId),
      ruknId: ruknA.id,
      ruknName: ruknA.name,
      personId,
      personName: 'Duplicate Report Muttafiq',
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
      personName: 'Duplicate Report Muttafiq',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'seed',
    },
  ])
  assert(seeded.ok, 'seed duplicates without deleting')
  reloadMuttafiqRelationshipStoreFromPersistence()
  const reports = inspectDuplicateActiveMuttafiqLinks()
  assert(reports.some((row) => row.personId === personId && row.activeCount === 2), 'duplicates identified')
  const view = presentMuttafiqConnectionView({
    activeLinks: getActiveMuttafiqRelationshipsForPerson(personId),
  })
  assert(view.status === 'duplicate', 'display reports duplicate')
  assert(view.activeCount === 2, 'duplicate count is truthful')
  const third = ruknMaster.find((row) => row.status === 'active' && row.gender === 'Male' && row.id !== ruknA.id && row.id !== ruknB.id)
  if (third) {
    const rejected = await assignMuttafiqRuknLinkAsAdmin({
      personId,
      ruknId: third.id,
      establishedBy: 'Administrator',
    })
    assert(!rejected.ok, 'new connection rejected while duplicates exist')
  }
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getActiveMuttafiqRelationshipsForPerson(personId).length === 2, 'existing duplicates were not deleted')
  console.log('  OK  existing duplicates identified and retained')
}

setJwtRoleClaimOverrideForTests(null)
setAdministratorDecisionSessionOverrideForTests(null)
console.log('verify-muttafiq-single-connection: OK')
