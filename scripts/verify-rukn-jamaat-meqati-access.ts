/**
 * Rukn Jamaat-wide situation + full Meeqati Mansooba access.
 * Run: npx vite-node scripts/verify-rukn-jamaat-meqati-access.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildOrganisationalSituation } from '@/lib/dashboard/organisationalSituation'
import { resolveMeqatiYear } from '@/lib/dashboard/meqatiYear'
import { computeJamaatCurrentSituation, computeJamaatCurrentSituationCounts } from '@/lib/jamaat/computeJamaatCurrentSituation'
import { JAMAAT_CURRENT_SITUATION_DOC_ID } from '@/lib/jamaat/jamaatCurrentSituation'
import { computeRuknNameDirectory } from '@/lib/jamaat/computeRuknNameDirectory'
import { RUKN_NAME_DIRECTORY_DOC_ID } from '@/lib/jamaat/ruknNameDirectory'
import { getCanonicalConnectedKarkunCount } from '@/lib/connections/getConnectedKarkunsForRukn'
import { countOfficerPeopleByKind } from '@/lib/aRuknRegistry'
import { getAllKarkuns, getAllMuttafiqeen, getAllRukns, getPeopleStatistics } from '@/lib/peopleStore'
import { buildRuknMeqatiActivities } from '@/lib/rukn/ruknMeqatiActivities'
import { buildRuknOrganisationalInformation } from '@/lib/rukn/ruknOrganisationalInformation'
import { FIRESTORE_DOCS } from '@/repositories/firestore/collections'
import {
  applyJamaatCurrentSituationHydrate,
  applyJamaatSettingsDocumentSnapshot,
  applyRuknNameDirectoryHydrate,
  getJamaatCurrentSituationFromCache,
  resetJamaatReadModelCachesForTests,
} from '@/repositories/firestore/jamaatReadModelFirestore'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalProgrammesForTests } from '@/repositories/local/localProgrammeLocalRepositories'
import {
  seedLocalPlanningParentForTests,
  VERIFY_ACTIVITY_MANSOOBA_ID,
  VERIFY_ACTIVITY_OBJECTIVE_ID,
  VERIFY_ACTIVITY_SHOBAH_ID,
} from '@/repositories/local/planningLocalRepositories'
import type { LocalProgramme } from '@/types/localProgramme.types'

const root = resolve(process.cwd())
const now = new Date().toISOString()

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

function programme(overrides: Partial<LocalProgramme>): LocalProgramme {
  return {
    id: 'activity-jamaat-a',
    mansoobaId: VERIFY_ACTIVITY_MANSOOBA_ID,
    shobahId: VERIFY_ACTIVITY_SHOBAH_ID,
    objectiveId: VERIFY_ACTIVITY_OBJECTIVE_ID,
    name: 'سرگرمی الف',
    kind: 'other',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

console.log('▶ A — Jamaat aggregate equals Admin definitions')
{
  resetRepositoryProviderForTests()
  resetJamaatReadModelCachesForTests()
  const year = resolveMeqatiYear('2026-08-20')
  const admin = buildOrganisationalSituation(year)
  const computed = computeJamaatCurrentSituationCounts()
  const officers = countOfficerPeopleByKind(getAllRukns())
  const people = getPeopleStatistics()
  assert.equal(computed.rukns, officers.rukns)
  assert.equal(computed.aRukns, officers.aRukns)
  assert.equal(computed.karkuns, getAllKarkuns().length)
  assert.equal(computed.karkuns, people.totalMaleKarkuns + people.totalFemaleKarkuns)
  assert.equal(computed.muttafiqeen, people.totalMuttafiqeen)
  assert.equal(computed.muttafiqeen, getAllMuttafiqeen().length)
  assert.equal(computed.connections, getCanonicalConnectedKarkunCount())
  assert.equal(computed.connections, people.assignedKarkuns)
  assert.deepEqual(admin.people, computed)

  const snapshot = computeJamaatCurrentSituation('2026-08-20T00:00:00.000Z')
  applyJamaatCurrentSituationHydrate(snapshot)
  assert.deepEqual(getJamaatCurrentSituationFromCache(), snapshot)
  applyJamaatSettingsDocumentSnapshot('jamaatCurrentSituation', {
    ...snapshot,
    generatedAt: '2026-08-21T00:00:00.000Z',
  })
  assert.equal(getJamaatCurrentSituationFromCache()?.generatedAt, '2026-08-21T00:00:00.000Z')
  assert.equal(JAMAAT_CURRENT_SITUATION_DOC_ID, FIRESTORE_DOCS.jamaatCurrentSituation)
  assert.equal(RUKN_NAME_DIRECTORY_DOC_ID, FIRESTORE_DOCS.ruknNameDirectory)

  const jamaatCard = read('src/components/rukn/RuknHomeJamaatCurrentSituation.tsx')
  assertNotIncludes(jamaatCard, 'getAllKarkuns', 'Rukn does not read karkuns for the five numbers')
  assertNotIncludes(jamaatCard, 'getAllRukns', 'Rukn does not read rukns for the five numbers')
  assertNotIncludes(jamaatCard, 'getAllMuttafiqeen', 'Rukn does not read muttafiqeen for the five numbers')
  assertNotIncludes(jamaatCard, 'getCanonicalConnectedKarkunCount', 'Rukn does not scan connections for the five numbers')
  assertIncludes(jamaatCard, 'useJamaatReadModels', 'consumes allowlisted aggregate')
}

console.log('▶ B — connected Rukn information remains scoped + dual-Active exclusion')
{
  const orgInfo = read('src/lib/rukn/ruknOrganisationalInformation.ts')
  assertIncludes(orgInfo, 'getConnectedKarkunsForRukn', 'connected karkuns stay Rukn-scoped')
  assertIncludes(orgInfo, 'getRuknHomeMuttafiqRows', 'Home dual-Active Muttafiq exclusion unchanged')
  const connected = buildRuknOrganisationalInformation('R-does-not-exist', {
    peopleReady: true,
    programmesReady: false,
  })
  assert.equal(connected.people.karkuns, 0)
  assert.equal(connected.people.muttafiqeen, 0)
  assert.equal(connected.people.connections, 0)
}

console.log('▶ C — Meeqati highlights are Jamaat-wide, not responsible-Rukn filtered')
{
  resetRepositoryProviderForTests()
  clearLocalProgrammesForTests()
  await seedLocalPlanningParentForTests()
  const repos = getRepositories()
  await repos.localProgramme.saveDurable(
    programme({
      id: 'act-a',
      responsibleRuknId: 'R-meqati-a',
      yearStatuses: { '2026-27': 'completed' },
    }),
  )
  await repos.localProgramme.saveDurable(
    programme({
      id: 'act-b',
      name: 'سرگرمی ب',
      responsibleRuknId: 'R-meqati-b',
      yearStatuses: { '2026-27': 'in_progress' },
    }),
  )
  const year = resolveMeqatiYear('2026-08-20')
  const situation = buildOrganisationalSituation(year)
  const assignedA = buildRuknMeqatiActivities('R-meqati-a', '2026-08-20')
  assert.equal(situation.meqati.counts.activities, 2)
  assert.equal(situation.meqati.counts.completed, 1)
  assert.equal(situation.meqati.counts.inProgress, 1)
  assert.equal(assignedA.length, 1)
  assert.ok(situation.meqati.shobahs.length >= 1)
  const meqatiHome = read('src/components/rukn/RuknHomeMeqatiMansooba.tsx')
  assertIncludes(meqatiHome, 'useMeqatiYearSelection', 'Admin year vocabulary')
  assertIncludes(meqatiHome, 'situation.meqati.shobahs', 'same شعبہ breakdown')
  assert.ok(!meqatiHome.includes('buildRuknMeqatiActivities'), 'no responsible-only filtering')
}

console.log('▶ D — full plan read-only workspace')
{
  const dest = read('src/pages/rukn/RuknMeqatiMansoobaPage.tsx')
  assertIncludes(dest, 'MeqatiPlanningWorkspace', 'reuses workspace')
  assertIncludes(dest, 'readOnly', 'read-only mode')
  assert.ok(!dest.includes('saveDurable'), 'no planning writes')
  assert.ok(!dest.includes('meqatiMansooba.saveDurable'), 'no mansooba write')
  assert.ok(!dest.includes('AdminPlanningPage'), 'does not mount Admin page')
  const workspace = read('src/pages/admin/meqati/MeqatiPlanningWorkspace.tsx')
  assertIncludes(workspace, 'readOnly: true', 'typed read-only variant')
  const admin = read('src/pages/admin/AdminPlanningPage.tsx')
  assertIncludes(admin, 'saveDurable', 'Admin still writes')
  assertIncludes(admin, 'MeqatiPlanningWorkspace', 'Admin still uses workspace')
  assertNotIncludes(admin, 'readOnly', 'Admin remains editable')
}

console.log('▶ E — security rules minimum broadening')
{
  const rules = read('firestore.rules')
  const settings = extractRulesBlock(rules, 'match /settings/{docId}')
  assertIncludes(settings, "docId == 'jamaatCurrentSituation'", 'Rukn may read Jamaat aggregate')
  assertIncludes(settings, "docId == 'ruknNameDirectory'", 'Rukn may read names-only directory')
  assertNotIncludes(settings, "docId == 'jamaatCurrentSituation' && isRukn()", 'no extra Rukn write branch for aggregate')
  const ruknWrite = settings.slice(settings.indexOf('allow update:'))
  assertNotIncludes(
    ruknWrite.slice(0, ruknWrite.indexOf('allow delete:')),
    "docId == 'jamaatCurrentSituation'",
    'Rukn cannot update Jamaat aggregate',
  )

  const mansooba = extractRulesBlock(rules, 'match /meqatiMansoobas/{docId}')
  assertIncludes(mansooba, 'isRukn()', 'Rukn read mansoobas')
  assertIncludes(mansooba, 'allow create, update: if isAdministrator()', 'Admin-only mansooba writes')

  const programmes = extractRulesBlock(rules, 'match /localProgrammes/{docId}')
  assertIncludes(programmes, 'allow read: if isAdministrator() || isRukn()', 'Rukn read all required programmes')
  assertIncludes(programmes, 'allow create, update: if isAdministrator()', 'Admin-only programme writes')

  const units = extractRulesBlock(rules, 'match /units/{docId}')
  assertNotIncludes(units, 'isRukn()', 'units remain unavailable to Rukn')
  const occurrences = extractRulesBlock(rules, 'match /occurrences/{docId}')
  assertNotIncludes(occurrences, 'isRukn()', 'occurrences remain unavailable to Rukn')

  const rukns = extractRulesBlock(rules, 'match /rukns/{docId}')
  assertIncludes(rukns, 'docId == ruknId()', 'rukns stay self-read for Rukn')
  const karkuns = extractRulesBlock(rules, 'match /karkuns/{karkunId}')
  assertIncludes(karkuns, 'assignedRuknId == ruknId()', 'karkuns stay scoped')
  const connections = extractRulesBlock(rules, 'match /connections/{assignmentId}')
  assertIncludes(connections, 'assignedToRukn(resource.data)', 'connections stay scoped')
}

console.log('▶ names directory is names-only')
{
  const names = computeRuknNameDirectory('2026-08-20T00:00:00.000Z')
  applyRuknNameDirectoryHydrate(names)
  assert.ok(names.entries.length > 0)
  const sample = names.entries[0]
  assert.equal(Object.keys(sample).sort().join(','), 'id,name')
  const resolver = read('src/lib/jamaat/resolveResponsibleRuknDisplayName.ts')
  assertNotIncludes(resolver, 'mobile', 'directory resolver does not expose mobile')
}

console.log('▶ F — live settings listeners + critical-path publish')
{
  const firestoreRepos = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(
    firestoreRepos,
    'FIRESTORE_DOCS.jamaatCurrentSituation',
    'listens to jamaatCurrentSituation',
  )
  assertIncludes(
    firestoreRepos,
    'FIRESTORE_DOCS.ruknNameDirectory',
    'listens to ruknNameDirectory',
  )
  assertIncludes(
    firestoreRepos,
    'applyJamaatSettingsDocumentSnapshot',
    'applies published aggregates into the Rukn cache',
  )
  assertIncludes(firestoreRepos, 'watchJamaatReadModelDocs', 'document listeners for Jamaat read models')

  const adminLayout = read('src/layouts/AdminLayout.tsx')
  assertIncludes(adminLayout, 'scheduleJamaatReadModelPublish', 'Admin layout publishes')
  assertIncludes(adminLayout, 'useRepositoryHydration', 'publish after critical hydrate')
  assertNotIncludes(adminLayout, 'useBackgroundHydration', 'does not wait for background planning')
  const adminHome = read('src/pages/admin/AdminHomePage.tsx')
  assertIncludes(adminHome, 'publishJamaatReadModelsIfAdministrator', 'Admin Home publishes')
  assert.ok(
    !adminHome.includes('if (!isHydrated || !backgroundReady) return'),
    'Admin Home publish does not wait for background planning',
  )
}

console.log('▶ serverless @/ import guard (api/)')
{
  const files = ['api/training-registration.ts', 'api/karkun-mobile-lookup.ts', 'api/rukn-login-eligibility.ts', 'api/tts.ts', 'api/stt.ts', 'api/rukn-claims-provision.ts', 'api/jamaat-current-situation-publish.ts']
  for (const file of files) {
    const src = read(file)
    assert.ok(!src.includes("from '@/"), `${file} has no @/ imports`)
  }
}

console.log('verify-rukn-jamaat-meqati-access: ok')
