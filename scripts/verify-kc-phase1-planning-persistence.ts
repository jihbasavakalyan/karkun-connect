/**
 * Phase 1 — Planning persistence local smoke (no live Firestore / GCP).
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
  assertIncludes(rules, 'match /meqatiMansoobas/{docId}', 'meqatiMansoobas match')
  assertIncludes(rules, 'match /objectives/{docId}', 'objectives match')
  assertIncludes(rules, 'match /units/{docId}', 'units match')
  const block = rules.slice(rules.indexOf('match /meqatiMansoobas/{docId}'))
  assertIncludes(block, 'isAdministrator()', 'Admin gate')
  assertIncludes(block, 'allow delete: if false', 'no client delete')
}

console.log('▶ provider wiring')
{
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
  assert.equal(repos.unit.getById(unit.id).ok && repos.unit.getById(unit.id).data?.name, 'Basavakalyan')

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

console.log('▶ background hydrate soft-read wired')
{
  const hydrate = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(hydrate, 'readPlanningCollectionsForClient', 'planning soft-read')
  assertIncludes(hydrate, 'applyPlanningHydrate', 'planning apply')
}

console.log('KC Phase 1 planning persistence verify: PASS')
