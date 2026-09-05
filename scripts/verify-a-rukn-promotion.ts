/**
 * Increment 2 — Admin-only Karkun → A Rukn promotion orchestration.
 * Run: npm run verify:a-rukn-promotion
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getNextRuknId, getRuknById, ruknMaster } from '@/data/ruknMaster'
import {
  isCampaignEligible,
  isKarkun,
  isPromotedToARukn,
} from '@/lib/peopleClassification'
import { getAvailableKarkunan } from '@/lib/assignmentEngine'
import { isCompleteARuknOfficer } from '@/lib/officerIdentity'
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import {
  setJwtRoleClaimOverrideForTests,
  type JwtRoleClaimResult,
} from '@/lib/auth/ensureJwtRoleClaim'
import { resetARuknAllocationLockForTests } from '@/lib/aRuknAllocation'
import { createRukn, updateKarkun } from '@/lib/peopleStore'
import { promoteKarkunToARukn } from '@/services/aRuknPromotionService'
import { assignRukn } from '@/services/assignmentService'
import { getRecentConnectionLedger } from '@/services/connectionLedgerService'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { removeFromStorage } from '@/lib/browserStorage'
import {
  appendAssignment,
  clearAssignmentStore,
  getActiveAssignmentsForKarkun,
  getAssignmentHistoryForKarkun,
} from '@/stores/assignmentStore'
import { DEFAULT_PLACE } from '@/types/people.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function administratorJwtOverride(): JwtRoleClaimResult {
  return {
    ok: true,
    role: 'administrator',
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

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function seedKarkun(id: string, name: string, mobile: string, referredByRuknId: string): KarkunRegistryRecord {
  const now = new Date().toISOString()
  return {
    id,
    name,
    gender: 'Female',
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
    referredByRuknId,
  }
}

async function connectToR001(karkunId: string): Promise<void> {
  const now = new Date().toISOString()
  await appendAssignment({
    assignmentId: `asgn-promo-${karkunId}`,
    assignmentNumber: `ASN-PROMO-${karkunId}`,
    ruknId: 'R001',
    karkunId,
    assignedDate: now.slice(0, 10),
    effectiveFrom: now.slice(0, 10),
    status: 'Active',
    assignedBy: 'Administrator',
    createdAt: now,
    updatedAt: now,
  })
  const person = MOCK_KARKUN_REGISTRY.find((row) => row.id === karkunId)
  assert(person, 'seed karkun missing')
  person.assignmentStatus = 'Assigned'
  person.assignedRuknId = 'R001'
  person.assignedRukn = getRuknById('R001')?.name ?? 'R001'
  person.campaignStatus = 'active'
}

console.log('verify-a-rukn-promotion: start')

resetRepositoryProviderForTests()
resetARuknAllocationLockForTests()
removeFromStorage(STORAGE_KEYS.aRuknCounter)
clearAssignmentStore()
setAdministratorDecisionSessionOverrideForTests(null)

const ruknBeforePromote = getNextRuknId()
const r001 = getRuknById('R001')
assert(r001?.gender === 'Female', 'R001 must remain a Female Rukn for this fixture')

MOCK_KARKUN_REGISTRY.push(
  seedKarkun('kr-8801', 'Promo One', '9000008801', 'R001'),
  seedKarkun('kr-8802', 'Promo Two', '9000008802', 'R002'),
  seedKarkun('kr-8803', 'Promo Transition', '9000008803', 'R001'),
  seedKarkun('kr-8804', 'Promo Available', '9000008804', 'R001'),
)
await connectToR001('kr-8801')
assert(getActiveAssignmentsForKarkun('kr-8801').length === 1, 'fixture has active assignment')
const ledgerBefore = getRecentConnectionLedger(50).length

{
  setAdministratorDecisionSessionOverrideForTests({
    ok: false,
    error: 'Only an Administrator can promote a Karkun to A Rukn.',
  })
  const denied = await promoteKarkunToARukn('kr-8801')
  assert(!denied.success, 'non-admin must be rejected')
  assert(
    !denied.success && denied.error.includes('Administrator'),
    'non-admin error mentions Administrator',
  )
  assert(
    MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8801')?.aRuknPromotionInProgress !== true,
    'non-admin cannot enter promotion transition',
  )
  setAdministratorDecisionSessionOverrideForTests(null)
}

{
  const missing = await promoteKarkunToARukn('kr-8899')
  assert(!missing.success, 'missing karkun rejected')
  const badId = await promoteKarkunToARukn('R001')
  assert(!badId.success, 'non kr-* id rejected')
}

const first = await promoteKarkunToARukn('kr-8801')
assert(first.success, `first promote failed: ${first.success ? '' : first.error}`)
assert(first.success && first.aRuknId === 'AR01', `expected AR01, got ${first.success ? first.aRuknId : ''}`)
assert(first.success && !first.idempotent, 'first promote is not an idempotent replay')

const officer = getRuknById('AR01')
assert(officer, 'rukns/AR01 created')
assert(isCompleteARuknOfficer(officer!), 'A Rukn identity shape')
assert(officer!.officerKind === 'a_rukn', 'officerKind')
assert(officer!.origin === 'promoted_karkun', 'origin')
assert(officer!.sourcePersonId === 'kr-8801', 'sourcePersonId')
assert(officer!.status === 'active', 'officer is active')

const source = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8801')
assert(source, 'original karkun remains')
assert(source!.promotedToARuknId === 'AR01', 'promotedToARuknId')
assert(source!.aRuknPromotionInProgress !== true, 'transition cleared on complete')
assert(source!.referredByRuknId === 'R001', 'referredByRuknId unchanged')
assert(isPromotedToARukn(source!), 'promotion flag')
assert(!isKarkun(source!), 'not an active normal Karkun')
assert(!isCampaignEligible(source!), 'not campaign eligible')
assert(getActiveAssignmentsForKarkun('kr-8801').length === 0, 'active assignments ended')
assert(
  getAssignmentHistoryForKarkun('kr-8801').some((row) => row.status === 'Unassigned'),
  'historical connection row retained as Unassigned',
)
assert(
  getAssignmentHistoryForKarkun('kr-8801').some((row) => row.assignmentId === 'asgn-promo-kr-8801'),
  'historical assignment id unchanged',
)
assert(!getAvailableKarkunan('R001').some((row) => row.id === 'kr-8801'), 'not in Available pool')
assert(getNextRuknId() === ruknBeforePromote, 'R### sequence unchanged by AR allocation')

const ledgerAfter = getRecentConnectionLedger(50)
assert(ledgerAfter.length >= ledgerBefore, 'ledger was not wiped')
assert(
  ledgerAfter.some(
    (entry) =>
      entry.karkunId === 'kr-8801' &&
      entry.eventType === 'DISCONNECTED' &&
      String(entry.metadata?.removalReason ?? '') === 'PromotedToARukn',
  ),
  'disconnect used existing removeAssignment ledger',
)

const retry = await promoteKarkunToARukn('kr-8801')
assert(retry.success, `retry failed: ${retry.success ? '' : retry.error}`)
assert(retry.success && retry.aRuknId === 'AR01', 'retry reuses AR01')
assert(ruknMaster.filter((row) => row.sourcePersonId === 'kr-8801').length === 1, 'one officer per source')
assert(ruknMaster.filter((row) => row.id.startsWith('AR') && row.sourcePersonId === 'kr-8801').length === 1)

const second = await promoteKarkunToARukn('kr-8802')
assert(second.success && second.aRuknId === 'AR02', 'second person gets AR02')
assert(
  ruknMaster.filter((row) => row.sourcePersonId === 'kr-8801' || row.sourcePersonId === 'kr-8802')
    .length === 2,
  'two sources map to two officers',
)

{
  const created = createRukn(
    {
      name: 'Post Promo Rukn',
      gender: 'Male',
      mobile: '9000008810',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Administrator',
  )
  assert(created.success, `createRukn after AR: ${created.error ?? ''}`)
  assert(getNextRuknId() !== 'AR03', 'createRukn does not use AR numbering')
}

{
  const service = read('src/services/aRuknPromotionService.ts')
  assert(service.includes('allocateNextARuknId'), 'uses Increment 1 allocator')
  assert(service.includes('removeAssignment'), 'uses existing disconnect')
  assert(service.includes('assertAdministratorDecisionSession'), 'admin gate')
  assert(!service.includes("role: 'a_rukn'"), 'no new JWT role')
  const rules = read('firestore.rules')
  assert(rules.includes('isPromotedToARuknData'), 'rules exclude promoted Available')
  assert(rules.includes('promotedToARuknIdUnchanged'), 'Rukn cannot write promotion link')
  assert(rules.includes('aRuknPromotionInProgressUnchanged'), 'Rukn cannot write transition flag')
  assert(rules.includes('karkunNotInARuknPromotionTransition'), 'connection create blocked in transition')
  assert(rules.includes('officerIdentityUnchanged'), 'officer identity fields locked')
  assert(service.includes('markPromotionInProgress'), 'marks transition before disconnect')
  const markBlock = service.slice(
    service.indexOf('async function markPromotionInProgress'),
    service.indexOf('export async function promoteKarkunToARukn'),
  )
  const persistAt = markBlock.indexOf('persistKarkunDurable')
  const emitAt = markBlock.indexOf('emitPeopleRegistryChange')
  assert(persistAt >= 0 && emitAt >= 0, 'in-progress persist and registry emit exist')
  assert(persistAt < emitAt, 'does not emit registry change before durable in-progress persist')
  assert(markBlock.includes('aRuknPromotionInProgress = false'), 'failed persist restores local flag')
  const firestoreRepo = read('src/repositories/firestore/firestoreRepositories.ts')
  assert(
    firestoreRepo.includes("where('assignmentStatus', '==', 'Available')"),
    'Available hydrate query excludes non-Available promoted people',
  )
}

const nextAlloc = await getRepositories().rukn.allocateNextARuknId()
assert(nextAlloc.ok && nextAlloc.data.aRuknId === 'AR03', 'allocator advanced past used AR ids')

{
  setJwtRoleClaimOverrideForTests(administratorJwtOverride())

  const inTransition = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8803')
  assert(inTransition, 'transition fixture')
  inTransition!.aRuknPromotionInProgress = true
  inTransition!.assignmentStatus = 'Available'
  const blocked = await assignRukn({
    ruknId: 'R001',
    karkunId: 'kr-8803',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    assignedBy: 'Administrator',
  })
  assert(!blocked.success, 'assignRukn must fail during promotion transition')
  assert(getActiveAssignmentsForKarkun('kr-8803').length === 0, 'no assignment created in transition')

  const availableAssign = await assignRukn({
    ruknId: 'R001',
    karkunId: 'kr-8804',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    assignedBy: 'Administrator',
  })
  assert(
    availableAssign.success,
    `normal Available assign failed: ${availableAssign.success ? '' : availableAssign.error}`,
  )
  assert(getActiveAssignmentsForKarkun('kr-8804').length === 1, 'normal Available Karkun assigned')

  const afterPromote = await assignRukn({
    ruknId: 'R001',
    karkunId: 'kr-8801',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    assignedBy: 'Administrator',
  })
  assert(!afterPromote.success, 'promoted source cannot be assigned as a normal Karkun')

  const retryAfterComplete = await promoteKarkunToARukn('kr-8801')
  assert(retryAfterComplete.success && retryAfterComplete.aRuknId === 'AR01', 'retry stays idempotent')
  assert(ruknMaster.filter((row) => row.sourcePersonId === 'kr-8801').length === 1, 'still one officer')

  const midRetry = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8802')
  assert(midRetry, 'second source')
  midRetry!.aRuknPromotionInProgress = true
  const recovered = await promoteKarkunToARukn('kr-8802')
  assert(recovered.success && recovered.aRuknId === 'AR02', 'in-progress retry reuses AR02')
  assert(midRetry!.aRuknPromotionInProgress !== true, 'retry clears transition after complete')
  assert(ruknMaster.filter((row) => row.sourcePersonId === 'kr-8802').length === 1, 'no second officer')

  const edited = updateKarkun('kr-8804', { name: 'Promo Available Edited' }, 'Administrator')
  assert(edited.success, 'ordinary updateKarkun still works')
  assert(
    MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8804')?.aRuknPromotionInProgress !== true,
    'updateKarkun cannot enter promotion transition',
  )

  setJwtRoleClaimOverrideForTests(null)
}

{
  const peopleStore = read('src/lib/peopleStore.ts')
  assert(!peopleStore.includes('aRuknPromotionInProgress'), 'peopleStore has no transition setter')
}

setAdministratorDecisionSessionOverrideForTests(null)
setJwtRoleClaimOverrideForTests(null)
console.log('verify-a-rukn-promotion: OK')
