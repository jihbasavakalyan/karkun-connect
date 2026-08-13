/**
 * Phase 4 — Rukn action dashboard + integration smoke (no live Firestore / GCP).
 * BATCH-04C / TASK-035–036. Run: npm run verify:kc-phase4-rukn-action-dashboard
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Rukn } from '@/data/ruknMaster'
import { nextWorkActionStatus } from '@/lib/work/lifecycle'
import { canActOnWork } from '@/lib/work/permissions'
import { listRuknWorkActionItems } from '@/lib/work/ruknActionItems'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalPlanningForTests } from '@/repositories/local/planningLocalRepositories'
import { clearLocalResponsibilitiesForTests } from '@/repositories/local/responsibilityLocalRepositories'
import { clearLocalWorkForTests } from '@/repositories/local/workLocalRepositories'
import type { Unit } from '@/types/planning.types'
import { type Responsibility } from '@/types/responsibility.types'
import { type Work } from '@/types/work.types'

const root = resolve(process.cwd())
const asOf = '2026-08-13'

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

const now = new Date().toISOString()

const seedRukn: Rukn = {
  id: 'R-action-verify',
  name: 'Action Verify Rukn',
  gender: 'Male',
  mobile: '9990004444',
  place: 'Basavakalyan',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'verify',
}

const otherRukn: Rukn = {
  id: 'R-action-other',
  name: 'Action Other Rukn',
  gender: 'Male',
  mobile: '9990005555',
  place: 'Basavakalyan',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'verify',
}

const seedUnit: Unit = {
  id: 'unit-action-verify',
  name: 'Basavakalyan',
  status: 'active',
  placeAliases: ['Basavakalyan'],
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

function responsibility(overrides: Partial<Responsibility> = {}): Responsibility {
  return {
    id: 'resp-action-1',
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

function work(overrides: Partial<Work> = {}): Work {
  return {
    id: 'work-action-1',
    title: 'Prepare attendance sheet',
    ruknId: seedRukn.id,
    unitId: seedUnit.id,
    responsibilityId: 'resp-action-1',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

console.log('▶ Home wiring — existing Rukn dashboard, no new nav/framework')
{
  const home = read('src/pages/rukn/RuknHomePage.tsx')
  assertIncludes(home, 'RuknWorkActionPanel', 'Work panel on Rukn Home')
  assertIncludes(home, 'What needs my action?', 'Rukn action dashboard on Home')
  assertIncludes(home, 'RuknMissionControlHero', 'existing mission hero retained')
  assertIncludes(home, 'CampaignExecutionMatrix', 'existing execution retained')

  const layout = read('src/layouts/RuknLayout.tsx')
  assertIncludes(layout, "label: 'Home'", 'Home nav retained')
  assertNotIncludes(layout, "label: 'Work'", 'no new Work nav item')
  assertNotIncludes(layout, 'RUKN_WORK', 'no new Work route constant in layout')

  const routes = read('src/constants/routes.ts')
  assertNotIncludes(routes, 'RUKN_WORK', 'no new Work route')

  const router = read('src/routes/AppRouter.tsx')
  assertNotIncludes(router, 'RuknWorkPage', 'no new Work page route')
  assertIncludes(router, 'path="tasks"', 'legacy tasks still redirect to Home')
}

console.log('▶ UI reuses TASK-034 helper; no duplicated permission engine')
{
  const panel = read('src/components/execution/RuknWorkActionPanel.tsx')
  assertIncludes(panel, 'listRuknWorkActionItems', 'list helper')
  assertIncludes(panel, 'canActOnWork', 'click-time permission guard')
  assertIncludes(panel, 'saveDurable', 'durable lifecycle write')
  assertIncludes(panel, 'formatPersistFailureBanner', 'persist failure banner')
  assertIncludes(panel, 'useBusyAction', 'loading lock')
  assertNotIncludes(panel, 'isResponsibilityInForce', 'UI does not reimplement tenure')
  assertNotIncludes(panel, 'permission matrix', 'no permission matrix')
  assertNotIncludes(panel, 'taskId', 'not a task UI')
  assertNotIncludes(panel, 'Kanban', 'no Kanban')
}

console.log('▶ next action is sequential only')
{
  assert.equal(nextWorkActionStatus('pending'), 'in_progress')
  assert.equal(nextWorkActionStatus('in_progress'), 'done')
  assert.equal(nextWorkActionStatus('done'), null)
}

console.log('▶ list helper: authorized pending/in-progress only; overdue; sort')
{
  const actor = { role: 'rukn' as const, ruknId: seedRukn.id }
  const inForce = responsibility()
  const expired = responsibility({
    id: 'resp-expired',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  })
  const archived = responsibility({ id: 'resp-archived', status: 'archived' })
  const rows = [inForce, expired, archived]

  const pendingOverdue = work({
    id: 'work-overdue',
    title: 'Overdue sheet',
    dueDate: '2026-08-01',
  })
  const inProgress = work({
    id: 'work-progress',
    title: 'In progress sheet',
    status: 'in_progress',
    dueDate: '2026-08-20',
  })
  const done = work({ id: 'work-done', title: 'Done sheet', status: 'done' })
  const noResp = work({
    id: 'work-no-resp',
    title: 'No responsibility',
    responsibilityId: undefined,
  })
  const expiredWork = work({
    id: 'work-expired',
    title: 'Expired tenure work',
    responsibilityId: expired.id,
  })
  const archivedWork = work({
    id: 'work-archived',
    title: 'Archived responsibility work',
    responsibilityId: archived.id,
  })
  const otherPersons = work({
    id: 'work-other',
    title: 'Other rukn work',
    ruknId: otherRukn.id,
  })

  const items = listRuknWorkActionItems(
    [inProgress, pendingOverdue, done, noResp, expiredWork, archivedWork, otherPersons],
    rows,
    actor,
    asOf,
  )
  assert.equal(items.length, 2)
  assert.equal(items[0]?.work.id, 'work-overdue', 'pending overdue first')
  assert.equal(items[0]?.overdue, true)
  assert.equal(items[0]?.dueLabel, 'Overdue')
  assert.equal(items[0]?.actionLabel, 'Start')
  assert.equal(items[0]?.nextStatus, 'in_progress')
  assert.equal(items[1]?.work.id, 'work-progress')
  assert.equal(items[1]?.actionLabel, 'Mark done')
  assert.equal(
    items.some((item) => item.work.id === 'work-done'),
    false,
    'done is not actionable',
  )
  assert.equal(
    items.some((item) => item.work.id === 'work-no-resp'),
    false,
    'missing Responsibility cannot grant access',
  )
  assert.equal(
    items.some((item) => item.work.id === 'work-expired'),
    false,
    'expired tenure cannot grant access',
  )
  assert.equal(
    items.some((item) => item.work.id === 'work-archived'),
    false,
    'archived Responsibility cannot grant access',
  )

  assert.equal(canActOnWork({ role: 'administrator' }, noResp, rows, asOf), true)
  assert.equal(canActOnWork(actor, noResp, rows, asOf), false)
}

console.log('▶ durable chain: Person → Responsibility → Unit → Work → action list → lifecycle')
{
  resetRepositoryProviderForTests()
  clearLocalPlanningForTests()
  clearLocalResponsibilitiesForTests()
  clearLocalWorkForTests()
  const repos = getRepositories()
  repos.rukn.saveAll([seedRukn, otherRukn])
  assert.equal((await repos.unit.saveDurable(seedUnit)).ok, true)
  const inForce = responsibility()
  assert.equal((await repos.responsibility.saveDurable(inForce)).ok, true)
  const created = work({ dueDate: '2026-08-10' })
  assert.equal((await repos.work.saveDurable(created)).ok, true)

  const actor = { role: 'rukn' as const, ruknId: seedRukn.id }
  const listed = listRuknWorkActionItems(
    [...(repos.work.listByRuknId(seedRukn.id).data ?? [])],
    [...(repos.responsibility.listByRuknId(seedRukn.id).data ?? [])],
    actor,
    asOf,
  )
  assert.equal(listed.length, 1)
  assert.equal(listed[0]?.nextStatus, 'in_progress')

  const started = await repos.work.saveDurable({
    ...created,
    status: 'in_progress',
    updatedAt: now,
  })
  assert.equal(started.ok, true)
  const afterStart = listRuknWorkActionItems(
    [...(repos.work.listByRuknId(seedRukn.id).data ?? [])],
    [...(repos.responsibility.listByRuknId(seedRukn.id).data ?? [])],
    actor,
    asOf,
  )
  assert.equal(afterStart[0]?.nextStatus, 'done')
  assert.equal(afterStart[0]?.actionLabel, 'Mark done')

  const finished = await repos.work.saveDurable({
    ...repos.work.getById(created.id).data!,
    status: 'done',
    updatedAt: now,
  })
  assert.equal(finished.ok, true)
  const afterDone = listRuknWorkActionItems(
    [...(repos.work.listByRuknId(seedRukn.id).data ?? [])],
    [...(repos.responsibility.listByRuknId(seedRukn.id).data ?? [])],
    actor,
    asOf,
  )
  assert.equal(afterDone.length, 0, 'done Work leaves the action surface')

  const person = repos.rukn.loadAll().data?.find((row) => row.id === seedRukn.id)
  assert.ok(person)
  assert.equal('unitId' in person, false)
  assert.equal(FIRESTORE_COLLECTIONS.work, 'work')
  assert.equal(FIRESTORE_COLLECTIONS.responsibilities, 'responsibilities')
}

console.log('▶ SoT isolation — no Task/Activity; people schema untouched')
{
  const workTypes = read('src/types/work.types.ts')
  assertNotIncludes(workTypes, 'taskId', 'Work is not a task')
  assertNotIncludes(workTypes, 'activityId', 'Work is not an activity')
  const people = read('src/types/people.types.ts')
  assertNotIncludes(people, 'unitId', 'people types have no unitId')
  const helper = read('src/lib/work/ruknActionItems.ts')
  assertIncludes(helper, 'canActOnWork', 'reuses TASK-034')

  const workFs = read('src/repositories/firestore/workFirestoreRepositories.ts')
  assertIncludes(
    workFs,
    "where('ruknId', '==', scope.ruknId)",
    'Rukn-scoped Work hydrate',
  )
  const respFs = read(
    'src/repositories/firestore/responsibilityFirestoreRepositories.ts',
  )
  assertIncludes(
    respFs,
    "where('ruknId', '==', scope.ruknId)",
    'Rukn-scoped Responsibility hydrate',
  )
}

clearLocalWorkForTests()
clearLocalResponsibilitiesForTests()
clearLocalPlanningForTests()
resetRepositoryProviderForTests()

console.log('verify:kc-phase4-rukn-action-dashboard OK')
