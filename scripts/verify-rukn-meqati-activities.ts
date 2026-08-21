/**
 * Rukn Meqati سرگرمی context — responsibleRuknId read path (no live Firestore / GCP).
 * Run: npm run verify:rukn-meqati-activities
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES } from '@/constants/routes'
import { buildRuknMeqatiActivities } from '@/lib/rukn/ruknMeqatiActivities'
import { canReadLocalProgrammeAsResponsible } from '@/lib/planning/localProgrammePermissions'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalProgrammesForTests } from '@/repositories/local/localProgrammeLocalRepositories'
import {
  seedLocalPlanningParentForTests,
  VERIFY_ACTIVITY_OBJECTIVE_ID,
  VERIFY_ACTIVITY_MANSOOBA_ID,
  VERIFY_ACTIVITY_SHOBAH_ID,
} from '@/repositories/local/planningLocalRepositories'
import { clearLocalResponsibilitiesForTests } from '@/repositories/local/responsibilityLocalRepositories'
import { clearLocalWorkForTests } from '@/repositories/local/workLocalRepositories'
import type { LocalProgramme } from '@/types/localProgramme.types'

const root = resolve(process.cwd())
const now = new Date().toISOString()
const ruknA = 'R-meqati-a'
const ruknB = 'R-meqati-b'

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

function programme(overrides: Partial<LocalProgramme> = {}): LocalProgramme {
  return {
    id: 'activity-meqati-a',
    mansoobaId: VERIFY_ACTIVITY_MANSOOBA_ID,
    shobahId: VERIFY_ACTIVITY_SHOBAH_ID,
    objectiveId: VERIFY_ACTIVITY_OBJECTIVE_ID,
    name: 'ہفتہ وار اجتماع',
    kind: 'weekly_ijtema',
    status: 'active',
    responsibleRuknId: ruknA,
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

console.log('▶ Home wiring — existing Rukn action surface, no planning clone')
{
  const home = read('src/pages/rukn/RuknHomePage.tsx')
  assertIncludes(home, 'RuknMeqatiActivitiesPanel', 'Meqati activities on Rukn Home')
  assertIncludes(home, 'RuknWorkActionPanel', 'Work panel retained')
  assertIncludes(home, 'RuknActionDashboardPanel', 'action dashboard retained')
  assertIncludes(home, 'What needs my action?', 'action question retained')

  const panel = read('src/components/rukn/RuknMeqatiActivitiesPanel.tsx')
  assertIncludes(panel, 'buildRuknMeqatiActivities', 'uses read model')
  assertIncludes(panel, 'میری میقاتی سرگرمیاں', 'Urdu activity heading')
  assertNotIncludes(panel, 'saveDurable', 'panel is read-only')
  assertNotIncludes(panel, 'AdminPlanning', 'not an Admin Planning clone')
  assertNotIncludes(panel, '<select', 'no ذمہ دار editor')
  assertNotIncludes(panel, '<input', 'no planning fields')

  const routes = read('src/constants/routes.ts')
  assertNotIncludes(routes, 'RUKN_MEQATI', 'no new Rukn Meqati route')
  assertNotIncludes(routes, 'RUKN_PLANNING', 'no Rukn planning route')

  const layout = read('src/layouts/RuknLayout.tsx')
  assertNotIncludes(layout, 'Planning', 'no Planning nav for Rukn')
}

console.log('▶ no Work / Responsibility sync in the Rukn activity path')
{
  const model = read('src/lib/rukn/ruknMeqatiActivities.ts')
  assertIncludes(model, 'listByResponsibleRuknId', 'scoped repository read')
  assertIncludes(model, 'canReadLocalProgrammeAsResponsible', 'authorization helper')
  assertNotIncludes(model, 'repos.work', 'does not read Work as SoT')
  assertNotIncludes(model, 'repos.responsibility', 'does not read Standing Responsibility')
  assertNotIncludes(model, 'saveDurable', 'read model does not persist')
  assertNotIncludes(model, 'FIRESTORE_COLLECTIONS.work', 'no work collection')
  assertNotIncludes(model, 'FIRESTORE_COLLECTIONS.responsibilities', 'no responsibilities collection')

  const hydrate = read(
    'src/repositories/firestore/localProgrammeFirestoreRepositories.ts',
  )
  assertIncludes(hydrate, "where('responsibleRuknId', '==', scope.ruknId)", 'server-scoped hydrate')
  assertNotIncludes(hydrate, 'FIRESTORE_COLLECTIONS.work', 'hydrate does not write work')
  assertNotIncludes(
    hydrate,
    'FIRESTORE_COLLECTIONS.responsibilities',
    'hydrate does not write responsibilities',
  )
}

console.log('▶ Firestore rules — Rukn read scoped to responsibleRuknId; Admin writes')
{
  const rules = read('firestore.rules')
  const block = extractRulesBlock(rules, 'match /localProgrammes/{docId}')
  assertIncludes(block, 'responsibleRuknId', 'scoped field')
  assertIncludes(block, 'isRukn()', 'Rukn read')
  assertIncludes(block, 'allow create, update: if isAdministrator()', 'Admin-only writes')
  assertIncludes(block, 'allow delete: if false', 'no client delete')
  assert.equal(FIRESTORE_COLLECTIONS.localProgrammes, 'localProgrammes')
  assert.ok(
    !Object.values(FIRESTORE_COLLECTIONS).includes('ruknActivities'),
    'no new ruknActivities collection',
  )
  assert.ok(
    !Object.values(FIRESTORE_COLLECTIONS).includes('programmeMaster'),
    'no Programme Master collection',
  )
}

console.log('▶ authorization helper + repository isolation')
{
  resetRepositoryProviderForTests()
  clearLocalProgrammesForTests()
  clearLocalWorkForTests()
  clearLocalResponsibilitiesForTests()
  await seedLocalPlanningParentForTests()
  const repos = getRepositories()

  const workBefore = repos.work.loadAll().data?.length ?? 0
  const responsibilityBefore = repos.responsibility.loadAll().data?.length ?? 0

  const own = programme({
    frequency: { cadence: 'weekly', dayOfWeek: 0 },
    yearStatuses: { '2026-27': 'in_progress' },
  })
  const other = programme({
    id: 'activity-meqati-b',
    name: 'ماہانہ بیت المال',
    kind: 'monthly_baitul_maal',
    responsibleRuknId: ruknB,
  })
  const unassigned = programme({
    id: 'activity-meqati-open',
    name: 'Unassigned activity',
    kind: 'other',
    responsibleRuknId: undefined,
  })

  assert.equal((await repos.localProgramme.saveDurable(own)).ok, true)
  assert.equal((await repos.localProgramme.saveDurable(other)).ok, true)
  assert.equal((await repos.localProgramme.saveDurable(unassigned)).ok, true)

  assert.equal(repos.work.loadAll().data?.length, workBefore, 'assigning ذمہ دار does not create Work')
  assert.equal(
    repos.responsibility.loadAll().data?.length,
    responsibilityBefore,
    'assigning ذمہ دار does not create Standing Responsibility',
  )

  assert.equal(repos.localProgramme.listByResponsibleRuknId(ruknA).data?.length, 1)
  assert.equal(repos.localProgramme.listByResponsibleRuknId(ruknB).data?.length, 1)
  assert.equal(repos.localProgramme.listByResponsibleRuknId(ruknA).data?.[0]?.id, own.id)
  assert.equal(repos.localProgramme.listByResponsibleRuknId('').data?.length, 0)

  const actorA = { role: 'rukn' as const, ruknId: ruknA }
  assert.equal(canReadLocalProgrammeAsResponsible(actorA, own), true)
  assert.equal(canReadLocalProgrammeAsResponsible(actorA, other), false)
  assert.equal(canReadLocalProgrammeAsResponsible(actorA, unassigned), false)
  assert.equal(
    canReadLocalProgrammeAsResponsible({ role: 'administrator' }, other),
    true,
  )

  const itemsA = buildRuknMeqatiActivities(ruknA, '2026-08-20')
  const itemsB = buildRuknMeqatiActivities(ruknB, '2026-08-20')
  assert.equal(itemsA.length, 1)
  assert.equal(itemsA[0]?.id, own.id)
  assert.equal(itemsA[0]?.shobahName, 'Verify Shobah')
  assert.equal(itemsA[0]?.objectiveTitle, 'Verify Objective')
  assert.equal(itemsA[0]?.scheduleLabel, 'ہفتہ وار')
  assert.equal(itemsA[0]?.yearStatusLabel, 'جاری')
  assert.equal(itemsA[0]?.action?.href, ROUTES.RUKN_WEEKLY_IJTEMA)
  assert.ok(!itemsA.some((item) => item.id === other.id), 'does not expose another Rukn activity')
  assert.ok(!itemsA.some((item) => item.id === unassigned.id), 'unassigned not listed')
  assert.equal(itemsB.length, 1)
  assert.equal(itemsB[0]?.id, other.id)
  assert.equal(itemsB[0]?.action?.href, ROUTES.RUKN_MONTHLY_BAITUL_MAAL)
  assert.equal(itemsB[0]?.scheduleLabel, null)
  assert.equal(itemsB[0]?.yearStatusLabel, null)

  const otherKind = programme({
    id: 'activity-meqati-other',
    name: 'دیگر سرگرمی',
    kind: 'other',
    responsibleRuknId: ruknA,
  })
  assert.equal((await repos.localProgramme.saveDurable(otherKind)).ok, true)
  const withOther = buildRuknMeqatiActivities(ruknA, '2026-08-20')
  assert.equal(withOther.length, 2)
  assert.equal(withOther.find((item) => item.id === otherKind.id)?.action, null)

  clearLocalProgrammesForTests()
  clearLocalWorkForTests()
  clearLocalResponsibilitiesForTests()
}

console.log('KC Rukn Meqati activities verify: PASS')
