/**
 * Admin person deletion is allowed regardless of connections/history.
 * Run: npx vite-node scripts/verify-admin-person-delete.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY, getKarkunById } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import {
  ADMINISTRATOR_REQUIRED_ERROR,
  setAdministratorDecisionSessionOverrideForTests,
} from '@/lib/auth/assertAdministratorDecisionSession'
import { setJwtRoleClaimOverrideForTests } from '@/lib/auth/ensureJwtRoleClaim'
import { assignKarkun } from '@/lib/assignmentEngine'
import { isSoftRemoved } from '@/lib/peopleClassification'
import { createKarkun, createMuttafiq, persistKarkunDurable } from '@/lib/peopleStore'
import { moveToMuttafiqeen } from '@/services/peopleClassificationService'
import {
  deleteKarkunSafely,
  getKarkunDeleteBlockers,
  getKarkunDeleteWarnings,
} from '@/services/registryMaintenanceService'
import { assignMuttafiqRuknLinkAsAdmin } from '@/services/karkunRequestService'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { clearLocalMuttafiqRelationshipsForTests } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import {
  clearMuttafiqRelationshipStore,
  reloadMuttafiqRelationshipStoreFromPersistence,
} from '@/stores/muttafiqRelationshipStore'
import { DEFAULT_PLACE } from '@/types/people.types'
import { muttafiqRuknRelationshipId } from '@/types/muttafiqRelationship.types'

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

function maleRukn() {
  const rukn = ruknMaster.find((row) => row.status === 'active' && row.gender === 'Male')
  assert(rukn, 'need a male Rukn fixture')
  return rukn
}

console.log('verify-admin-person-delete: start')

{
  const panel = read('src/components/admin/RegistryMaintenancePanel.tsx')
  assert(panel.includes('confirmDeleteOpen'), 'TEST H: confirmation state')
  assert(panel.includes('Delete Person?'), 'TEST H: confirmation title')
  assert(panel.includes('Delete Permanently'), 'TEST H: confirm label')
  assert(panel.includes('getKarkunDeleteWarnings'), 'warnings are informational')
  assert(!panel.includes('Allowed only with no connection and no campaign history'), 'old copy removed')
  assert(!panel.includes('cannot be deleted'), 'old blocker copy removed from panel')
  assert(panel.includes('await persistKarkunDurable'), 'TEST I: durable persist before success')
  assert(panel.includes('await mutate()'), 'TEST I: delete result awaited')
  const profile = read('src/pages/admin/KarkunProfilePage.tsx')
  assert(profile.includes('RegistryMaintenancePanel'), 'delete UI is Admin person profile')
  const rules = read('firestore.rules')
  const karkuns = rules.slice(rules.indexOf('match /karkuns/{karkunId}'))
  assert(karkuns.includes('allow delete: if false;'), 'hard delete remains denied')
  assert(karkuns.includes('isAdministrator()'), 'Admin still required for karkun updates')
  console.log('  OK  static confirmation / auth / old copy')
}

resetRepositoryProviderForTests()
setJwtRoleClaimOverrideForTests(administratorJwt())
setAdministratorDecisionSessionOverrideForTests({ ok: true })
clearLocalMuttafiqRelationshipsForTests()
clearMuttafiqRelationshipStore()

const rukn = maleRukn()

{
  const created = createKarkun(
    {
      name: 'Delete Active Connection',
      gender: 'Male',
      mobile: '9000008301',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST A fixture')
  const personId = created.karkunId!
  const assigned = await assignKarkun(personId, rukn.id, 'Administrator')
  assert(assigned.success, `TEST A assign: ${assigned.success ? '' : assigned.error}`)
  assert(getKarkunDeleteBlockers(personId).length === 0, 'TEST A: eligibility ALLOWED')
  assert(
    getKarkunDeleteWarnings(personId).some((row) => row.includes('Active connections')),
    'TEST A: connection is a warning',
  )
  const deleted = await deleteKarkunSafely(personId, 'Admin delete with active connection', 'Administrator')
  assert(deleted.success, `TEST A delete: ${deleted.success ? '' : deleted.error}`)
  const person = getKarkunById(personId)
  assert(person && isSoftRemoved(person) && person.archiveKind === 'admin_delete', 'TEST A: soft-removed')
  console.log('  OK  TEST A active connection')
}

{
  const created = createKarkun(
    {
      name: 'Delete Campaign History',
      gender: 'Male',
      mobile: '9000008302',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST B fixture')
  const personId = created.karkunId!
  const person = MOCK_KARKUN_REGISTRY.find((row) => row.id === personId)
  assert(person, 'TEST B person')
  person.lastVisit = '2026-09-01'
  assert(getKarkunDeleteBlockers(personId).length === 0, 'TEST B: eligibility ALLOWED')
  assert(
    getKarkunDeleteWarnings(personId).some((row) => row.includes('Historical records')),
    'TEST B: history is a warning',
  )
  const deleted = await deleteKarkunSafely(personId, 'Admin delete with campaign history', 'Administrator')
  assert(deleted.success, `TEST B delete: ${deleted.success ? '' : deleted.error}`)
  console.log('  OK  TEST B campaign/visit history')
}

{
  const created = createKarkun(
    {
      name: 'Delete Classification History',
      gender: 'Male',
      mobile: '9000008303',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST C fixture')
  const personId = created.karkunId!
  const moved = moveToMuttafiqeen(personId, 'Administrator', 'classification history fixture')
  assert(moved.success, `TEST C move: ${moved.success ? '' : moved.error}`)
  assert(getKarkunDeleteBlockers(personId).length === 0, 'TEST C: eligibility ALLOWED')
  assert(
    getKarkunDeleteWarnings(personId).some((row) => row.includes('Classification history')),
    'TEST C: classification is a warning',
  )
  const deleted = await deleteKarkunSafely(personId, 'Admin delete with classification history', 'Administrator')
  assert(deleted.success, `TEST C delete: ${deleted.success ? '' : deleted.error}`)
  console.log('  OK  TEST C classification history')
}

{
  const created = createMuttafiq(
    {
      name: 'Delete Active Muttafiq Link',
      gender: 'Male',
      mobile: '9000008304',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST D fixture')
  const personId = created.karkunId!
  const assigned = await assignMuttafiqRuknLinkAsAdmin({
    personId,
    ruknId: rukn.id,
    establishedBy: 'Administrator',
  })
  assert(assigned.ok, `TEST D assign: ${assigned.ok ? '' : assigned.error}`)
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getKarkunDeleteBlockers(personId).length === 0, 'TEST D: eligibility ALLOWED')
  assert(
    getKarkunDeleteWarnings(personId).some((row) => row.includes('Muttafiq')),
    'TEST D: Muttafiq relationship is a warning',
  )
  const deleted = await deleteKarkunSafely(personId, 'Admin delete with active Muttafiq link', 'Administrator')
  assert(deleted.success, `TEST D delete: ${deleted.success ? '' : deleted.error}`)
  console.log('  OK  TEST D active Muttafiq relationship')
}

{
  const created = createMuttafiq(
    {
      name: 'Delete Ended History',
      gender: 'Male',
      mobile: '9000008305',
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
      id: muttafiqRuknRelationshipId(rukn.id, personId),
      ruknId: rukn.id,
      ruknName: rukn.name,
      personId,
      personName: 'Delete Ended History',
      status: 'Ended',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'seed',
    },
  ])
  assert(seeded.ok, 'TEST E seed ended')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(getKarkunDeleteBlockers(personId).length === 0, 'TEST E: eligibility ALLOWED')
  const deleted = await deleteKarkunSafely(personId, 'Admin delete with ended history', 'Administrator')
  assert(deleted.success, `TEST E delete: ${deleted.success ? '' : deleted.error}`)
  console.log('  OK  TEST E ended history')
}

{
  const created = createKarkun(
    {
      name: 'Delete No History',
      gender: 'Male',
      mobile: '9000008306',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST F fixture')
  const personId = created.karkunId!
  assert(getKarkunDeleteBlockers(personId).length === 0, 'TEST F: eligibility ALLOWED')
  const deleted = await deleteKarkunSafely(personId, 'Admin delete with no history', 'Administrator')
  assert(deleted.success, `TEST F delete: ${deleted.success ? '' : deleted.error}`)
  const durable = await persistKarkunDurable(personId)
  assert(durable.success, `TEST I persist: ${durable.success ? '' : durable.error}`)
  const person = getKarkunById(personId)
  assert(person && isSoftRemoved(person), 'TEST F/I: removed after persist')
  console.log('  OK  TEST F no history + TEST I persist')
}

{
  const created = createKarkun(
    {
      name: 'Delete Non Admin',
      gender: 'Male',
      mobile: '9000008307',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'TEST G fixture')
  const personId = created.karkunId!
  setAdministratorDecisionSessionOverrideForTests({
    ok: false,
    error: ADMINISTRATOR_REQUIRED_ERROR,
  })
  const denied = await deleteKarkunSafely(personId, 'should fail', 'Rukn')
  assert(!denied.success, 'TEST G: non-Admin denied')
  assert(denied.error === ADMINISTRATOR_REQUIRED_ERROR, 'TEST G: admin required error')
  const person = getKarkunById(personId)
  assert(person && !isSoftRemoved(person), 'TEST G: person not deleted')
  setAdministratorDecisionSessionOverrideForTests({ ok: true })
  console.log('  OK  TEST G non-Admin denied')
}

setJwtRoleClaimOverrideForTests(null)
setAdministratorDecisionSessionOverrideForTests(null)
console.log('verify-admin-person-delete: OK')
