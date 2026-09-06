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
import {
  assertAdministratorDecisionSession,
  setAdministratorDecisionAuthRuntimeForTests,
  setAdministratorDecisionSessionOverrideForTests,
} from '@/lib/auth/assertAdministratorDecisionSession'
import {
  MISSING_JWT_ROLE_CLAIM_ERROR,
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
import { FRIENDLY_DATA_ACCESS_ERROR, repositoryErr, repositoryOk } from '@/repositories/errors'
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

function seedKarkun(
  id: string,
  name: string,
  mobile: string,
  referredByRuknId?: string,
): KarkunRegistryRecord {
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
setAdministratorDecisionAuthRuntimeForTests(null)

const ruknBeforePromote = getNextRuknId()
const r001 = getRuknById('R001')
assert(r001?.gender === 'Female', 'R001 must remain a Female Rukn for this fixture')

MOCK_KARKUN_REGISTRY.push(
  seedKarkun('kr-8801', 'Promo One', '9000008801', 'R001'),
  seedKarkun('kr-8802', 'Promo Two', '9000008802', 'R002'),
  seedKarkun('kr-8803', 'Promo Transition', '9000008803', 'R001'),
  seedKarkun('kr-8804', 'Promo Available', '9000008804', 'R001'),
)
for (const id of ['kr-8801', 'kr-8802', 'kr-8803', 'kr-8804']) {
  const seeded = MOCK_KARKUN_REGISTRY.find((row) => row.id === id)
  assert(seeded, 'seed karkun missing before durable write')
  const stored = await getRepositories().karkun.upsertRecord(seeded)
  assert(stored.ok, `authoritative seed persist failed for ${id}`)
}
await connectToR001('kr-8801')
{
  const connected = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8801')
  assert(connected, 'connected seed missing')
  const stored = await getRepositories().karkun.upsertRecord(connected)
  assert(stored.ok, 'authoritative seed persist failed after connect')
}
assert(getActiveAssignmentsForKarkun('kr-8801').length === 1, 'fixture has active assignment')
const ledgerBefore = getRecentConnectionLedger(50).length

{
  setAdministratorDecisionSessionOverrideForTests({
    ok: false,
    error: 'Only an Administrator can promote a Karkun to A Rukn.',
  })
  const denied = await promoteKarkunToARukn('kr-8801')
  assert(!denied.success, 'CASE F: non-admin must be rejected')
  assert(
    !denied.success && denied.error.includes('Administrator'),
    'CASE F: non-admin error mentions Administrator',
  )
  assert(
    MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8801')?.aRuknPromotionInProgress !== true,
    'non-admin cannot enter promotion transition',
  )

  const deniedRukn = await promoteKarkunToARukn('kr-8801')
  assert(!deniedRukn.success, 'CASE G: Rukn must be rejected')
  assert(
    !deniedRukn.success && deniedRukn.error.includes('Administrator'),
    'CASE G: Rukn error mentions Administrator',
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
        queueMicrotask(() => {
          for (const listener of [...listeners]) listener()
        })
      }
      return token
    },
    subscribeIdTokenChanges: (onChange) => {
      events.push('subscribe')
      let initial = true
      const wrapped = () => {
        onChange()
        if (!initial) events.push('notified')
        initial = false
      }
      listeners.push(wrapped)
      wrapped()
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
  const notifiedAt = events.indexOf('notified')
  const yieldAt = events.indexOf('yield-firestore-queue')
  const writeAt = events.indexOf('firestore-write')
  const unsubAt = events.indexOf('unsubscribe')
  assert(subscribeAt >= 0 && subscribeAt < refreshAt, 'ID-token listener is attached before force refresh')
  assert(notifiedAt > refreshAt, 'waits for post-initial ID-token notification after force refresh')
  assert(yieldAt > notifiedAt, 'Firestore credential queue yields only after ID-token notification')
  assert(writeAt > yieldAt, 'Firestore write is sequenced after credential sync')
  assert(unsubAt > refreshAt && unsubAt < writeAt, 'token listener is released before the write proceeds')
}

{
  function mockAdminRuntime(events: string[]) {
    let token = 'existing-administrator-token'
    const listeners: Array<() => void> = []
    return {
      currentUser: {
        getIdToken: async (forceRefresh: boolean) => {
          events.push(forceRefresh ? 'refresh' : 'read')
          if (forceRefresh) {
            token = 'synced-administrator-token'
            queueMicrotask(() => {
              for (const listener of [...listeners]) listener()
            })
          }
          return token
        },
      },
      subscribeIdTokenChanges: (onChange: () => void) => {
        events.push('subscribe')
        let initial = true
        const wrapped = () => {
          onChange()
          if (!initial) events.push('notified')
          initial = false
        }
        listeners.push(wrapped)
        wrapped()
        return () => {
          events.push('unsubscribe')
        }
      },
      yieldForFirestoreAuthQueue: async () => {
        events.push('yield-firestore-queue')
      },
    }
  }

  const adminEvents: string[] = []
  setAdministratorDecisionSessionOverrideForTests(null)
  setJwtRoleClaimOverrideForTests(administratorJwtOverride())
  setAdministratorDecisionAuthRuntimeForTests(mockAdminRuntime(adminEvents))
  const adminGate = await assertAdministratorDecisionSession(
    'Only an Administrator can promote a Karkun to A Rukn.',
  )
  adminEvents.push('admin-write')
  assert(adminGate.ok, 'administrator still passes the decision gate')
  assert(adminEvents.includes('subscribe'), 'existing administrator role still subscribes Firestore token observers')
  assert(adminEvents.includes('refresh'), 'existing administrator role still force-refreshes for Firestore attach')
  assert(
    adminEvents.indexOf('yield-firestore-queue') > adminEvents.indexOf('notified'),
    'existing administrator role still yields for Firestore AuthCredentialsProvider',
  )
  assert(
    adminEvents.indexOf('admin-write') > adminEvents.indexOf('yield-firestore-queue'),
    'Admin promotion write is sequenced after Firestore credential sync',
  )
  setAdministratorDecisionAuthRuntimeForTests(null)

  const ruknEvents: string[] = []
  setJwtRoleClaimOverrideForTests({
    ok: true,
    role: 'rukn',
    ruknId: 'R001',
    forceRefreshed: false,
    timeline: {
      t1GetIdTokenCalled: 0,
      t2GetIdTokenResolved: 0,
      forceRefreshed: false,
      role: 'rukn',
      ruknId: 'R001',
      issuedAtTime: null,
      expirationTime: null,
    },
  })
  setAdministratorDecisionAuthRuntimeForTests(mockAdminRuntime(ruknEvents))
  const ruknGate = await assertAdministratorDecisionSession(
    'Only an Administrator can promote a Karkun to A Rukn.',
  )
  assert(!ruknGate.ok, 'non-administrator still fails')
  assert(
    !ruknGate.ok && ruknGate.error === 'Only an Administrator can promote a Karkun to A Rukn.',
    'non-administrator uses the existing authorization error',
  )
  assert(!ruknEvents.includes('refresh'), 'non-administrator does not run Firestore credential sync')
  setAdministratorDecisionAuthRuntimeForTests(null)

  const missingEvents: string[] = []
  setJwtRoleClaimOverrideForTests({
    ok: false,
    error: MISSING_JWT_ROLE_CLAIM_ERROR,
    forceRefreshed: true,
    timeline: null,
  })
  setAdministratorDecisionAuthRuntimeForTests(mockAdminRuntime(missingEvents))
  const missingGate = await assertAdministratorDecisionSession(
    'Only an Administrator can promote a Karkun to A Rukn.',
  )
  assert(!missingGate.ok, 'missing claims still fail')
  assert(
    !missingGate.ok && missingGate.error === MISSING_JWT_ROLE_CLAIM_ERROR,
    'missing claims use the existing missing-claims error',
  )
  assert(!missingEvents.includes('refresh'), 'missing claims do not run Firestore credential sync')
  setAdministratorDecisionAuthRuntimeForTests(null)
  setJwtRoleClaimOverrideForTests(null)
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
  assert(
    gate.includes('synchronizeRefreshedIdTokenForFirestore'),
    'Admin decision path synchronizes Firestore credentials after administrator validation',
  )
  assert(ensure.includes('synchronizeRefreshedIdTokenForFirestore'), 'shared credential sync helper remains')
  assert(ensure.includes('onIdTokenChanged'), 'waits for Auth ID-token observers')
  assert(!ensure.includes('Promise.race'), 'auth sync does not race ID-token notification against queue yield')
  assert(ensure.includes('jwtHasAppRole'), 'skips force-refresh when current JWT already has an app role')
  assert(ensure.includes('await notified'), 'auth sync awaits post-initial ID-token notification')
  const gateCallAt = service.indexOf('assertAdministratorDecisionSession')
  const transitionAt = service.indexOf('const transition = await markPromotionInProgress')
  assert(gateCallAt >= 0 && transitionAt > gateCallAt, 'promotion updateDoc runs only after Admin credential gate')
  const rules = read('firestore.rules')
  assert(rules.includes('function referredByValue(data)'), 'referral helper is presence-safe')
  assert(rules.includes("('referredByRuknId' in data)"), 'missing referredByRuknId does not error the comparison')
  assert(
    rules.includes("('aRuknPromotionInProgress' in data)"),
    'missing aRuknPromotionInProgress does not error connection/karkun rules',
  )
  assert(!rules.includes('match /aRukns/'), 'no fourth A Rukn collection')
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
  assert(markBlock.includes('aRuknPromotionInProgress: true'), 'transition patch sets in-progress true')
  assert(markBlock.includes("updatedBy: 'Administrator'"), 'transition patch sets updatedBy')
  assert(markBlock.includes('karkun.readRecord(personId)'), 'transition reads authoritative karkuns/{id}')
  assert(
    !markBlock.includes('lockedReferralFromAuthoritativeDocument'),
    'promotion does not use a locked-referral gate',
  )
  assert(
    !markBlock.includes('MISSING_LOCKED_REFERRAL_ERROR'),
    'missing referral does not fail closed',
  )
  assert(
    !markBlock.includes('Promotion cannot continue'),
    'obsolete locked-referral copy is removed',
  )
  assert(
    markBlock.includes('persistKarkunFieldsDurable(personId, transitionPatch)'),
    'transition uses persistKarkunFieldsDurable field patch',
  )
  assert(
    markBlock.includes('typeof authoritativeReferral === \'string\''),
    'transition copies referral from the authoritative document only when present',
  )
  assert(
    markBlock.includes('transitionPatch.referredByRuknId = authoritativeReferral'),
    'transition patch carries authoritative referredByRuknId when it exists',
  )
  assert(
    markBlock.includes('assignmentStatus: authoritative.data.assignmentStatus'),
    'transition patch preserves authoritative assignmentStatus',
  )
  assert(!markBlock.includes("?? ''"), 'transition does not coerce missing referral to empty string')
  assert(
    !markBlock.includes('person.referredByRuknId'),
    'referral is not taken from in-memory person',
  )
  assert(!markBlock.includes('R011'), 'transition patch does not hardcode kr-701 referral')
  assert(!markBlock.includes('setDoc'), 'transition patch does not replace the Karkun document')
  assert(!markBlock.includes('persistKarkunDurable(personId)'), 'transition does not upsert the full Karkun document')
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
  const readRecordBlock = firestoreRepo.slice(
    firestoreRepo.indexOf('async readRecord(id: string)'),
    firestoreRepo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)'),
  )
  assert(readRecordBlock.includes('readDoc<KarkunRegistryRecord>'), 'readRecord uses existing Firestore readDoc')
  assert(readRecordBlock.includes('FIRESTORE_COLLECTIONS.karkuns'), 'readRecord targets karkuns/{id}')
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

{
  setAdministratorDecisionSessionOverrideForTests(null)
  setJwtRoleClaimOverrideForTests(administratorJwtOverride())
  const repos = getRepositories()
  const memory = seedKarkun('kr-8820', 'Stale Memory Referral', '9000008820', 'R001')
  delete memory.referredByRuknId
  MOCK_KARKUN_REGISTRY.push(memory)
  const authoritative = seedKarkun('kr-8820', 'Stale Memory Referral', '9000008820', 'R011')
  const originalRead = repos.karkun.readRecord.bind(repos.karkun)
  const originalUpdate = repos.karkun.updateRecord.bind(repos.karkun)
  let capturedPatch: { referredByRuknId?: string } | null = null
  let updateCalls = 0
  repos.karkun.readRecord = async (id) =>
    id === 'kr-8820' ? repositoryOk(authoritative) : originalRead(id)
  repos.karkun.updateRecord = async (id, patch) => {
    if (id === 'kr-8820' && patch.aRuknPromotionInProgress === true) {
      updateCalls += 1
      capturedPatch = patch
      return repositoryErr('StorageFailure', 'stop after capturing transition patch')
    }
    return originalUpdate(id, patch)
  }
  try {
    const result = await promoteKarkunToARukn('kr-8820')
    assert(!result.success, 'capture fixture must stop at transition persist')
    assert(updateCalls === 1, 'transition write is attempted after authoritative read')
    assert(capturedPatch?.referredByRuknId === 'R011', 'stale in-memory referral does not replace Firestore R011')
    assert(capturedPatch?.referredByRuknId !== '', 'transition does not write empty referral')
  } finally {
    repos.karkun.readRecord = originalRead
    repos.karkun.updateRecord = originalUpdate
  }
}

{
  setAdministratorDecisionSessionOverrideForTests(null)
  setJwtRoleClaimOverrideForTests(administratorJwtOverride())
  const repos = getRepositories()
  const memory = seedKarkun('kr-8821', 'Missing Authoritative Referral', '9000008821', 'R001')
  MOCK_KARKUN_REGISTRY.push(memory)
  const authoritative = seedKarkun('kr-8821', 'Missing Authoritative Referral', '9000008821', 'R001')
  delete authoritative.referredByRuknId
  const originalRead = repos.karkun.readRecord.bind(repos.karkun)
  const originalUpdate = repos.karkun.updateRecord.bind(repos.karkun)
  let capturedPatch: { referredByRuknId?: string } | null = null
  let updateCalls = 0
  repos.karkun.readRecord = async (id) =>
    id === 'kr-8821' ? repositoryOk(authoritative) : originalRead(id)
  repos.karkun.updateRecord = async (id, patch) => {
    if (id === 'kr-8821' && patch.aRuknPromotionInProgress === true) {
      updateCalls += 1
      capturedPatch = patch
      return repositoryErr('StorageFailure', 'stop after capturing transition patch')
    }
    return originalUpdate(id, patch)
  }
  try {
    const result = await promoteKarkunToARukn('kr-8821')
    assert(!result.success, 'capture fixture must stop at transition persist')
    assert(
      !result.success && !result.error.includes('locked referral'),
      'CASE B: missing referral must not use locked-referral error',
    )
    assert(updateCalls === 1, 'CASE B: missing referral still attempts transition write')
    assert(
      capturedPatch?.referredByRuknId === undefined,
      'CASE B: omitted authoritative referral is not invented on the patch',
    )
  } finally {
    repos.karkun.readRecord = originalRead
    repos.karkun.updateRecord = originalUpdate
  }
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
  function referredByValue(data: Record<string, unknown>): string {
    return Object.prototype.hasOwnProperty.call(data, 'referredByRuknId')
      ? stringOrEmpty(data.referredByRuknId)
      : ''
  }
  function referredByUnchanged(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return referredByValue(resource) === referredByValue(request)
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
  function isARuknPromotionInProgressData(data: Record<string, unknown>): boolean {
    return Object.prototype.hasOwnProperty.call(data, 'aRuknPromotionInProgress') && data.aRuknPromotionInProgress === true
  }
  function isPromotedToARuknData(data: Record<string, unknown>): boolean {
    return (
      Object.prototype.hasOwnProperty.call(data, 'promotedToARuknId') && stringOrEmpty(data.promotedToARuknId) !== ''
    )
  }
  function karkunNotInARuknPromotionTransition(data: Record<string, unknown>): boolean {
    return !isPromotedToARuknData(data) && !isARuknPromotionInProgressData(data)
  }
  function ruknMayForgeConnectionTransfer(
    resource: Record<string, unknown>,
    request: Record<string, unknown>,
  ): boolean {
    return request.ruknId === resource.ruknId && request.karkunId === resource.karkunId
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
    referredByRuknId: resource.referredByRuknId,
    assignmentStatus: resource.assignmentStatus,
    updatedAt: '2026-09-05T10:00:00.000Z',
    updatedBy: 'Administrator',
  }
  assert(
    Object.prototype.hasOwnProperty.call(transitionPatch, 'referredByRuknId'),
    'updateDoc transition patch supplies existing referredByRuknId',
  )
  assert(transitionPatch.referredByRuknId === resource.referredByRuknId, 'referral is copied from the authoritative document')
  const afterUpdateDoc = { ...resource, ...transitionPatch }
  assert(
    adminMayUpdateKarkun(resource, afterUpdateDoc),
    'Admin updateDoc transition is accepted with existing referredByRuknId intact',
  )
  assert(
    referredByUnchanged(resource, afterUpdateDoc),
    'updateDoc keeps existing referredByRuknId without changing it',
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

  const legacyMissing = {
    id: 'kr-171',
    category: 'Karkun',
    assignmentStatus: 'Assigned',
    assignedRuknId: 'R006',
  }
  const legacyTransition = {
    ...legacyMissing,
    aRuknPromotionInProgress: true,
    assignmentStatus: 'Assigned',
    updatedBy: 'Administrator',
  }
  assert(
    !Object.prototype.hasOwnProperty.call(legacyMissing, 'referredByRuknId'),
    'A. resource omits referredByRuknId',
  )
  assert(
    !Object.prototype.hasOwnProperty.call(legacyTransition, 'referredByRuknId'),
    'A. request omits referredByRuknId',
  )
  assert(referredByUnchanged(legacyMissing, legacyTransition), 'A. missing → missing is unchanged')
  assert(
    adminMayUpdateKarkun(legacyMissing, legacyTransition),
    'A. Admin promotion-state update is allowed when referral is missing on both sides',
  )
  assert(
    referredByUnchanged(legacyMissing, { ...legacyTransition, referredByRuknId: '' }),
    'A. missing → empty string is unchanged under string-or-empty',
  )

  const existingReferral = {
    id: 'kr-b',
    referredByRuknId: 'R011',
    category: 'Karkun',
    assignmentStatus: 'Assigned',
    assignedRuknId: 'R011',
  }
  assert(
    adminMayUpdateKarkun(existingReferral, {
      ...existingReferral,
      aRuknPromotionInProgress: true,
      referredByRuknId: 'R011',
    }),
    'B. existing referral unchanged remains allowed',
  )
  assert(
    !referredByUnchanged(existingReferral, { ...existingReferral, referredByRuknId: 'R012' }),
    'C. existing referral changed is denied',
  )
  assert(
    !adminMayUpdateKarkun(existingReferral, { ...existingReferral, referredByRuknId: 'R012' }),
    'C. Admin cannot rewrite referral',
  )
  assert(
    !ruknMayUpdateKarkun(legacyMissing, legacyTransition),
    'D. Rukn still cannot set aRuknPromotionInProgress',
  )
  assert(
    karkunNotInARuknPromotionTransition(legacyMissing),
    'legacy karkun missing aRuknPromotionInProgress still allows Admin connection create',
  )
  assert(
    !karkunNotInARuknPromotionTransition({ ...legacyMissing, aRuknPromotionInProgress: true }),
    'in-progress karkun still blocks connection create',
  )
  assert(
    karkunNotInARuknPromotionTransition({ ...legacyMissing, aRuknPromotionInProgress: false }),
    'explicit false is not treated as in-progress',
  )
  assert(
    !ruknMayForgeConnectionTransfer(
      { ruknId: 'R006', karkunId: 'kr-171', assignmentId: 'asgn-1' },
      { ruknId: 'R007', karkunId: 'kr-171', assignmentId: 'asgn-1' },
    ),
    'Rukn still cannot change connection ruknId (transfer remains Admin-only)',
  )
  assert(
    !adminMayUpdateKarkun(
      { ...legacyMissing, promotedToARuknId: 'AR01' },
      { ...legacyMissing, promotedToARuknId: 'AR01', assignmentStatus: 'Available' },
    ),
    'E. promoted Karkun cannot be marked Available',
  )
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

{
  setAdministratorDecisionSessionOverrideForTests(null)
  setJwtRoleClaimOverrideForTests(administratorJwtOverride())

  const emptyReferral = seedKarkun('kr-8832', 'Empty Referral Promo', '9000008832', '')
  MOCK_KARKUN_REGISTRY.push(emptyReferral)
  {
    const stored = await getRepositories().karkun.upsertRecord(emptyReferral)
    assert(stored.ok, 'CASE C seed persist')
  }
  const emptyResult = await promoteKarkunToARukn('kr-8832')
  assert(emptyResult.success, `CASE C empty referral must ALLOW: ${emptyResult.success ? '' : emptyResult.error}`)

  const connectedNoReferral = seedKarkun('kr-8831', 'Connected No Referral', '9000008831')
  MOCK_KARKUN_REGISTRY.push(connectedNoReferral)
  {
    const stored = await getRepositories().karkun.upsertRecord(connectedNoReferral)
    assert(stored.ok, 'CASE D seed persist')
  }
  await connectToR001('kr-8831')
  {
    const connected = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8831')
    assert(connected, 'CASE D connected seed missing')
    const stored = await getRepositories().karkun.upsertRecord(connected)
    assert(stored.ok, 'CASE D persist after connect')
  }
  assert(!connectedNoReferral.referredByRuknId, 'CASE D has no referral')
  assert(connectedNoReferral.assignedRuknId === 'R001', 'CASE D has Connected Rukn')
  const connectedResult = await promoteKarkunToARukn('kr-8831')
  assert(
    connectedResult.success,
    `CASE D connected without referral must ALLOW: ${connectedResult.success ? '' : connectedResult.error}`,
  )

  const none = seedKarkun('kr-8830', 'No Connection No Referral', '9000008830')
  MOCK_KARKUN_REGISTRY.push(none)
  {
    const stored = await getRepositories().karkun.upsertRecord(none)
    assert(stored.ok, 'CASE E seed persist')
  }
  assert(!none.referredByRuknId, 'CASE E has no referral')
  assert(!none.assignedRuknId, 'CASE E has no Connected Rukn')
  const noneResult = await promoteKarkunToARukn('kr-8830')
  assert(
    noneResult.success,
    `CASE E no connection and no referral must ALLOW: ${noneResult.success ? '' : noneResult.error}`,
  )
}

setAdministratorDecisionSessionOverrideForTests(null)
setAdministratorDecisionAuthRuntimeForTests(null)
setJwtRoleClaimOverrideForTests(null)
console.log('verify-a-rukn-promotion: OK')
