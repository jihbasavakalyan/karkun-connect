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
  synchronizeRefreshedIdTokenForFirestore,
  type JwtRoleClaimResult,
} from '@/lib/auth/ensureJwtRoleClaim'
import { resetARuknAllocationLockForTests } from '@/lib/aRuknAllocation'
import { createRukn, persistKarkunDurable, persistKarkunFieldsDurable, updateKarkun } from '@/lib/peopleStore'
import { promoteKarkunToARukn } from '@/services/aRuknPromotionService'
import { assignRukn } from '@/services/assignmentService'
import { getRecentConnectionLedger } from '@/services/connectionLedgerService'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { FRIENDLY_DATA_ACCESS_ERROR, repositoryErr } from '@/repositories/errors'
import { FRIENDLY_PERSIST_PERMISSION_ERROR } from '@/lib/reliability/persistErrors'
import { sanitizeForFirestore } from '@/repositories/firestore/firestoreHelpers'
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
  const events: string[] = []
  let token = 'stale-token'
  const listeners: Array<() => void> = []
  const refreshed = await synchronizeRefreshedIdTokenForFirestore({
    getIdToken: async (forceRefresh) => {
      events.push(forceRefresh ? 'refresh' : 'read')
      if (forceRefresh) {
        token = 'refreshed-administrator-token'
        for (const listener of [...listeners]) listener()
      }
      return token
    },
    subscribeIdTokenChanges: (onChange) => {
      events.push('subscribe')
      listeners.push(onChange)
      onChange()
      return () => {
        events.push('unsubscribe')
      }
    },
    yieldForFirestoreAuthQueue: async () => {
      events.push('yield-firestore-queue')
    },
  })
  events.push('firestore-write')
  assert(refreshed === 'refreshed-administrator-token', 'sync helper returns the force-refreshed token')
  const subscribeAt = events.indexOf('subscribe')
  const refreshAt = events.indexOf('refresh')
  const yieldAt = events.indexOf('yield-firestore-queue')
  const writeAt = events.indexOf('firestore-write')
  const unsubAt = events.indexOf('unsubscribe')
  assert(subscribeAt >= 0 && subscribeAt < refreshAt, 'ID-token listener is attached before force refresh')
  assert(refreshAt >= 0 && yieldAt > refreshAt, 'Firestore credential queue yields after force refresh')
  assert(writeAt > yieldAt, 'Firestore write is sequenced after credential sync')
  assert(unsubAt > refreshAt && unsubAt < writeAt, 'token listener is released before the write proceeds')
}

