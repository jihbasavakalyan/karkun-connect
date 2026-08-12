/**
 * Phase 4 — Work foundation local smoke (no live Firestore / GCP).
 * BATCH-04B / TASK-032–034. Run: npm run verify:kc-phase4-work-foundation
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Rukn } from '@/data/ruknMaster'
import { canActOnWork } from '@/lib/work/permissions'
import {
  isWorkStatusTransitionAllowed,
  validateWorkStatusTransition,
} from '@/lib/work/lifecycle'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  getRepositoryProviderMode,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalPlanningForTests } from '@/repositories/local/planningLocalRepositories'
import { clearLocalResponsibilitiesForTests } from '@/repositories/local/responsibilityLocalRepositories'
import { clearLocalWorkForTests } from '@/repositories/local/workLocalRepositories'
import type { Unit } from '@/types/planning.types'
import {
  createResponsibilityId,
  type Responsibility,
} from '@/types/responsibility.types'
import { createWorkId, type Work } from '@/types/work.types'

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
const asOf = '2026-08-13'

const seedRukn: Rukn = {
  id: 'R-work-verify',
  name: 'Work Verify Rukn',
  gender: 'Male',
  mobile: '9990002222',
  place: 'Basavakalyan',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'verify',
}

const otherRukn: Rukn = {
  id: 'R-work-other',
  name: 'Work Other Rukn',
  gender: 'Male',
  mobile: '9990003333',
  place: 'Basavakalyan',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'verify',
}

const seedUnit: Unit = {
  id: 'unit-work-verify',
  name: 'Basavakalyan',
  status: 'active',
  placeAliases: ['Basavakalyan'],
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

const otherUnit: Unit = {
  id: 'unit-work-other',
  name: 'Other Unit',
  status: 'active',
  placeAliases: ['Other'],
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

function baseResponsibility(overrides: Partial<Responsibility> = {}): Responsibility {
  return {
    id: createResponsibilityId(),
    ruknId: seedRukn.id,
    nature: 'Weekly Ijtema in-charge',
    unitId: seedUnit.id,
    startDate: '2026-01-01',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

function baseWork(overrides: Partial<Work> = {}): Work {
  return {
    id: createWorkId(),
    title: 'Prepare weekly ijtema attendance sheet',
    ruknId: seedRukn.id,
    unitId: seedUnit.id,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

console.log('▶ collection constants')
{
  assert.equal(FIRESTORE_COLLECTIONS.work, 'work')
  assert.equal(FIRESTORE_COLLECTIONS.responsibilities, 'responsibilities')
  assert.equal(FIRESTORE_COLLECTIONS.units, 'units')
  assert.equal(FIRESTORE_COLLECTIONS.rukns, 'rukns')
}

console.log('▶ Firestore rules — Work + Rukn read-own Responsibility')
{
  const rules = read('firestore.rules')

  const workLine = 'match /work/{docId}'
  const workBlock = extractRulesBlock(rules, workLine)
  assertIncludes(workBlock, 'isAdministrator()', `${workLine} Admin gate`)
  assertIncludes(workBlock, 'assignedToRukn(resource.data)', `${workLine} Rukn read-own`)
  assertIncludes(workBlock, 'allow create: if isAdministrator()', `${workLine} Admin create`)
  assertIncludes(workBlock, 'ruknMayActOnWork', `${workLine} contextual update`)
  assertIncludes(workBlock, 'allow delete: if false', `${workLine} no client delete`)

  const respLine = 'match /responsibilities/{docId}'
  const respBlock = extractRulesBlock(rules, respLine)
  assertIncludes(respBlock, 'assignedToRukn(resource.data)', `${respLine} Rukn read-own`)
  assertIncludes(
    respBlock,
    'allow create, update: if isAdministrator()',
    `${respLine} Admin writes`,
  )
  assertIncludes(respBlock, 'allow delete: if false', `${respLine} no client delete`)
}

console.log('▶ provider wiring (local + firestore; Unit + Rukn + Responsibility injection)')
{
  const provider = read('src/repositories/provider.ts')
  assertIncludes(
    provider,
    'work: new WorkLocalRepository(unit, rukn, responsibility)',
    'local Work repo',
  )
  assertIncludes(
    provider,
    'work: new WorkFirestoreRepository(unit, rukn, responsibility)',
    'firestore Work repo',
  )
  assertIncludes(provider, 'getRepositoryProviderMode()', 'single mode switch')
  assertNotIncludes(provider, 'createWorkProvider', 'no second provider')

  resetRepositoryProviderForTests()
  assert.equal(getRepositoryProviderMode(), 'local')
  const repos = getRepositories()
  assert.ok(repos.work)
  assert.ok(repos.responsibility)
  assert.ok(repos.unit)
  assert.ok(repos.rukn)
}

console.log('▶ lifecycle helpers (pending → in_progress → done; no skip/reverse/blocked)')
{
  assert.equal(isWorkStatusTransitionAllowed('pending', 'in_progress'), true)
  assert.equal(isWorkStatusTransitionAllowed('in_progress', 'done'), true)
  assert.equal(isWorkStatusTransitionAllowed('pending', 'pending'), true)
  assert.equal(isWorkStatusTransitionAllowed('pending', 'done'), false)
  assert.equal(isWorkStatusTransitionAllowed('done', 'pending'), false)
  assert.equal(isWorkStatusTransitionAllowed('done', 'in_progress'), false)
  assert.equal(isWorkStatusTransitionAllowed('in_progress', 'pending'), false)
  assert.equal(validateWorkStatusTransition(undefined, 'pending'), null)
  assert.ok(validateWorkStatusTransition(undefined, 'in_progress'))
  assert.ok(validateWorkStatusTransition('pending', 'done'))

  const lifecycle = read('src/lib/work/lifecycle.ts')
  assertNotIncludes(lifecycle, 'blocked', 'no Blocked status')
  assertNotIncludes(lifecycle, 'cancelled', 'no cancel lifecycle')
  assertNotIncludes(lifecycle, 'deferred', 'no defer lifecycle')
}

console.log('▶ local durable CRUD + Responsibility context + Unit/Rukn parents')
{
  resetRepositoryProviderForTests()
  clearLocalPlanningForTests()
  clearLocalResponsibilitiesForTests()
  clearLocalWorkForTests()
  const repos = getRepositories()

  repos.rukn.saveAll([seedRukn, otherRukn])
  assert.equal((await repos.unit.saveDurable(seedUnit)).ok, true)
  assert.equal((await repos.unit.saveDurable(otherUnit)).ok, true)

  const responsibility = baseResponsibility({ id: 'resp-work-verify-1' })
  assert.equal((await repos.responsibility.saveDurable(responsibility)).ok, true)

  const created = baseWork({
    id: 'work-verify-1',
    responsibilityId: responsibility.id,
    dueDate: '2026-08-20',
  })
  const saved = await repos.work.saveDurable(created)
  assert.equal(saved.ok, true)
  assert.equal(repos.work.getById(created.id).data?.title, created.title)
  assert.equal(repos.work.listByRuknId(seedRukn.id).data?.length, 1)
  assert.equal(repos.work.listByUnitId(seedUnit.id).data?.length, 1)
  assert.equal(repos.work.listByResponsibilityId(responsibility.id).data?.length, 1)

  const withoutResponsibility = await repos.work.saveDurable(
    baseWork({ id: 'work-verify-admin-only' }),
  )
  assert.equal(withoutResponsibility.ok, true, 'Admin may persist Work without Responsibility')

  const missingUnit = await repos.work.saveDurable(
    baseWork({ id: 'work-bad-unit', unitId: 'unit-does-not-exist' }),
  )
  assert.equal(missingUnit.ok, false)
  if (!missingUnit.ok) assert.equal(missingUnit.error.code, 'Validation')

  const missingRukn = await repos.work.saveDurable(
    baseWork({ id: 'work-bad-rukn', ruknId: 'R-does-not-exist' }),
  )
  assert.equal(missingRukn.ok, false)

  const missingResponsibility = await repos.work.saveDurable(
    baseWork({
      id: 'work-bad-resp',
      responsibilityId: 'responsibility-does-not-exist',
    }),
  )
  assert.equal(missingResponsibility.ok, false)

  const unitMismatch = await repos.work.saveDurable(
    baseWork({
      id: 'work-unit-mismatch',
      responsibilityId: responsibility.id,
      unitId: otherUnit.id,
      ruknId: seedRukn.id,
    }),
  )
  assert.equal(unitMismatch.ok, false)

  const personMismatch = await repos.work.saveDurable(
    baseWork({
      id: 'work-person-mismatch',
      responsibilityId: responsibility.id,
      ruknId: otherRukn.id,
    }),
  )
  assert.equal(personMismatch.ok, false)

  const createInProgress = await repos.work.saveDurable(
    baseWork({ id: 'work-create-in-progress', status: 'in_progress' }),
  )
  assert.equal(createInProgress.ok, false)
}

console.log('▶ lifecycle transitions on durable saves')
{
  const repos = getRepositories()
  const id = 'work-verify-1'
  const current = repos.work.getById(id).data
  assert.ok(current)
  assert.equal(current.status, 'pending')

  const skip = await repos.work.saveDurable({ ...current, status: 'done', updatedAt: now })
  assert.equal(skip.ok, false, 'pending → done is forbidden')

  const start = await repos.work.saveDurable({
    ...current,
    status: 'in_progress',
    updatedAt: now,
  })
  assert.equal(start.ok, true)
  assert.equal(repos.work.getById(id).data?.status, 'in_progress')

  const reverse = await repos.work.saveDurable({
    ...repos.work.getById(id).data!,
    status: 'pending',
    updatedAt: now,
  })
  assert.equal(reverse.ok, false, 'in_progress → pending is forbidden')

  const finish = await repos.work.saveDurable({
    ...repos.work.getById(id).data!,
    status: 'done',
    updatedAt: now,
  })
  assert.equal(finish.ok, true)
  assert.equal(repos.work.getById(id).data?.status, 'done')

  const reopen = await repos.work.saveDurable({
    ...repos.work.getById(id).data!,
    status: 'in_progress',
    updatedAt: now,
  })
  assert.equal(reopen.ok, false, 'done → in_progress is forbidden')
}

console.log('▶ contextual permissions (Admin + in-force Responsibility + Unit + Tenure)')
{
  const repos = getRepositories()
  const work = repos.work.getById('work-verify-1').data
  assert.ok(work)
  const rows = [...(repos.responsibility.loadAll().data ?? [])]
  const admin = { role: 'administrator' as const }
  const rukn = { role: 'rukn' as const, ruknId: seedRukn.id }
  const other = { role: 'rukn' as const, ruknId: otherRukn.id }

  assert.equal(canActOnWork(admin, work, rows, asOf), true, 'Admin retains administrative access')
  assert.equal(canActOnWork(rukn, work, rows, asOf), true, 'in-force Responsibility grants Rukn')

  const noResponsibility = repos.work.getById('work-verify-admin-only').data
  assert.ok(noResponsibility)
  assert.equal(
    canActOnWork(rukn, noResponsibility, rows, asOf),
    false,
    'missing Responsibility cannot grant Rukn access',
  )
  assert.equal(canActOnWork(admin, noResponsibility, rows, asOf), true)

  assert.equal(canActOnWork(other, work, rows, asOf), false, 'other Rukn denied')
  assert.equal(
    canActOnWork({ role: 'rukn' }, work, rows, asOf),
    false,
    'Rukn without ruknId denied',
  )
  assert.equal(
    canActOnWork(rukn, work, [], asOf),
    false,
    'invalid/missing Responsibility list cannot grant access',
  )

  const expired = baseResponsibility({
    id: 'resp-work-expired',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  })
  assert.equal((await repos.responsibility.saveDurable(expired)).ok, true)
  const expiredWork = baseWork({
    id: 'work-expired-resp',
    responsibilityId: expired.id,
  })
  assert.equal((await repos.work.saveDurable(expiredWork)).ok, true)
  const withExpired = [...(repos.responsibility.loadAll().data ?? [])]
  assert.equal(
    canActOnWork(rukn, expiredWork, withExpired, asOf),
    false,
    'expired tenure cannot grant Rukn access',
  )

  const archived = baseResponsibility({
    id: 'resp-work-archived',
    status: 'archived',
  })
  assert.equal((await repos.responsibility.saveDurable(archived)).ok, true)
  const archivedWork = baseWork({
    id: 'work-archived-resp',
    responsibilityId: archived.id,
  })
  assert.equal((await repos.work.saveDurable(archivedWork)).ok, true)
  const withArchived = [...(repos.responsibility.loadAll().data ?? [])]
  assert.equal(
    canActOnWork(rukn, archivedWork, withArchived, asOf),
    false,
    'archived Responsibility cannot grant Rukn access',
  )

  const future = baseResponsibility({
    id: 'resp-work-future',
    startDate: '2026-09-01',
  })
  assert.equal((await repos.responsibility.saveDurable(future)).ok, true)
  const futureWork = baseWork({
    id: 'work-future-resp',
    responsibilityId: future.id,
  })
  assert.equal((await repos.work.saveDurable(futureWork)).ok, true)
  const withFuture = [...(repos.responsibility.loadAll().data ?? [])]
  assert.equal(
    canActOnWork(rukn, futureWork, withFuture, asOf),
    false,
    'tenure not yet started cannot grant Rukn access',
  )
}

console.log('▶ person and Unit records are not mutated')
{
  const repos = getRepositories()
  const rukns = repos.rukn.loadAll()
  assert.equal(rukns.ok, true)
  const person = rukns.data.find((row) => row.id === seedRukn.id)
  assert.ok(person)
  assert.equal('unitId' in person, false)
  assert.equal(person.place, seedRukn.place)
  assert.equal(person.name, seedRukn.name)

  const unit = repos.unit.getById(seedUnit.id)
  assert.equal(unit.data?.name, seedUnit.name)
  assert.equal(unit.data?.status, 'active')
}

console.log('▶ no delete path on Work contract/impl')
{
  const iface = read('src/repositories/interfaces/WorkRepository.ts')
  assertNotIncludes(iface, 'delete', 'interface has no delete')
  const localImpl = read('src/repositories/local/workLocalRepositories.ts')
  assertNotIncludes(localImpl, 'async delete', 'local has no delete')
  const firestoreImpl = read('src/repositories/firestore/workFirestoreRepositories.ts')
  assertNotIncludes(firestoreImpl, 'async delete', 'firestore has no delete')
}

console.log('▶ Firestore durable write + soft hydrate + SoT isolation')
{
  const firestoreRepo = read('src/repositories/firestore/workFirestoreRepositories.ts')
  assertIncludes(firestoreRepo, 'await writeDoc(', 'await durable writeDoc')
  assertIncludes(
    firestoreRepo,
    'soft-skip ${label} (permission-denied)',
    'permission-denied soft-skip',
  )
  assertIncludes(firestoreRepo, 'units.getById', 'Unit parent lookup')
  assertIncludes(firestoreRepo, 'rukns.loadAll', 'Rukn parent lookup')
  assertNotIncludes(firestoreRepo, 'FIRESTORE_COLLECTIONS.karkuns', 'no karkun writes')
  assertNotIncludes(firestoreRepo, 'commitRuknDocuments', 'does not mutate rukns')
  assertNotIncludes(firestoreRepo, 'saveDurable(unit', 'does not mutate units')

  const hydrate = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(hydrate, 'readWorkCollectionsForClient', 'work soft-read')
  assertIncludes(hydrate, 'applyWorkHydrate', 'work apply')

  const criticalFnStart = hydrate.indexOf('function readCriticalHydratePayload')
  const backgroundFnStart = hydrate.indexOf('function readBackgroundHydratePayload')
  assert.ok(criticalFnStart >= 0 && backgroundFnStart > criticalFnStart, 'hydrate fns present')
  const criticalBody = hydrate.slice(criticalFnStart, backgroundFnStart)
  assertNotIncludes(criticalBody, 'readWorkCollectionsForClient', 'work not critical')

  const backgroundBody = hydrate.slice(backgroundFnStart, backgroundFnStart + 5000)
  assertIncludes(backgroundBody, 'readWorkCollectionsForClient()', 'work in background')
}

console.log('▶ people schema and Work/Responsibility isolation')
{
  const people = read('src/types/people.types.ts')
  assertNotIncludes(people, 'unitId', 'people types have no unitId')
  const ruknMaster = read('src/data/ruknMaster.ts')
  assertNotIncludes(ruknMaster, 'unitId', 'Rukn type has no unitId')

  const types = read('src/types/work.types.ts')
  assertIncludes(types, 'ruknId', 'reuses existing Rukn id')
  assertIncludes(types, 'unitId', 'reuses existing Unit id')
  assertIncludes(types, 'responsibilityId', 'optional Responsibility link')
  assertNotIncludes(types, 'taskId', 'Work is not a task')
  assertNotIncludes(types, 'activityId', 'Work is not an activity')
  assertNotIncludes(types, 'occurrenceId', 'Work does not modify Occurrence')
  assertNotIncludes(types, 'blocked', 'no Blocked field')

  const responsibilityTypes = read('src/types/responsibility.types.ts')
  assertNotIncludes(responsibilityTypes, 'workId', 'Responsibility is not a Work store')
}

clearLocalWorkForTests()
clearLocalResponsibilitiesForTests()
clearLocalPlanningForTests()
resetRepositoryProviderForTests()

console.log('verify:kc-phase4-work-foundation OK')
