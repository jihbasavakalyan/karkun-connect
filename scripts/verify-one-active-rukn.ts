/**
 * One person = one active Rukn (assignments + Muttafiq links) and A Rukn delete choices.
 * Run: npx vite-node scripts/verify-one-active-rukn.ts
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import {
  inspectDuplicateActiveAssignments,
  inspectDuplicateActiveMuttafiqLinks,
  pickUniqueNewestActive,
} from '@/lib/connections/oneActiveRukn'
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import { setJwtRoleClaimOverrideForTests } from '@/lib/auth/ensureJwtRoleClaim'
import { isKarkun, isUnavailableAsNormalKarkun } from '@/lib/peopleClassification'
import { createMuttafiq, getAllKarkuns } from '@/lib/peopleStore'
import { listActiveARuknOfficers } from '@/lib/aRuknRegistry'
import { assignKarkun, changeKarkunRuknAssignment, getCurrentAssignmentForKarkun } from '@/lib/assignmentEngine'
import { executeARuknDelete } from '@/services/archiveService'
import { promoteKarkunToARukn } from '@/services/aRuknPromotionService'
import { assignMuttafiqRuknLinkAsAdmin } from '@/services/karkunRequestService'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { clearLocalMuttafiqRelationshipsForTests } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import {
  appendAssignment,
  clearAssignmentStore,
  getActiveAssignmentsForKarkun,
  getAssignmentHistoryForKarkun,
} from '@/stores/assignmentStore'
import {
  clearMuttafiqRelationshipStore,
  getActiveMuttafiqRelationshipsForPerson,
  getActiveMuttafiqRelationshipsForRukn,
  reloadMuttafiqRelationshipStoreFromPersistence,
} from '@/stores/muttafiqRelationshipStore'
import { DEFAULT_PLACE } from '@/types/people.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

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

function seedKarkun(id: string, name: string, mobile: string): KarkunRegistryRecord {
  const now = new Date().toISOString()
  return {
    id,
    name,
    gender: 'Male',
    mobile,
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
    category: 'Karkun',
  }
}

console.log('verify-one-active-rukn: start')

{
  const ambiguous = pickUniqueNewestActive([
    { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ])
  assert(ambiguous.status === 'ambiguous', 'equal timestamps are not guessed')
  const newest = pickUniqueNewestActive([
    { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
  ])
  assert(newest.status === 'one', 'unique newest is selected')
}

resetRepositoryProviderForTests()
setJwtRoleClaimOverrideForTests(administratorJwt())
setAdministratorDecisionSessionOverrideForTests(null)
clearAssignmentStore()
clearLocalMuttafiqRelationshipsForTests()
clearMuttafiqRelationshipStore()

const maleRukns = ruknMaster.filter((row) => row.status === 'active' && row.gender === 'Male')
assert(maleRukns.length >= 2, 'need two male Rukns')
const ruknA = maleRukns[0]!.id
const ruknB = maleRukns[1]!.id

{
  const karkun = seedKarkun('kr-one-active-1', 'One Active', '9000007001')
  MOCK_KARKUN_REGISTRY.push(karkun)
  const first = await assignKarkun(karkun.id, ruknA, 'Administrator')
  assert(first.success, `first assign failed: ${first.success ? '' : first.error}`)
  const second = await assignKarkun(karkun.id, ruknB, 'Administrator')
  assert(second.success, `reconnect failed: ${second.success ? '' : second.error}`)
  const active = getActiveAssignmentsForKarkun(karkun.id)
  assert(active.length === 1, 'new connection leaves exactly one active assignment')
  assert(active[0]?.ruknId === ruknB, 'new connection is the current Rukn')
  const history = getAssignmentHistoryForKarkun(karkun.id)
  assert(
    history.some((row) => row.ruknId === ruknA && row.status !== 'Active'),
    'previous assignment remains in history',
  )
  assert(inspectDuplicateActiveAssignments().every((row) => row.personId !== karkun.id), 'no duplicate report')
  assert(getCurrentAssignmentForKarkun(karkun.id)?.ruknId === ruknB, 'profile current matches new connection')
  assert(
    getRuknAssignmentSummary(ruknA).activeAssignments.every((row) => row.karkunId !== karkun.id),
    'previous Rukn count excludes reconnected person',
  )
  assert(
    getRuknAssignmentSummary(ruknB).activeAssignments.some((row) => row.karkunId === karkun.id),
    'current Rukn list includes person',
  )
}

{
  const karkun = seedKarkun('kr-one-active-2', 'Transfer Active', '9000007002')
  MOCK_KARKUN_REGISTRY.push(karkun)
  const first = await assignKarkun(karkun.id, ruknA, 'Administrator')
  assert(first.success, 'transfer fixture assign')
  const transferred = await changeKarkunRuknAssignment(karkun.id, ruknB, 'Administrator', {
    removalReason: 'Transferred',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  })
  assert(transferred.success, `transfer failed: ${transferred.success ? '' : transferred.error}`)
  const active = getActiveAssignmentsForKarkun(karkun.id)
  assert(active.length === 1, 'transfer leaves exactly one active assignment')
  assert(active[0]?.ruknId === ruknB, 'transfer current Rukn')
  assert(
    getAssignmentHistoryForKarkun(karkun.id).some((row) => row.ruknId === ruknA),
    'transfer history preserved',
  )
  assert(getCurrentAssignmentForKarkun(karkun.id)?.ruknId === ruknB, 'transfer profile current')
  assert(
    getRuknAssignmentSummary(ruknA).activeAssignments.every((row) => row.karkunId !== karkun.id),
    'transfer previous Rukn excludes person',
  )
  assert(
    getRuknAssignmentSummary(ruknB).activeAssignments.some((row) => row.karkunId === karkun.id),
    'transfer current Rukn includes person',
  )
}

{
  const now = new Date().toISOString()
  const karkun = seedKarkun('kr-one-active-3', 'Ambiguous Dup', '9000007003')
  MOCK_KARKUN_REGISTRY.push(karkun)
  await appendAssignment({
    assignmentId: 'asgn-amb-a',
    assignmentNumber: 'ASN-AMB-A',
    ruknId: ruknA,
    karkunId: karkun.id,
    assignedDate: now.slice(0, 10),
    effectiveFrom: now.slice(0, 10),
    status: 'Active',
    assignedBy: 'Administrator',
    createdAt: now,
    updatedAt: now,
  })
  let rejected = false
  try {
    await appendAssignment({
      assignmentId: 'asgn-amb-b',
      assignmentNumber: 'ASN-AMB-B',
      ruknId: ruknB,
      karkunId: karkun.id,
      assignedDate: now.slice(0, 10),
      effectiveFrom: now.slice(0, 10),
      status: 'Active',
      assignedBy: 'Administrator',
      createdAt: now,
      updatedAt: now,
    })
  } catch {
    rejected = true
  }
  assert(rejected, 'store still rejects a second Active append')
  assert(!getCurrentAssignmentForKarkun(karkun.id) || getActiveAssignmentsForKarkun(karkun.id).length === 1, 'no guessed current when store-defended')
}

{
  const female = ruknMaster.filter((row) => row.status === 'active' && row.gender === 'Female')
  assert(female.length >= 2, 'need two female Rukns')
  const created = createMuttafiq(
    {
      name: 'Link Person',
      gender: 'Female',
      mobile: '9000007004',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Verification',
    { requireNewPersonIntake: false },
  )
  assert(created.success && created.karkunId, 'muttafiq fixture')
  const first = await assignMuttafiqRuknLinkAsAdmin({
    personId: created.karkunId!,
    ruknId: female[0]!.id,
    establishedBy: 'Administrator',
  })
  assert(first.ok, `first muttafiq link failed: ${first.ok ? '' : first.error}`)
  const second = await assignMuttafiqRuknLinkAsAdmin({
    personId: created.karkunId!,
    ruknId: female[1]!.id,
    establishedBy: 'Administrator',
  })
  assert(!second.ok, 'second muttafiq active relationship is rejected')
  reloadMuttafiqRelationshipStoreFromPersistence()
  const active = getActiveMuttafiqRelationshipsForPerson(created.karkunId!)
  assert(active.length === 1, 'muttafiq person keeps exactly one active Rukn')
  assert(active[0]?.ruknId === female[0]!.id, 'original muttafiq link remains current')
  assert(
    inspectDuplicateActiveMuttafiqLinks().every((row) => row.personId !== created.karkunId),
    'muttafiq duplicates not present after rejected second save',
  )
  assert(
    getActiveMuttafiqRelationshipsForRukn(female[0]!.id).some((row) => row.personId === created.karkunId),
    'original Muttafiq Rukn list includes person',
  )
  assert(
    getActiveMuttafiqRelationshipsForRukn(female[1]!.id).every((row) => row.personId !== created.karkunId),
    'rejected second Rukn list excludes person',
  )
}

{
  setAdministratorDecisionSessionOverrideForTests({
    ok: false,
    error: 'Only an Administrator can delete an A Rukn.',
  })
  const blocked = await executeARuknDelete({
    aRuknId: 'AR01',
    mode: 'delete_permanently',
    decidedBy: 'Rukn',
  })
  assert(!blocked.ok, 'non-Admin cannot delete A Rukn')
  setAdministratorDecisionSessionOverrideForTests(null)
}

{
  const source = seedKarkun('kr-9705', 'Restore Source', '9000007005')
  source.gender = 'Female'
  MOCK_KARKUN_REGISTRY.push(source)
  const stored = await getRepositories().karkun.upsertRecord(source)
  assert(stored.ok, 'restore source persisted')
  const promoted = await promoteKarkunToARukn('kr-9705')
  assert(promoted.success, `promote failed: ${promoted.success ? '' : promoted.error}`)
  const aRuknId = promoted.success ? promoted.aRuknId : ''
  assert(aRuknId.startsWith('AR'), 'promoted AR id')
  assert(!getAllKarkuns().some((row) => row.id === 'kr-9705'), 'source left active Karkun registry')
  const restored = await executeARuknDelete({
    aRuknId,
    mode: 'restore_karkun',
    decidedBy: 'Administrator',
  })
  assert(restored.ok, `restore failed: ${restored.ok ? '' : restored.error}`)
  assert(!listActiveARuknOfficers().some((row) => row.id === aRuknId), 'restored officer left active A Rukn registry')
  const person = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-9705')
  assert(person, 'source Karkun document preserved')
  assert(!person!.promotedToARuknId?.trim(), 'promotion id cleared')
  assert(isKarkun(person!), 'restored person is a normal Karkun')
  assert(!isUnavailableAsNormalKarkun(person!), 'restored person is available as Karkun')
  assert(getAllKarkuns().some((row) => row.id === 'kr-9705'), 'restored person is in Karkun registry')
  assert(person!.referredByRuknId === source.referredByRuknId, 'referral not invented')
}

{
  const source = seedKarkun('kr-9706', 'Permanent Source', '9000007006')
  source.gender = 'Female'
  MOCK_KARKUN_REGISTRY.push(source)
  const stored = await getRepositories().karkun.upsertRecord(source)
  assert(stored.ok, 'permanent source persisted')
  const promoted = await promoteKarkunToARukn('kr-9706')
  assert(promoted.success, 'permanent promote')
  const aRuknId = promoted.success ? promoted.aRuknId : ''
  const removed = await executeARuknDelete({
    aRuknId,
    mode: 'delete_permanently',
    decidedBy: 'Administrator',
  })
  assert(removed.ok, `permanent delete failed: ${removed.ok ? '' : removed.error}`)
  assert(!listActiveARuknOfficers().some((row) => row.id === aRuknId), 'permanent officer left active registry')
  assert(getRuknById(aRuknId), 'officer document preserved')
  const person = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-9706')
  assert(person, 'source Karkun document preserved')
  assert(person!.promotedToARuknId === aRuknId, 'permanent delete does not restore Karkun promotion link')
  assert(!getAllKarkuns().some((row) => row.id === 'kr-9706'), 'permanent delete does not recreate a normal Karkun')
}

setJwtRoleClaimOverrideForTests(null)
setAdministratorDecisionSessionOverrideForTests(null)
console.log('verify-one-active-rukn: OK')
