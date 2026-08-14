/**
 * Phase 2 — Campaign optional planning links (mansoobaId / objectiveIds).
 * Local/non-production only. Run: npm run verify:kc-phase2-campaign-planning-links
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'

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

console.log('▶ type: optional planning FKs on CampaignListItem')
{
  const types = read('src/constants/mockMissions.ts')
  assertIncludes(types, 'mansoobaId?: string', 'optional mansoobaId')
  assertIncludes(types, 'objectiveIds?: string[]', 'optional objectiveIds')
  assertIncludes(types, 'activityIds?: string[]', 'optional activityIds')
  assertIncludes(types, 'objective: string', 'required objective copy retained')
  assertIncludes(types, 'objectives: string[]', 'required objectives copy retained')
}

console.log('▶ write path: merge-only (not writeDoc full replace)')
{
  const firestoreRepo = read('src/repositories/firestore/firestoreRepositories.ts')
  const methodStart = firestoreRepo.indexOf('async savePlanningLinksDurable')
  assert.ok(methodStart >= 0, 'savePlanningLinksDurable present')
  const methodBody = firestoreRepo.slice(methodStart, methodStart + 2200)
  assertIncludes(methodBody, '{ merge: true }', 'setDoc merge true')
  assertIncludes(methodBody, 'setDoc(', 'uses setDoc')
  assertNotIncludes(methodBody, 'writeDoc(', 'does not use writeDoc full replace')
  assertIncludes(methodBody, 'next.objective = current.objective', 'preserves objective copy')
  assertIncludes(
    methodBody,
    'next.objectives = [...current.objectives]',
    'preserves objectives[] copy',
  )
}

console.log('▶ local: legacy campaign loads; FKs optional; copy preserved')
{
  resetRepositoryProviderForTests()
  const repos = getRepositories()

  const legacy = repos.campaign.getById(ACTIVE_CAMPAIGN_ID)
  assert.equal(legacy.ok, true)
  assert.ok(legacy.ok && legacy.data)
  const before = legacy.data!
  assert.equal(before.mansoobaId, undefined)
  assert.equal(before.objectiveIds, undefined)
  const objectiveCopy = before.objective
  const objectivesCopy = [...before.objectives]

  const saved = await repos.campaign.savePlanningLinksDurable({
    id: ACTIVE_CAMPAIGN_ID,
    mansoobaId: 'mansooba-verify-link',
    objectiveIds: ['objective-verify-a', 'objective-verify-b'],
  })
  assert.equal(saved.ok, true)
  if (!saved.ok) throw new Error('expected ok')
  assert.equal(saved.data.mansoobaId, 'mansooba-verify-link')
  assert.deepEqual(saved.data.objectiveIds, [
    'objective-verify-a',
    'objective-verify-b',
  ])
  assert.equal(saved.data.objective, objectiveCopy)
  assert.deepEqual(saved.data.objectives, objectivesCopy)
  assert.equal(saved.data.name, before.name)
  assert.equal(saved.data.status, before.status)
  assert.equal(saved.data.startDate, before.startDate)
  assert.equal(saved.data.endDate, before.endDate)

  const reloaded = repos.campaign.getById(ACTIVE_CAMPAIGN_ID)
  assert.equal(reloaded.ok && reloaded.data?.mansoobaId, 'mansooba-verify-link')
  assert.deepEqual(reloaded.ok ? reloaded.data?.objectives : undefined, objectivesCopy)

  const missing = await repos.campaign.savePlanningLinksDurable({
    id: 'campaign-does-not-exist',
    mansoobaId: 'x',
  })
  assert.equal(missing.ok, false)
  if (!missing.ok) {
    assert.equal(missing.error.code, 'Validation')
  }
}

console.log('▶ SoT: planning link save must not rewrite objectives from Objective titles')
{
  const localRepo = read('src/repositories/local/localRepositories.ts')
  const methodStart = localRepo.indexOf('async savePlanningLinksDurable')
  assert.ok(methodStart >= 0, 'local savePlanningLinksDurable present')
  const methodBody = localRepo.slice(methodStart, methodStart + 1800)
  assertIncludes(methodBody, 'next.objective = current.objective', 'local preserves objective')
  assertIncludes(
    methodBody,
    'next.objectives = [...current.objectives]',
    'local preserves objectives[]',
  )
  assertNotIncludes(methodBody, 'objective.title', 'no Objective title sync')
  assertNotIncludes(methodBody, 'PlanningObjective', 'no Objective entity coupling')
}

console.log('KC Phase 2 campaign planning links verify: PASS')
