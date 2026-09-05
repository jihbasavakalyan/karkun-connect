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
  assert.equal(FIRESTORE_COLLECTIONS.trainingRegistrations, 'trainingRegistrations')
  assert.equal(FIRESTORE_COLLECTIONS.connections, 'connections')
  assert.equal(FIRESTORE_COLLECTIONS.followUps, 'followUps')
  assert.equal(FIRESTORE_COLLECTIONS.assignmentReviews, 'assignmentReviews')
  assert.equal(FIRESTORE_DOCS.guidanceState, 'guidance')
  assert.equal(FIRESTORE_DOCS.trainingRegistration, 'trainingRegistration')
  assert.equal(FIRESTORE_DOCS.karkunRequests, 'karkunRequests')
  assert.equal(FIRESTORE_DOCS.aRuknCounter, 'aRuknCounter')
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

console.log('▶ karkun upsert merge write')
{
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const repo = readFileSync(resolve('src/repositories/firestore/firestoreRepositories.ts'), 'utf8')
  const upsert = repo.slice(
    repo.indexOf('async upsertRecord(karkun: KarkunRegistryRecord)'),
    repo.indexOf('clear(): RepositoryResult<void>', repo.indexOf('async upsertRecord(karkun: KarkunRegistryRecord)')),
  )
  assert.equal(upsert.includes('merge: true'), true)
}

console.log('▶ karkun updateRecord uses updateDoc')
{
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const repo = readFileSync(resolve('src/repositories/firestore/firestoreRepositories.ts'), 'utf8')
  const helpers = readFileSync(resolve('src/repositories/firestore/firestoreHelpers.ts'), 'utf8')
  const update = repo.slice(
    repo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)'),
    repo.indexOf('clear(): RepositoryResult<void>', repo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)')),
  )
  assert.equal(update.includes('patchDoc('), true)
  assert.equal(update.includes('writeDoc('), false)
  assert.equal(helpers.includes('await updateDoc('), true)
  const readRecord = repo.slice(
    repo.indexOf('async readRecord(id: string)'),
    repo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)'),
  )
  assert.equal(readRecord.includes('readDoc<KarkunRegistryRecord>'), true)
}

console.log('▶ karkun available pool query matches rules')
{
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const repo = readFileSync(resolve('src/repositories/firestore/firestoreRepositories.ts'), 'utf8')
  assert.equal(repo.includes("where('promotedToARuknId', '==', '')"), true)
  assert.equal(repo.includes("where('aRuknPromotionInProgress', '==', false)"), true)
  assert.equal(repo.includes('readAvailableKarkunPoolForClient'), true)
}

console.log('Firestore repository layer verification passed.')
