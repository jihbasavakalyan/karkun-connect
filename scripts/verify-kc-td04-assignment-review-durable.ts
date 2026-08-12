/**
 * TD-04 / KC-032 P1 Pass A+B — Durable Assignment Review Persistence.
 * Offline verification (no live Firestore / GCP).
 * Run: npm run verify:kc-td04-assignment-review-durable
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FIRESTORE_COLLECTIONS,
  assignmentReviewPendingLockDocId,
} from '@/repositories/firestore/collections'
import {
  getRepositories,
  getRepositoryProviderMode,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { resetFirestoreClientForTests } from '@/lib/firebase/firestore'
import { FRIENDLY_DATA_ACCESS_ERROR } from '@/repositories/errors'
import type { AssignmentReviewRequest } from '@/types/assignmentReview.types'
import {
  ASSIGNMENT_REVIEW_ALREADY_RESOLVED_ERROR,
  ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR,
} from '@/services/assignmentReviewService'
import {
  getPendingAssignmentReviewRequests,
  reloadAssignmentReviewStoreFromPersistence,
  clearAssignmentReviewStore,
} from '@/stores/assignmentReviewStore'

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function makeDraft(overrides: Partial<AssignmentReviewRequest> = {}): AssignmentReviewRequest {
  const now = new Date().toISOString()
  return {
    id: `verify-review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    karkunId: 'kr-verify-1',
    karkunName: 'Verify Karkun',
    ruknId: 'R-verify',
    ruknName: 'Verify Rukn',
    assignmentId: 'asn-1',
    assignmentNumber: 'ASN-1',
    reason: 'Other',
    notes: '',
    snapshot: {
      visitCount: 0,
      callCount: 0,
      whatsappCount: 0,
      lastVisit: null,
      journeyStage: 'Connected',
    },
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
    createdBy: 'Verify',
    ...overrides,
  }
}

console.log('▶ ARCH-009 gate present (Pass A + Pass B)')
{
  const gate = 'docs/architecture/kc-td04-assignment-review-durable-arch009-gate.md'
  assert.ok(existsSync(resolve(root, gate)), 'ARCH-009 gate missing')
  const text = read(gate)
  assertIncludes(text, 'Go / No-Go decision: GO', 'GO decision')
  assertIncludes(text, 'Pass A', 'Pass A scope')
  assertIncludes(text, 'Pass B', 'Pass B scope')
  assertIncludes(text, 'assignmentReviews', 'collection name')
  assertIncludes(text, 'Workflow Correctness', 'Pass B title')
}

console.log('▶ collection constants')
{
  assert.equal(FIRESTORE_COLLECTIONS.assignmentReviews, 'assignmentReviews')
  assert.equal(assignmentReviewPendingLockDocId('kr-1'), 'pending_kr-1')
}

console.log('▶ Firestore rules — Admin/Rukn boundaries')
{
  const rules = read('firestore.rules')
  assertIncludes(rules, 'match /assignmentReviews/{reviewId}', 'assignmentReviews match')
  assertIncludes(rules, 'isAdministrator()', 'Admin access')
  assertIncludes(rules, "resource.data.status == 'Pending'", 'CAS Pending precondition')
  assertIncludes(rules, "request.resource.data.status == 'Resolved'", 'resolve to Resolved')
  assertIncludes(rules, "_docType == 'pendingLock'", 'pending lock')
  assertIncludes(
    rules,
    'allow delete: if isAdministrator() && isAssignmentReviewPendingLock()',
    'lock delete only',
  )
  const block = rules.slice(rules.indexOf('match /assignmentReviews/{reviewId}'))
  const updateLine = block.split('\n').find((line) => line.includes('allow update:'))
  assert.ok(updateLine, 'update rule present')
  assert.ok(updateLine!.includes('isAdministrator()'), 'only Admin may update/resolve')
  assert.ok(!updateLine!.includes('isRukn()'), 'Rukn must not resolve via update')
}

console.log('▶ repository primitives (per-doc + CAS + await)')
{
  const repo = read('src/repositories/firestore/assignmentReviewFirestoreRepository.ts')
  assertIncludes(repo, 'runTransaction', 'transaction create/resolve')
  assertIncludes(repo, 'createDurable', 'createDurable')
  assertIncludes(repo, 'resolveDurable', 'resolveDurable')
  assertIncludes(repo, 'PENDING_EXISTS', 'duplicate pending guard')
  assertIncludes(repo, 'ALREADY_RESOLVED', 'CAS already resolved')
  assertIncludes(repo, 'assignmentReviewPendingLockDocId', 'pending lock helper')
  assertIncludes(repo, 'Another administrator already resolved', 'operator CAS copy')
  assert.ok(
    !/saveAll[\s\S]{0,200}queueWrite/.test(repo),
    'no shared-blob queueWrite LWW in assignment review repo',
  )
  assertIncludes(repo, 'readAssignmentReviewsForClient', 'hydrate reader')
}

console.log('▶ hydrate + store + await success wiring')
{
  const hydrate = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(hydrate, 'readAssignmentReviewsForClient', 'hydrate wiring')
  assertIncludes(hydrate, 'applyAssignmentReviewHydrate', 'cache apply')
  assertIncludes(hydrate, 'FIRESTORE_COLLECTIONS.assignmentReviews', 'listener/collection')

  const storeHydration = read('src/repositories/firestore/storeHydration.ts')
  assertIncludes(storeHydration, 'reloadAssignmentReviewStoreFromPersistence', 'store reload')

  const store = read('src/stores/assignmentReviewStore.ts')
  assertIncludes(store, 'appendAssignmentReviewRequestDurable', 'durable append')
  assertIncludes(store, 'resolveAssignmentReviewRequestDurable', 'durable resolve')
  assertIncludes(store, 'reloadAssignmentReviewStoreFromPersistence', 'reload')

  const service = read('src/services/assignmentReviewService.ts')
  assertIncludes(service, 'appendAssignmentReviewRequestDurable', 'service uses durable create')
  assertIncludes(service, 'resolveAssignmentReviewRequestDurable', 'service uses durable resolve')
  assertIncludes(service, 'async function submitAssignmentReviewRequest', 'submit awaits')
  assertIncludes(service, 'async function decideAssignmentReviewRequest', 'decide awaits')
  assertIncludes(service, 'toOperatorPersistError', 'persist error mapper')
  assertIncludes(service, 'FRIENDLY_DATA_ACCESS_ERROR', 'guards against read-path copy')
  assertIncludes(service, 'ASSIGNMENT_REVIEW_ALREADY_RESOLVED_ERROR', 'CAS operator error')
  assertIncludes(
    service,
    'ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR',
    'post-connection resolve failure copy',
  )
  assert.ok(
    !service.includes("FRIENDLY_DATA_ACCESS_ERROR'") ||
      service.includes('mapped === FRIENDLY_DATA_ACCESS_ERROR'),
    'must not return FRIENDLY_DATA_ACCESS_ERROR as write failure',
  )
}

console.log('▶ Transfer/Replace/Release ordering + retry (static)')
{
  const queue = read('src/components/assignment/AssignmentReviewQueue.tsx')
  assertIncludes(queue, 'changeKarkunRuknAssignment', 'Transfer uses existing engine')
  assertIncludes(queue, 'removeAssignment', 'Release uses existing engine')
  assertIncludes(queue, 'ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR', 'retry copy wired')
  assertIncludes(queue, 'markConnectionThenResolveFailed', 'partial-success handler')
  assertIncludes(queue, 'Retry mark resolved', 'retry affordance')
  assertIncludes(queue, 'TD-04 ordering', 'ordering comments')
  // Connection mutation precedes durable decide for Transfer
  const transferIdx = queue.indexOf('changeKarkunRuknAssignment')
  const transferDecideIdx = queue.indexOf("recordDecision(activeRequest, 'Transfer')")
  assert.ok(transferIdx >= 0 && transferDecideIdx > transferIdx, 'Transfer: mutate then decide')
  const releaseMutateIdx = queue.indexOf('removeAssignment({')
  const releaseDecideIdx = queue.indexOf("recordDecision(request, 'Release')")
  assert.ok(releaseMutateIdx >= 0 && releaseDecideIdx > releaseMutateIdx, 'Release: mutate then decide')
  assertIncludes(queue, "recordDecision(activeRequest, 'Replace')", 'Replace decide after modal complete')

  const card = read('src/components/relationship/ConnectedKarkunCard.tsx')
  assertIncludes(card, 'reviewBusy', 'submit busy guard')
  assertIncludes(card, 'await submitAssignmentReviewRequest', 'await before success')

  const journey = read('src/pages/rukn/ConnectionJourneyPage.tsx')
  assertIncludes(journey, 'reviewBusy', 'journey submit busy guard')
  assertIncludes(journey, 'await submitAssignmentReviewRequest', 'journey await before success')
}

console.log('▶ local provider: create / duplicate Pending / CAS / reload')
{
  resetRepositoryProviderForTests()
  resetFirestoreClientForTests()
  assert.equal(getRepositoryProviderMode(), 'local')
  const repos = getRepositories()
  assert.ok(repos.assignmentReview)
  await repos.assignmentReview.saveAll([])
  clearAssignmentReviewStore()

  const draft = makeDraft({ karkunId: 'kr-verify-dup' })
  const created = await repos.assignmentReview.createDurable(draft)
  assert.equal(created.ok, true, 'create succeeds')

  const dup = await repos.assignmentReview.createDurable({
    ...draft,
    id: `${draft.id}-b`,
  })
  assert.equal(dup.ok, false, 'duplicate Pending blocked')
  if (!dup.ok) {
    assert.equal(dup.error.code, 'Duplicate')
    assert.match(dup.error.message, /already pending/i)
  }

  // Reload persistence: durable Pending survives store rebuild from storage
  reloadAssignmentReviewStoreFromPersistence()
  const pendingAfterReload = getPendingAssignmentReviewRequests().filter(
    (row) => row.karkunId === 'kr-verify-dup',
  )
  assert.equal(pendingAfterReload.length, 1, 'Pending survives reload')
  assert.equal(pendingAfterReload[0]?.status, 'Pending')

  const resolved = await repos.assignmentReview.resolveDurable(draft.id, {
    decision: 'Continue',
    decidedBy: 'Administrator',
    updatedAt: new Date().toISOString(),
  })
  assert.equal(resolved.ok, true)
  if (resolved.ok) assert.equal(resolved.data.status, 'Resolved')

  // Concurrent / second resolve CAS
  const again = await repos.assignmentReview.resolveDurable(draft.id, {
    decision: 'Reject',
    decidedBy: 'Administrator-2',
    updatedAt: new Date().toISOString(),
  })
  assert.equal(again.ok, false, 'second resolve fails safely')
  if (!again.ok) {
    assert.equal(again.error.code, 'Validation')
    assert.equal(again.error.message, ASSIGNMENT_REVIEW_ALREADY_RESOLVED_ERROR)
  }

  reloadAssignmentReviewStoreFromPersistence()
  const pendingAfterResolve = getPendingAssignmentReviewRequests().filter(
    (row) => row.karkunId === 'kr-verify-dup',
  )
  assert.equal(pendingAfterResolve.length, 0, 'Resolved leaves Pending queue after reload')

  await repos.assignmentReview.saveAll([])
  clearAssignmentReviewStore()
}

console.log('▶ persistence failure paths (local)')
{
  const repos = getRepositories()
  await repos.assignmentReview.saveAll([])

  const missing = await repos.assignmentReview.resolveDurable('missing-review-id', {
    decision: 'Continue',
    decidedBy: 'Administrator',
    updatedAt: new Date().toISOString(),
  })
  assert.equal(missing.ok, false)
  if (!missing.ok) assert.equal(missing.error.code, 'NotFound')

  // Operator constants must not equal read-path friendly string
  assert.notEqual(ASSIGNMENT_REVIEW_ALREADY_RESOLVED_ERROR, FRIENDLY_DATA_ACCESS_ERROR)
  assert.notEqual(ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR, FRIENDLY_DATA_ACCESS_ERROR)
  assert.ok(
    ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR.includes('Retry'),
    'post-connection failure instructs retry',
  )

  await repos.assignmentReview.saveAll([])
  clearAssignmentReviewStore()
}

console.log('✅ TD-04 assignment review durable Pass A+B verification passed')
