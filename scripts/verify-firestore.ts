/**
 * M8 — Firestore repository layer verification (no live Firestore required).
 * Run: npm run verify:firestore
 */
import assert from 'node:assert/strict'
import {
  FIRESTORE_COLLECTIONS,
  FIRESTORE_DOCS,
  complianceBaitulMaalDocId,
  executionAnnexureDocId,
} from '@/repositories/firestore/collections'
import { getRepositoryProviderMode, resetRepositoryProviderForTests } from '@/repositories/provider'
import { resetFirestoreSyncStateForTests } from '@/repositories/firestore/offlineSync'
import { resetRepositoryInitializationForTests } from '@/repositories/firestore/initialize'
import { resetFirestoreClientForTests } from '@/lib/firebase/firestore'

console.log('▶ collection constants')
{
  assert.equal(FIRESTORE_COLLECTIONS.connections, 'connections')
  assert.equal(FIRESTORE_COLLECTIONS.followUps, 'followUps')
  assert.equal(FIRESTORE_DOCS.guidanceState, 'guidance')
  assert.equal(executionAnnexureDocId('form-1'), 'annexure_form-1')
  assert.equal(complianceBaitulMaalDocId('kr-1', '2026-01'), 'baitulMaal_kr-1_2026-01')
}

console.log('▶ provider defaults to local in Node')
{
  resetRepositoryProviderForTests()
  resetFirestoreClientForTests()
  resetFirestoreSyncStateForTests()
  resetRepositoryInitializationForTests()
  assert.equal(getRepositoryProviderMode(), 'local')
}

console.log('▶ local repositories remain available')
{
  const { getRepositories } = await import('@/repositories/provider')
  const repos = getRepositories()
  assert.ok(repos.connection)
  assert.ok(repos.execution)
  assert.ok(repos.compliance)
}

console.log('Firestore repository layer verification passed.')
