/**
 * Phase 4 — Responsibility foundation local smoke (no live Firestore / GCP).
 * BATCH-04A / TASK-028–031. Run: npm run verify:kc-phase4-responsibility-foundation
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Rukn } from '@/data/ruknMaster'
import {
  isResponsibilityInForce,
  isResponsibilityTenureValid,
  listInForceResponsibilities,
} from '@/lib/responsibility/tenure'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  getRepositoryProviderMode,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalPlanningForTests } from '@/repositories/local/planningLocalRepositories'
import { clearLocalResponsibilitiesForTests } from '@/repositories/local/responsibilityLocalRepositories'
import type { Unit } from '@/types/planning.types'
import {
  createResponsibilityId,
  type Responsibility,
} from '@/types/responsibility.types'

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

const seedRukn: Rukn = {
  id: 'R-resp-verify',
  name: 'Responsibility Verify Rukn',
  gender: 'Male',
  mobile: '9990001111',
  place: 'Basavakalyan',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'verify',
}

const seedUnit: Unit = {
  id: 'unit-resp-verify',
  name: 'Basavakalyan',
  status: 'active',
  placeAliases: ['Basavakalyan'],
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

console.log('▶ collection constants')
{
  assert.equal(FIRESTORE_COLLECTIONS.responsibilities, 'responsibilities')
  assert.equal(FIRESTORE_COLLECTIONS.units, 'units')
  assert.equal(FIRESTORE_COLLECTIONS.rukns, 'rukns')
}

console.log('▶ Firestore rules — Admin-only responsibilities')
{
  const rules = read('firestore.rules')
  const matchLine = 'match /responsibilities/{docId}'
  const block = extractRulesBlock(rules, matchLine)
  assertIncludes(block, 'isAdministrator()', `${matchLine} Admin gate`)
  assertIncludes(block, 'allow delete: if false', `${matchLine} no client delete`)
  assertNotIncludes(block, 'isRukn()', `${matchLine} no Rukn access`)
}

console.log('▶ provider wiring (local + firestore; Unit + Rukn injection)')
{
  const provider = read('src/repositories/provider.ts')
  assertIncludes(
    provider,
    'responsibility: new ResponsibilityLocalRepository(unit, rukn)',
    'local Responsibility repo',
  )
  assertIncludes(
    provider,
    'responsibility: new ResponsibilityFirestoreRepository(unit, rukn)',
    'firestore Responsibility repo',
  )
  assertIncludes(provider, 'getRepositoryProviderMode()', 'single mode switch')
  assertNotIncludes(provider, 'createResponsibilityProvider', 'no second provider')

  resetRepositoryProviderForTests()
  assert.equal(getRepositoryProviderMode(), 'local')
  const repos = getRepositories()
  assert.ok(repos.responsibility)
  assert.ok(repos.unit)
  assert.ok(repos.rukn)
}

console.log('▶ tenure helpers (inclusive window; open-ended; archived never in-force)')
{
  assert.equal(isResponsibilityTenureValid('2026-01-01'), true)
  assert.equal(isResponsibilityTenureValid('2026-01-01', '2026-12-31'), true)
  assert.equal(isResponsibilityTenureValid('2026-01-01', '2026-01-01'), true)
  assert.equal(isResponsibilityTenureValid('2026-06-01', '2026-01-01'), false)
  assert.equal(isResponsibilityTenureValid('13-08-2026'), false)
  assert.equal(isResponsibilityTenureValid('2026-01-01', 'not-a-date'), false)

  const open: Responsibility = baseResponsibility({ id: 'resp-tenure-open' })
  assert.equal(isResponsibilityInForce(open, '2025-12-31'), false)
  assert.equal(isResponsibilityInForce(open, '2026-01-01'), true)
  assert.equal(isResponsibilityInForce(open, '2026-08-13'), true)

  const closed = baseResponsibility({
    id: 'resp-tenure-closed',
    endDate: '2026-06-30',
  })
  assert.equal(isResponsibilityInForce(closed, '2026-06-30'), true)
  assert.equal(isResponsibilityInForce(closed, '2026-07-01'), false)

  const archived = baseResponsibility({
    id: 'resp-tenure-archived',
    status: 'archived',
  })
  assert.equal(isResponsibilityInForce(archived, '2026-08-13'), false)
}

console.log('▶ local durable CRUD + Unit/Rukn parent validation + simultaneous tenures')
{
  resetRepositoryProviderForTests()
  clearLocalPlanningForTests()
  clearLocalResponsibilitiesForTests()
  const repos = getRepositories()

  repos.rukn.saveAll([seedRukn])
  const savedUnit = await repos.unit.saveDurable(seedUnit)
  assert.equal(savedUnit.ok, true)

  const first = baseResponsibility({
    id: 'resp-verify-1',
    nature: 'Weekly Ijtema in-charge',
  })
  const savedFirst = await repos.responsibility.saveDurable(first)
  assert.equal(savedFirst.ok, true)
  assert.equal(repos.responsibility.getById(first.id).data?.nature, first.nature)
  assert.equal(repos.responsibility.listByRuknId(seedRukn.id).data?.length, 1)
  assert.equal(repos.responsibility.listByUnitId(seedUnit.id).data?.length, 1)

  const second = baseResponsibility({
    id: 'resp-verify-2',
    nature: 'Bait-ul-Maal in-charge',
    startDate: '2026-03-01',
    endDate: '2026-12-31',
  })
  const savedSecond = await repos.responsibility.saveDurable(second)
  assert.equal(savedSecond.ok, true)
  assert.equal(repos.responsibility.listByRuknId(seedRukn.id).data?.length, 2)

  const inForce = listInForceResponsibilities(
    [...(repos.responsibility.loadAll().data ?? [])],
    { ruknId: seedRukn.id, asOfDate: '2026-08-13' },
  )
  assert.equal(inForce.length, 2, 'same person may hold two in-force responsibilities')

  const roundTrip = JSON.parse(JSON.stringify(first)) as Responsibility
  assert.equal(roundTrip.ruknId, seedRukn.id)
  assert.equal(roundTrip.unitId, seedUnit.id)
  assert.equal(roundTrip.startDate, '2026-01-01')

  const missingUnit = await repos.responsibility.saveDurable(
    baseResponsibility({ id: 'resp-bad-unit', unitId: 'unit-does-not-exist' }),
  )
  assert.equal(missingUnit.ok, false)
  if (!missingUnit.ok) assert.equal(missingUnit.error.code, 'Validation')

  const missingRukn = await repos.responsibility.saveDurable(
    baseResponsibility({ id: 'resp-bad-rukn', ruknId: 'R-does-not-exist' }),
  )
  assert.equal(missingRukn.ok, false)
  if (!missingRukn.ok) assert.equal(missingRukn.error.code, 'Validation')

  const badTenure = await repos.responsibility.saveDurable(
    baseResponsibility({
      id: 'resp-bad-tenure',
      startDate: '2026-12-01',
      endDate: '2026-01-01',
    }),
  )
  assert.equal(badTenure.ok, false)

  const archived = await repos.responsibility.saveDurable({
    ...first,
    status: 'archived',
    updatedAt: now,
  })
  assert.equal(archived.ok, true)
  assert.equal(repos.responsibility.getById(first.id).data?.status, 'archived')
  assert.equal(
    isResponsibilityInForce(repos.responsibility.getById(first.id).data!, '2026-08-13'),
    false,
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

console.log('▶ no delete path on Responsibility contract/impl')
{
  const iface = read('src/repositories/interfaces/ResponsibilityRepository.ts')
  assertNotIncludes(iface, 'delete', 'interface has no delete')
  const localImpl = read('src/repositories/local/responsibilityLocalRepositories.ts')
  assertNotIncludes(localImpl, 'async delete', 'local has no delete')
  const firestoreImpl = read(
    'src/repositories/firestore/responsibilityFirestoreRepositories.ts',
  )
  assertNotIncludes(firestoreImpl, 'async delete', 'firestore has no delete')
}

console.log('▶ Firestore durable write + soft hydrate + SoT isolation')
{
  const firestoreRepo = read(
    'src/repositories/firestore/responsibilityFirestoreRepositories.ts',
  )
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
  assertIncludes(hydrate, 'readResponsibilityCollectionsForClient', 'responsibility soft-read')
  assertIncludes(hydrate, 'applyResponsibilityHydrate', 'responsibility apply')

  const criticalFnStart = hydrate.indexOf('function readCriticalHydratePayload')
  const backgroundFnStart = hydrate.indexOf('function readBackgroundHydratePayload')
  assert.ok(criticalFnStart >= 0 && backgroundFnStart > criticalFnStart, 'hydrate fns present')
  const criticalBody = hydrate.slice(criticalFnStart, backgroundFnStart)
  assertNotIncludes(
    criticalBody,
    'readResponsibilityCollectionsForClient',
    'responsibilities not critical',
  )

  const backgroundBody = hydrate.slice(backgroundFnStart, backgroundFnStart + 4000)
  assertIncludes(
    backgroundBody,
    'readResponsibilityCollectionsForClient()',
    'responsibilities in background',
  )
}

console.log('▶ people schema and Work isolation')
{
  const people = read('src/types/people.types.ts')
  assertNotIncludes(people, 'unitId', 'people types have no unitId')
  const ruknMaster = read('src/data/ruknMaster.ts')
  assertNotIncludes(ruknMaster, 'unitId', 'Rukn type has no unitId')

  const types = read('src/types/responsibility.types.ts')
  assertNotIncludes(types, 'workId', 'Responsibility is not Work')
  assertNotIncludes(types, 'taskId', 'Responsibility is not a task')
  assertIncludes(types, 'ruknId', 'reuses existing Rukn id')
  assertIncludes(types, 'unitId', 'reuses existing Unit id')
}

clearLocalResponsibilitiesForTests()
clearLocalPlanningForTests()
resetRepositoryProviderForTests()

console.log('verify:kc-phase4-responsibility-foundation OK')