{
  const service = read('src/services/aRuknPromotionService.ts')
  const ensure = read('src/lib/auth/ensureJwtRoleClaim.ts')
  const gate = read('src/lib/auth/assertAdministratorDecisionSession.ts')
  assert(service.includes('allocateNextARuknId'), 'uses Increment 1 allocator')
  assert(service.includes('removeAssignment'), 'uses existing disconnect')
  assert(service.includes('assertAdministratorDecisionSession'), 'admin gate')
  assert(!service.includes("role: 'a_rukn'"), 'no new JWT role')
  assert(!ensure.includes("role: 'a_rukn'"), 'JWT helper introduces no a_rukn role')
  assert(gate.includes('ensureJwtRoleClaimPresent'), 'Admin gate refreshes via shared JWT helper')
  assert(ensure.includes('synchronizeRefreshedIdTokenForFirestore'), 'gate path synchronizes Auth credential')
  assert(ensure.includes('onIdTokenChanged'), 'waits for Auth ID-token observers')
  const gateCallAt = service.indexOf('assertAdministratorDecisionSession')
  const transitionAt = service.indexOf('const transition = await markPromotionInProgress')
  assert(gateCallAt >= 0 && transitionAt > gateCallAt, 'promotion updateDoc runs only after Admin credential gate')
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
  const persistAt = markBlock.indexOf('persistKarkunFieldsDurable')
  const emitAt = markBlock.indexOf('emitPeopleRegistryChange')
  assert(persistAt >= 0 && emitAt >= 0, 'in-progress persist and registry emit exist')
  assert(persistAt < emitAt, 'does not emit registry change before durable in-progress persist')
  assert(!markBlock.includes('persistKarkunDurable'), 'transition does not upsert the full Karkun document')
  assert(markBlock.includes('aRuknPromotionInProgress: true'), 'transition patch sets in-progress true')
  assert(markBlock.includes("updatedBy: 'Administrator'"), 'transition patch sets updatedBy')
  assert(!markBlock.includes('referredByRuknId'), 'transition patch does not send referredByRuknId')
  assert(markBlock.includes('aRuknPromotionInProgress = false'), 'failed persist restores local flag')
  const firestoreRepo = read('src/repositories/firestore/firestoreRepositories.ts')
  assert(
    firestoreRepo.includes("where('assignmentStatus', '==', 'Available')"),
    'Available hydrate query excludes non-Available promoted people',
  )
  assert(
    firestoreRepo.includes("where('promotedToARuknId', '==', '')"),
    'Available hydrate query matches isAvailableKarkunData promotedToARuknId',
  )
  assert(
    firestoreRepo.includes("where('aRuknPromotionInProgress', '==', false)"),
    'Available hydrate query matches isAvailableKarkunData in-progress flag',
  )
  const upsertBlock = firestoreRepo.slice(
    firestoreRepo.indexOf('async upsertRecord(karkun: KarkunRegistryRecord)'),
    firestoreRepo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)'),
  )
  assert(upsertBlock.includes('merge: true'), 'karkun upsert uses merge write so omitted referral is not deleted')
  const updateBlock = firestoreRepo.slice(
    firestoreRepo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)'),
    firestoreRepo.indexOf('clear(): RepositoryResult<void>', firestoreRepo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)')),
  )
  assert(updateBlock.includes('patchDoc('), 'karkun updateRecord uses patchDoc')
  assert(!updateBlock.includes('writeDoc('), 'karkun updateRecord does not use setDoc writeDoc')
  const helpers = read('src/repositories/firestore/firestoreHelpers.ts')
  assert(helpers.includes('writeOptions?.merge'), 'writeDoc supports merge semantics')
  assert(helpers.includes('await updateDoc('), 'patchDoc uses Firestore updateDoc')
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
  function stringOrEmpty(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }
  function referredByUnchanged(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return stringOrEmpty(resource.referredByRuknId) === stringOrEmpty(request.referredByRuknId)
  }
  function categoryUnchanged(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return stringOrEmpty(resource.category) === stringOrEmpty(request.category)
  }
  function promotedToARuknIdUnchanged(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return stringOrEmpty(resource.promotedToARuknId) === stringOrEmpty(request.promotedToARuknId)
  }
  function aRuknPromotionInProgressUnchanged(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return (resource.aRuknPromotionInProgress === true) === (request.aRuknPromotionInProgress === true)
  }
  function promotedKarkunNotAvailable(request: Record<string, unknown>): boolean {
    const promoted = stringOrEmpty(request.promotedToARuknId) !== ''
    return !promoted || request.assignmentStatus !== 'Available'
  }
  function adminMayUpdateKarkun(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return referredByUnchanged(resource, request) && promotedKarkunNotAvailable(request)
  }
  function ruknMayUpdateKarkun(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return (
      referredByUnchanged(resource, request) &&
      categoryUnchanged(resource, request) &&
      promotedToARuknIdUnchanged(resource, request) &&
      aRuknPromotionInProgressUnchanged(resource, request)
    )
  }

  const resource = {
    id: 'kr-8920',
    referredByRuknId: 'R001',
    category: 'Karkun',
    assignmentStatus: 'Assigned',
    assignedRuknId: 'R001',
    promotedToARuknId: '',
    aRuknPromotionInProgress: false,
  }
  const inMemoryPatch = {
    ...resource,
    aRuknPromotionInProgress: true,
    referredByRuknId: undefined,
  }
  const overwritePayload = sanitizeForFirestore(inMemoryPatch) as Record<string, unknown>
  assert(
    !referredByUnchanged(resource, overwritePayload),
    'full overwrite omitting referredByRuknId fails referredByUnchanged',
  )
  assert(
    !adminMayUpdateKarkun(resource, overwritePayload),
    'Admin overwrite without referral is denied',
  )

  const mergedAfterWrite = { ...resource, ...overwritePayload, referredByRuknId: resource.referredByRuknId }
  assert(adminMayUpdateKarkun(resource, mergedAfterWrite), 'Admin can persist aRuknPromotionInProgress when referral is preserved')
  assert(referredByUnchanged(resource, mergedAfterWrite), 'Admin promotion-state write does not violate referredByRuknId')
  assert(categoryUnchanged(resource, mergedAfterWrite), 'category protection remains on merged payload')
  assert(promotedToARuknIdUnchanged(resource, mergedAfterWrite), 'promotedToARuknId protection remains on merged payload')

  const transitionPatch = {
    aRuknPromotionInProgress: true,
    updatedAt: '2026-09-05T10:00:00.000Z',
    updatedBy: 'Administrator',
  }
  assert(
    !Object.prototype.hasOwnProperty.call(transitionPatch, 'referredByRuknId'),
    'updateDoc transition patch does not supply referredByRuknId',
  )
  const afterUpdateDoc = { ...resource, ...transitionPatch }
  assert(
    adminMayUpdateKarkun(resource, afterUpdateDoc),
    'Admin updateDoc transition is accepted with existing referredByRuknId intact',
  )
  assert(
    referredByUnchanged(resource, afterUpdateDoc),
    'updateDoc keeps existing referredByRuknId without client reconstructing it',
  )
  assert(
    !ruknMayUpdateKarkun(resource, afterUpdateDoc),
    'Rukn cannot modify aRuknPromotionInProgress',
  )
  assert(
    !ruknMayUpdateKarkun(resource, { ...resource, promotedToARuknId: 'AR01' }),
    'Rukn cannot modify promotedToARuknId',
  )
  assert(
    !ruknMayUpdateKarkun(resource, { ...resource, category: 'Muttafiq' }),
    'Rukn cannot modify category',
  )
  const karkunRoleAllowUpdate = false
  assert(!karkunRoleAllowUpdate, 'Karkun JWT cannot update karkuns/{id}')
}

