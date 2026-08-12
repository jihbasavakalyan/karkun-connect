/**
 * Phase 1 — Planning persistence local smoke (no live Firestore / GCP).
 * TASK-006 persistence + TASK-007 access/bootstrap/isolation checks.
 * Run: npm run verify:kc-phase1-planning-persistence
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
import { clearLocalPlanningForTests } from '@/repositories/local/planningLocalRepositories'
import type {
  MeqatiMansooba,
  PlanningObjective,
  Unit,
} from '@/types/planning.types'

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
  // Close at the match block's own `}` (indent of collection matches).
  const end = rest.indexOf('\n    }')
  return end >= 0 ? rest.slice(0, end + '\n    }'.length) : rest
}

const now = new Date().toISOString()

console.log('▶ collection constants')
{
  assert.equal(FIRESTORE_COLLECTIONS.meqatiMansoobas, 'meqatiMansoobas')
  assert.equal(FIRESTORE_COLLECTIONS.objectives, 'objectives')
  assert.equal(FIRESTORE_COLLECTIONS.units, 'units')
}

console.log('▶ Firestore rules — Admin-only planning collections')
{
  const rules = read('firestore.rules')
  for (const matchLine of [
    'match /meqatiMansoobas/{docId}',
    'match /objectives/{docId}',
    'match /units/{docId}',
  ]) {
    const block = extractRulesBlock(rules, matchLine)
    assertIncludes(block, 'isAdministrator()', `${matchLine} Admin gate`)
    assertIncludes(block, 'allow delete: if false', `${matchLine} no client delete`)
    assertNotIncludes(block, 'isRukn()', `${matchLine} no Rukn access`)
  }
}

console.log('▶ provider wiring (local + firestore factories; single provider)')
{
  const provider = read('src/repositories/provider.ts')
  assertIncludes(
    provider,
    'meqatiMansooba: new MeqatiMansoobaLocalRepository()',
    'local Mansooba repo',
  )
  assertIncludes(
    provider,
    'objective: new ObjectiveLocalRepository()',
    'local Objective repo',
  )
  assertIncludes(provider, 'const unit = new UnitLocalRepository()', 'local Unit repo')
  assertIncludes(
    provider,
    'meqatiMansooba: new MeqatiMansoobaFirestoreRepository()',
    'firestore Mansooba repo',
  )
  assertIncludes(
    provider,
    'objective: new ObjectiveFirestoreRepository()',
    'firestore Objective repo',
  )
  assertIncludes(provider, 'const unit = new UnitFirestoreRepository()', 'firestore Unit repo')
  assertIncludes(provider, 'getRepositoryProviderMode()', 'single mode switch')
  assertIncludes(provider, "=== 'firestore'", 'firestore mode branch')
  assertNotIncludes(provider, 'createPlanningProvider', 'no second provider')

  resetRepositoryProviderForTests()
  assert.equal(getRepositoryProviderMode(), 'local')
  const repos = getRepositories()
  assert.ok(repos.meqatiMansooba)
  assert.ok(repos.objective)
  assert.ok(repos.unit)
}

console.log('▶ local durable CRUD smoke')
{
  resetRepositoryProviderForTests()
  clearLocalPlanningForTests()
  const repos = getRepositories()

  const unit: Unit = {
    id: 'unit-basavakalyan-verify',
    name: 'Basavakalyan',
    status: 'active',
    placeAliases: ['Basavakalyan'],
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const unitSaved = await repos.unit.saveDurable(unit)
  assert.equal(unitSaved.ok, true)
  const unitLoaded = repos.unit.getById(unit.id)
  assert.equal(unitLoaded.ok, true)
  assert.equal(unitLoaded.ok ? unitLoaded.data?.name : undefined, 'Basavakalyan')
  assert.equal(repos.unit.loadAll().data?.length, 1)

  const mansooba: MeqatiMansooba = {
    id: 'mansooba-verify-1',
    name: 'Verify Mansooba',
    status: 'active',
    primaryUnitId: unit.id,
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const mansoobaSaved = await repos.meqatiMansooba.saveDurable(mansooba)
  assert.equal(mansoobaSaved.ok, true)
  assert.equal(repos.meqatiMansooba.getActive().data?.id, mansooba.id)
  assert.equal(repos.meqatiMansooba.loadAll().data?.length, 1)
  assert.equal(repos.meqatiMansooba.getById(mansooba.id).data?.name, 'Verify Mansooba')

  const objective: PlanningObjective = {
    id: 'objective-verify-1',
    mansoobaId: mansooba.id,
    title: 'Verify Objective',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const objectiveSaved = await repos.objective.saveDurable(objective)
  assert.equal(objectiveSaved.ok, true)
  assert.equal(repos.objective.listByMansoobaId(mansooba.id).data?.length, 1)
  assert.equal(repos.objective.getById(objective.id).data?.title, 'Verify Objective')
  assert.equal(repos.objective.loadAll().data?.length, 1)

  const missingParent = await repos.objective.saveDurable({
    ...objective,
    id: 'objective-verify-bad',
    mansoobaId: '',
  })
  assert.equal(missingParent.ok, false)
  if (!missingParent.ok) {
    assert.equal(missingParent.error.code, 'Validation')
  }

  clearLocalPlanningForTests()
}

console.log('▶ Firestore durable write pattern (await writeDoc)')
{
  const firestoreRepo = read('src/repositories/firestore/planningFirestoreRepositories.ts')
  assertIncludes(firestoreRepo, 'await writeDoc(', 'await durable writeDoc')
  assertIncludes(
    firestoreRepo,
    'soft-skip ${label} (permission-denied)',
    'permission-denied soft-skip',
  )
  assertIncludes(firestoreRepo, 'return []', 'empty on soft-skip')
  assertNotIncludes(firestoreRepo, 'FIRESTORE_COLLECTIONS.campaigns', 'no campaign writes')
  assertNotIncludes(firestoreRepo, 'FIRESTORE_COLLECTIONS.karkuns', 'no karkun writes')
  assertNotIncludes(firestoreRepo, 'FIRESTORE_COLLECTIONS.rukns', 'no rukn writes')
}

console.log('▶ bootstrap / hydrate remains non-critical')
{
  const hydrate = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(hydrate, 'readPlanningCollectionsForClient', 'planning soft-read')
  assertIncludes(hydrate, 'applyPlanningHydrate', 'planning apply')

  const criticalFnStart = hydrate.indexOf('function readCriticalHydratePayload')
  const backgroundFnStart = hydrate.indexOf('function readBackgroundHydratePayload')
  assert.ok(criticalFnStart >= 0 && backgroundFnStart > criticalFnStart, 'hydrate fns present')
  const criticalBody = hydrate.slice(criticalFnStart, backgroundFnStart)
  assertNotIncludes(criticalBody, 'readPlanningCollectionsForClient', 'planning not critical')
  assertNotIncludes(criticalBody, 'meqatiMansoobas', 'planning collection not critical')

  const backgroundBody = hydrate.slice(backgroundFnStart, backgroundFnStart + 2500)
  assertIncludes(backgroundBody, 'readPlanningCollectionsForClient()', 'planning in background')
}

console.log('▶ data isolation — people untouched; Campaign FKs are references only')
{
  const people = read('src/types/karkun-registry.types.ts')
  assertNotIncludes(people, 'unitId', 'no unitId on karkun registry')
  assertNotIncludes(people, 'mansoobaId', 'no mansoobaId on karkun registry')

  const campaignRepo = read('src/repositories/interfaces/CampaignRepository.ts')
  assertNotIncludes(campaignRepo, 'saveDurable(', 'no full Campaign saveDurable')
  assertIncludes(campaignRepo, 'savePlanningLinksDurable', 'planning links write path present')
  assertIncludes(
    campaignRepo,
    'Must not synchronize Objective titles',
    'Campaign planning links forbid Objective dual-write',
  )

  const planningTypes = read('src/types/planning.types.ts')
  assertIncludes(planningTypes, 'No people unitId requirement', 'design isolation note')
  assertIncludes(planningTypes, 'No Campaign dual-write', 'no dual-write note')
}

console.log('KC Phase 1 planning persistence verify: PASS')
