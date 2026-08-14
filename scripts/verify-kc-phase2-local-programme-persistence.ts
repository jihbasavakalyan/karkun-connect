/**
 * Phase 2 — Local Programme persistence local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase2-local-programme-persistence
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  getRepositoryProviderMode,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalProgrammesForTests } from '@/repositories/local/localProgrammeLocalRepositories'
import {
  seedLocalPlanningParentForTests,
  VERIFY_ACTIVITY_OBJECTIVE_ID,
} from '@/repositories/local/planningLocalRepositories'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { LocalProgramme } from '@/types/localProgramme.types'

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

function extractRulesBlock(rules: string, matchLine: string): string {
  const start = rules.indexOf(matchLine)
  assert.ok(start >= 0, `missing ${matchLine}`)
  const rest = rules.slice(start)
  const end = rest.indexOf('\n    }')
  return end >= 0 ? rest.slice(0, end + '\n    }'.length) : rest
}

const now = new Date().toISOString()

console.log('▶ collection constants')
{
  assert.equal(FIRESTORE_COLLECTIONS.localProgrammes, 'localProgrammes')
}

console.log('▶ Firestore rules — Admin-only localProgrammes')
{
  const rules = read('firestore.rules')
  const matchLine = 'match /localProgrammes/{docId}'
  const block = extractRulesBlock(rules, matchLine)
  assertIncludes(block, 'isAdministrator()', `${matchLine} Admin gate`)
  assertIncludes(block, 'allow delete: if false', `${matchLine} no client delete`)
  assertNotIncludes(block, 'isRukn()', `${matchLine} no Rukn access`)
}

console.log('▶ provider wiring (local + firestore; Objective + Campaign injection)')
{
  const provider = read('src/repositories/provider.ts')
  assertIncludes(
    provider,
    'const localProgramme = new LocalProgrammeLocalRepository(objective, campaign)',
    'local LocalProgramme repo',
  )
  assertIncludes(
    provider,
    'const localProgramme = new LocalProgrammeFirestoreRepository(objective, campaign)',
    'firestore LocalProgramme repo',
  )
  assertIncludes(provider, 'getRepositoryProviderMode()', 'single mode switch')
  assertNotIncludes(provider, 'createLocalProgrammeProvider', 'no second provider')

  resetRepositoryProviderForTests()
  assert.equal(getRepositoryProviderMode(), 'local')
  const repos = getRepositories()
  assert.ok(repos.localProgramme)
  assert.ok(repos.campaign)
}

console.log('▶ local durable CRUD + Objective parent validation')
{
  resetRepositoryProviderForTests()
  clearLocalProgrammesForTests()
  await seedLocalPlanningParentForTests()
  const repos = getRepositories()

  assert.equal(repos.localProgramme.loadAll().data?.length, 0)

  const parent = repos.objective.getById(VERIFY_ACTIVITY_OBJECTIVE_ID)
  assert.equal(parent.ok, true)
  assert.ok(parent.ok && parent.data, 'verify objective exists for valid parent test')

  const programme: LocalProgramme = {
    id: 'programme-verify-1',
    objectiveId: VERIFY_ACTIVITY_OBJECTIVE_ID,
    campaignId: ACTIVE_CAMPAIGN_ID,
    name: 'Verify Weekly Ijtema Programme',
    kind: 'weekly_ijtema',
    status: 'active',
    summary: 'verify',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }

  const saved = await repos.localProgramme.saveDurable(programme)
  assert.equal(saved.ok, true)
  assert.equal(repos.localProgramme.getById(programme.id).data?.name, programme.name)
  assert.equal(
    repos.localProgramme.listByObjectiveId(VERIFY_ACTIVITY_OBJECTIVE_ID).data?.length,
    1,
  )
  assert.equal(repos.localProgramme.loadAll().data?.length, 1)

  const missingParentId = await repos.localProgramme.saveDurable({
    ...programme,
    id: 'programme-verify-bad-empty',
    objectiveId: '',
  })
  assert.equal(missingParentId.ok, false)
  if (!missingParentId.ok) {
    assert.equal(missingParentId.error.code, 'Validation')
  }

  const unknownParent = await repos.localProgramme.saveDurable({
    ...programme,
    id: 'programme-verify-bad-unknown',
    objectiveId: 'objective-does-not-exist',
  })
  assert.equal(unknownParent.ok, false)
  if (!unknownParent.ok) {
    assert.equal(unknownParent.error.code, 'Validation')
  }
  assert.equal(repos.localProgramme.loadAll().data?.length, 1)

  const unknownCampaign = await repos.localProgramme.saveDurable({
    ...programme,
    id: 'programme-verify-bad-campaign',
    campaignId: 'campaign-does-not-exist',
  })
  assert.equal(unknownCampaign.ok, false)

  const archived = await repos.localProgramme.saveDurable({
    ...programme,
    status: 'archived',
    updatedAt: now,
  })
  assert.equal(archived.ok, true)
  assert.equal(repos.localProgramme.getById(programme.id).data?.status, 'archived')

  const withYears = await repos.localProgramme.saveDurable({
    ...programme,
    status: 'active',
    yearStatuses: { '2024-25': 'completed', '2025-26': 'in_progress' },
    updatedAt: now,
  })
  assert.equal(withYears.ok, true)
  assert.deepEqual(repos.localProgramme.getById(programme.id).data?.yearStatuses, {
    '2024-25': 'completed',
    '2025-26': 'in_progress',
  })
  const updateOneYear = await repos.localProgramme.saveDurable({
    ...programme,
    status: 'active',
    yearStatuses: { '2024-25': 'completed', '2025-26': 'remaining' },
    updatedAt: now,
  })
  assert.equal(updateOneYear.ok, true)
  const afterYearUpdate = repos.localProgramme.getById(programme.id).data?.yearStatuses
  assert.equal(afterYearUpdate?.['2024-25'], 'completed')
  assert.equal(afterYearUpdate?.['2025-26'], 'remaining')
  const invalidYear = await repos.localProgramme.saveDurable({
    ...programme,
    id: 'programme-verify-bad-year-status',
    yearStatuses: { '2099-00': 'completed' },
  })
  assert.equal(invalidYear.ok, false)

  clearLocalProgrammesForTests()
  assert.equal(repos.localProgramme.loadAll().data?.length, 0)
}

console.log('▶ no delete path on LocalProgramme contract/impl')
{
  const iface = read('src/repositories/interfaces/LocalProgrammeRepository.ts')
  assertNotIncludes(iface, 'delete', 'interface has no delete')
  const localImpl = read('src/repositories/local/localProgrammeLocalRepositories.ts')
  assertNotIncludes(localImpl, 'async delete', 'local has no delete')
  const firestoreImpl = read(
    'src/repositories/firestore/localProgrammeFirestoreRepositories.ts',
  )
  assertNotIncludes(firestoreImpl, 'async delete', 'firestore has no delete')
}

console.log('▶ Firestore durable write pattern (await writeDoc) + soft hydrate')
{
  const firestoreRepo = read(
    'src/repositories/firestore/localProgrammeFirestoreRepositories.ts',
  )
  assertIncludes(firestoreRepo, 'await writeDoc(', 'await durable writeDoc')
  assertIncludes(
    firestoreRepo,
    'soft-skip ${label} (permission-denied)',
    'permission-denied soft-skip',
  )
  assertIncludes(firestoreRepo, 'return []', 'empty on soft-skip')
  assertIncludes(firestoreRepo, 'objectives.getById', 'Objective parent lookup')
  assertIncludes(firestoreRepo, 'campaigns.getById', 'optional Campaign lookup')
  assertNotIncludes(firestoreRepo, 'FIRESTORE_COLLECTIONS.karkuns', 'no karkun writes')
  assertNotIncludes(firestoreRepo, 'FIRESTORE_COLLECTIONS.rukns', 'no rukn writes')
  assertNotIncludes(firestoreRepo, 'objectives[]', 'no objective dual-write')
  assertNotIncludes(firestoreRepo, 'objectiveIds', 'no campaign FK writes')
}

console.log('▶ bootstrap / hydrate remains non-critical')
{
  const hydrate = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(hydrate, 'readLocalProgrammeCollectionsForClient', 'programme soft-read')
  assertIncludes(hydrate, 'applyLocalProgrammeHydrate', 'programme apply')

  const criticalFnStart = hydrate.indexOf('function readCriticalHydratePayload')
  const backgroundFnStart = hydrate.indexOf('function readBackgroundHydratePayload')
  assert.ok(criticalFnStart >= 0 && backgroundFnStart > criticalFnStart, 'hydrate fns present')
  const criticalBody = hydrate.slice(criticalFnStart, backgroundFnStart)
  assertNotIncludes(
    criticalBody,
    'readLocalProgrammeCollectionsForClient',
    'programmes not critical',
  )
  assertNotIncludes(criticalBody, 'localProgrammes', 'programme collection not critical')

  const backgroundBody = hydrate.slice(backgroundFnStart, backgroundFnStart + 3000)
  assertIncludes(
    backgroundBody,
    'readLocalProgrammeCollectionsForClient()',
    'programmes in background',
  )
}

console.log('▶ Campaign schema / objective isolation')
{
  const campaignRepo = read('src/repositories/interfaces/CampaignRepository.ts')
  assertIncludes(
    campaignRepo,
    'savePlanningLinksDurable',
    'merge-only planning links write path',
  )
  assertNotIncludes(campaignRepo, 'saveDurable(', 'no full-document Campaign saveDurable')
  assertIncludes(campaignRepo, 'Must not synchronize Objective titles', 'SoT protection note')

  const programmeTypes = read('src/types/localProgramme.types.ts')
  assertIncludes(programmeTypes, 'objectiveId: string', 'activity requires objectiveId')
  assertIncludes(programmeTypes, 'campaignId?: string', 'campaignId is optional focus')
  assertIncludes(programmeTypes, 'yearStatuses?:', 'year-specific status map on same activity')
  assertNotIncludes(programmeTypes, 'mansoobaId', 'no direct mansoobaId on programme')
  assertNotIncludes(programmeTypes, 'objectiveIds', 'no objectiveIds on programme')
}

console.log('▶ Admin activity UI integrity (objectiveId lock)')
{
  const page = read('src/pages/admin/AdminPlanningPage.tsx')
  assertIncludes(page, 'activityObjectiveId', 'locked Objective parent state')
  assertIncludes(
    page,
    'setActivityObjectiveId(selectedObjectiveIdResolved)',
    'create locks selected Objective',
  )
  assertIncludes(page, 'setActivityObjectiveId(row.objectiveId)', 'edit locks row Objective')
  assertIncludes(
    page,
    'objectiveId: existing?.objectiveId ?? parentId',
    'save preserves original Objective on edit',
  )
  assertIncludes(page, 'localProgramme.saveDurable', 'uses repository boundary')
  assertIncludes(page, 'سال کے مطابق عمل درآمد', 'year-specific status editor')
  assertIncludes(page, 'normalizeActivityYearStatuses', 'year map normalized on save')
  assertNotIncludes(page, 'objectives[]', 'no Objective dual-write in Admin UI')
  assertNotIncludes(page, 'Unit / Scope', 'Unit is not a planning UI concept')
}

console.log('KC Phase 2 local programme persistence verify: PASS')
