/**
 * KC-0102.0 — Verify New Karkun approval pipeline durability contracts.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mergeKarkunRequestsById } from '@/lib/karkunRequestMerge'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

const mergeSrc = readFileSync(resolve(root, 'src/lib/karkunRequestMerge.ts'), 'utf8')
assert(mergeSrc.includes('mergeKarkunRequestsById'), 'merge helper present')

const firestore = readFileSync(
  resolve(root, 'src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)
assert(firestore.includes('writeMergedKarkunRequests'), 'transactional merge write present')
assert(firestore.includes('settings:karkunRequests'), 'Rukn listens to karkunRequests doc')
assert(firestore.includes('refreshKarkunRequestCacheFromServer'), 'server refresh helper present')
assert(firestore.includes('mergeKarkunRequestsById'), 'save uses merge helper')

const store = readFileSync(resolve(root, 'src/stores/karkunRequestStore.ts'), 'utf8')
assert(store.includes('appendKarkunRequestDurable'), 'durable append present')
assert(store.includes('syncKarkunRequestStoreFromServer'), 'store sync present')

const service = readFileSync(resolve(root, 'src/services/karkunRequestService.ts'), 'utf8')
assert(service.includes('syncKarkunRequestStoreFromServer'), 'submit syncs before write')
assert(service.includes('appendKarkunRequestDurable'), 'submit uses durable append')
assert(service.includes('[KC-0102.0]'), 'diagnostics present')
assert(
  service.includes('Existing Person Found'),
  'KC-0068 mobile message preserved',
)

const modal = readFileSync(
  resolve(root, 'src/components/relationship/NewKarkunRequestModal.tsx'),
  'utf8',
)
assert(modal.includes('await submitNewKarkunRequest'), 'modal awaits durable submit')

const queue = readFileSync(
  resolve(root, 'src/components/forms/people/PendingKarkunRequestQueue.tsx'),
  'utf8',
)
assert(queue.includes('approvePeopleIntakeRequest'), 'people queue still uses canonical approve')
assert(queue.includes('{busy && progressMessage ?'), 'queue shows a single progress banner')
assert(
  !queue.includes('isBusy ? progressMessage'),
  'queue buttons must not repeat the slow-operation message',
)

// Runtime merge: peer pending must survive a stale client write.
const now = new Date().toISOString()
const base = (partial: Partial<NewKarkunRequest> & Pick<NewKarkunRequest, 'id' | 'fullName'>): NewKarkunRequest => ({
  mobile: '9000000000',
  gender: 'Female',
  area: '',
  remarks: '',
  requestingRuknId: 'R001',
  requestingRuknName: 'Test',
  status: 'Pending Approval',
  createdAt: now,
  updatedAt: now,
  createdBy: 'Test',
  ...partial,
})

const remote = [
  base({ id: 'kreq-remote', fullName: 'Remote Pending', requestingRuknId: 'R029' }),
  base({
    id: 'kreq-approved',
    fullName: 'Already Approved',
    status: 'Approved',
    updatedAt: '2026-07-24T10:00:00.000Z',
  }),
]
const staleLocal = [
  base({
    id: 'kreq-new',
    fullName: 'New Local',
    requestingRuknId: 'R030',
    updatedAt: '2026-07-24T12:00:00.000Z',
  }),
]

const merged = mergeKarkunRequestsById(remote, staleLocal)
assert(merged.some((r) => r.id === 'kreq-remote'), 'merge preserves remote pending')
assert(merged.some((r) => r.id === 'kreq-approved'), 'merge preserves remote approved')
assert(merged.some((r) => r.id === 'kreq-new'), 'merge adds local new')
assert(merged.length === 3, 'merge keeps union of ids')

const approvedLocal = [
  base({
    id: 'samad-pasha',
    fullName: 'Samad Pasha',
    status: 'Approved',
    kind: 'karkun_to_muttafiq',
    updatedAt: '2026-09-05T00:02:00.000Z',
  }),
]
const stalePendingRemote = [
  base({
    id: 'samad-pasha',
    fullName: 'Samad Pasha',
    status: 'Pending Approval',
    kind: 'karkun_to_muttafiq',
    updatedAt: '2026-09-05T00:01:00.000Z',
  }),
]
const afterHydrate = mergeKarkunRequestsById(stalePendingRemote, approvedLocal)
assert(
  afterHydrate.find((r) => r.id === 'samad-pasha')?.status === 'Approved',
  'stale snapshot Pending cannot resurrect Approved',
)
assert(
  afterHydrate.filter((r) => r.status === 'Pending Approval').length === 0,
  'approved conversion disappears from pending projection',
)

assert(
  firestore.includes('mergeKarkunRequestsById(remoteKarkunRequests, karkunRequestCache.get())'),
  'background hydrate merges karkunRequests instead of replacing',
)

const inboxPage = readFileSync(resolve(root, 'src/pages/admin/AdminInboxPage.tsx'), 'utf8')
assert(inboxPage.includes('{busy && progressMessage ?'), 'inbox shows a single page-level progress banner')
assert(
  !inboxPage.includes('itemBusy ? progressMessage'),
  'inbox buttons must not repeat the slow-operation message',
)

const intake = readFileSync(resolve(root, 'src/services/karkunRequestService.ts'), 'utf8')
assert(intake.includes('isApprovedRequestStatus(existing.status)'), 're-approve of Approved is idempotent success')
assert(intake.includes('alreadyMuttafiq'), 'conversion approve reconciles already-Muttafiq person')
assert(intake.includes('approvePeopleIntakeRequestOnce'), 'intake approve is single-flight')
assert(intake.includes('intakeApproveInFlight'), 'duplicate intake approve joins in-flight work')

console.log('KC-0102.0 verify-kc0102-0-karkun-approval: OK', {
  mergedCount: merged.length,
  pending: merged.filter((r) => r.status === 'Pending Approval').length,
})