{
  MOCK_KARKUN_REGISTRY.push({
    id: 'kr-8921',
    name: 'Persist Mapping',
    gender: 'Female',
    mobile: '9000008921',
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    referredByRuknId: 'R001',
  })
  const repos = getRepositories()
  const originalUpsert = repos.karkun.upsertRecord.bind(repos.karkun)
  repos.karkun.upsertRecord = async () =>
    repositoryErr('Permission', FRIENDLY_DATA_ACCESS_ERROR)
  try {
    const failed = await persistKarkunDurable('kr-8921')
    assert(!failed.success, 'permission-denied persist fails')
    assert(failed.error !== FRIENDLY_DATA_ACCESS_ERROR, 'karkun persist does not use additional-information copy')
    assert(failed.error === FRIENDLY_PERSIST_PERMISSION_ERROR, 'karkun persist uses operator write/save mapping')
  } finally {
    repos.karkun.upsertRecord = originalUpsert
  }

  const originalUpdate = repos.karkun.updateRecord.bind(repos.karkun)
  repos.karkun.updateRecord = async () =>
    repositoryErr('Permission', FRIENDLY_DATA_ACCESS_ERROR)
  try {
    const failedPatch = await persistKarkunFieldsDurable('kr-8921', {
      aRuknPromotionInProgress: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Administrator',
    })
    assert(!failedPatch.success, 'permission-denied transition patch fails')
    assert(failedPatch.error !== FRIENDLY_DATA_ACCESS_ERROR, 'promotion transition does not use additional-information copy')
    assert(failedPatch.error === FRIENDLY_PERSIST_PERMISSION_ERROR, 'promotion transition uses operator write/save mapping')
  } finally {
    repos.karkun.updateRecord = originalUpdate
  }
}

{
  const peopleStore = read('src/lib/peopleStore.ts')
  assert(!peopleStore.includes('aRuknPromotionInProgress'), 'peopleStore has no transition setter')
  assert(peopleStore.includes('persistKarkunFieldsDurable'), 'peopleStore exposes targeted field persist')
  assert(peopleStore.includes('toOperatorPersistError'), 'persistKarkunDurable maps write failures')
}

setAdministratorDecisionSessionOverrideForTests(null)
setJwtRoleClaimOverrideForTests(null)
console.log('verify-a-rukn-promotion: OK')
