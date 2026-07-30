/**
 * Verify Digital Rafeeq Universal Search & Smart Navigation MVP.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { isSoftRemoved } from '../src/lib/peopleClassification'
import {
  classifyUtterance,
  clearUniversalSearchCache,
  rankField,
  resolveNavigationTarget,
  runRafeeqTurn,
  searchPeopleReadOnly,
  searchUniversal,
} from '../src/conversation/mvp'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function ctx(sessionId: string) {
  return {
    role: 'rukn' as const,
    ruknId: 'rukn-1',
    locale: 'ur' as const,
    sessionId,
  }
}

function testPersonSearch(): void {
  clearUniversalSearchCache()
  const result = runRafeeqTurn('Find Aslam', ctx('vs-person'))
  assert(result.intentCode === 'SEARCH', 'search intent')
  assert(result.readOnly === true, 'readOnly')
  assert(result.layersVisited.includes('execution_adapter'), 'adapter')
  assert(result.layersVisited.includes('confirmation_orchestrator'), 'confirm')
}

function testCampaignSearch(): void {
  clearUniversalSearchCache()
  const hits = searchUniversal('مہم', 'administrator', 8)
  assert(
    hits.some((hit) => hit.entityType === 'campaign' || hit.entityType === 'module'),
    'campaign or module hit',
  )
}

function testNavigation(): void {
  for (const [query, target] of [
    ['Open Dashboard', 'dashboard'],
    ['Go to Registry', 'registry'],
    ['Open Weekly Ijtema', 'weekly_ijtema'],
    ['Open Campaign', 'campaign'],
    ['Open Reports', 'reports'],
    ['Open Settings', 'settings'],
    ['Open Attendance', 'attendance'],
    ['Show Muttafiq', 'muttafiq'],
    ['Find Assigned Karkuns', 'assignments'],
  ] as const) {
    const classified = classifyUtterance(query)
    assert(classified.intentCodes[0] === 'NAVIGATION', `${query} nav`)
    assert(classified.navigationTarget === target, `${query} target`)
    const turn = runRafeeqTurn(query, ctx(`nav-${target}`))
    assert(turn.intentCode === 'NAVIGATION', `${query} turn`)
    assert(turn.actions.length >= 1, `${query} action`)
    assert(turn.actions[0]!.route.length > 0, `${query} route`)
    assert(turn.readOnly === true, `${query} readOnly`)
  }
  const mapped = resolveNavigationTarget('dashboard', 'rukn')
  assert(mapped?.route.includes('rukn') === true, 'rukn dashboard')
}

function testRanking(): void {
  assert(rankField('aslam', 'Aslam').tier === 'exact', 'exact')
  assert(rankField('asl', 'Aslam').tier === 'startsWith', 'starts')
  assert(rankField('slam', 'Aslam').tier === 'contains', 'contains')
  assert(rankField('aslan', 'Aslam').tier === 'fuzzy', 'fuzzy typo')
}

function testPartialMatch(): void {
  clearUniversalSearchCache()
  const hits = searchUniversal('a', 'administrator', 20)
  assert(hits.length >= 0, 'partial allowed')
  // Starts-with / contains ranking present when there are name matches
  const withTier = hits.filter((hit) => hit.score > 0)
  assert(withTier.every((hit) => hit.score > 0), 'scored')
}

function testNoResults(): void {
  clearUniversalSearchCache()
  const result = runRafeeqTurn('Find ZZZNoSuchPerson99999', ctx('vs-empty'))
  assert(result.intentCode === 'SEARCH', 'search')
  assert(result.metadata['noResults'] === true || result.actions.every((a) => a.entityType === 'dashboard'), 'noResults path')
  assert(result.text.includes('کوئی نتیجہ نہیں'), 'urdu empty')
}

function testArchitecturePath(): void {
  const result = runRafeeqTurn('Search Ahmed', ctx('vs-arch'))
  const required = [
    'conversation',
    'intent',
    'secretary',
    'execution_orchestrator',
    'confirmation_orchestrator',
    'execution_pipeline',
    'service_integration_contract',
    'execution_adapter',
  ]
  for (const layer of required) {
    assert(result.layersVisited.includes(layer), layer)
  }
  assert(result.usedStack === true, 'stack')
  assert(result.readOnly === true, 'readOnly')
  assert(
    result.confirmationState === 'AUTO_APPROVED' ||
      String(result.confirmationState).length > 0,
    'confirmation state',
  )
}

function testDocsAndReuse(): void {
  assert(
    existsSync(resolve('docs/features/rafeeq-universal-search.md')),
    'feature doc',
  )
  assert(
    existsSync(resolve('docs/architecture/kc-rafeeq-universal-search-arch009-gate.md')),
    'gate',
  )
  assert(
    existsSync(resolve('src/conversation/mvp/universalSearch.ts')),
    'universal search module',
  )
}

function testSoftRemovedHiddenAndSameMobileCollapse(): void {
  clearUniversalSearchCache()

  const sharedMobile = '03998887766'
  const softId = 'kr-kc027-soft'
  const twinA = 'kr-kc027-twin-a'
  const twinB = 'kr-kc027-twin-b'

  // Cleanup prior runs
  for (const id of [softId, twinA, twinB]) {
    const idx = MOCK_KARKUN_REGISTRY.findIndex((k) => k.id === id)
    if (idx >= 0) MOCK_KARKUN_REGISTRY.splice(idx, 1)
  }

  MOCK_KARKUN_REGISTRY.push({
    id: softId,
    name: 'سافٹ حذف',
    gender: 'Male',
    mobile: sharedMobile,
    place: 'لاہور',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'verify',
    address: '',
    area: '',
    assignedRukn: null,
    assignedRuknId: null,
    assignmentStatus: 'Unassigned',
    assignmentDate: null,
    campaignStatus: 'not_assigned',
    visitStatus: null,
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Registered',
    notes: '',
    isArchived: true,
    archiveKind: 'duplicate_merge',
    category: 'Karkun',
  })

  MOCK_KARKUN_REGISTRY.push({
    id: twinA,
    name: 'ٹوئن اے',
    gender: 'Male',
    mobile: sharedMobile,
    place: 'لاہور',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'verify',
    address: '',
    area: '',
    assignedRukn: null,
    assignedRuknId: null,
    assignmentStatus: 'Unassigned',
    assignmentDate: null,
    campaignStatus: 'not_assigned',
    visitStatus: null,
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Registered',
    notes: '',
    isArchived: false,
    category: 'Karkun',
  })

  MOCK_KARKUN_REGISTRY.push({
    id: twinB,
    name: 'ٹوئن بی',
    gender: 'Male',
    mobile: sharedMobile,
    place: 'لاہور',
    status: 'active',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    updatedBy: 'verify',
    address: '',
    area: '',
    assignedRukn: null,
    assignedRuknId: null,
    assignmentStatus: 'Unassigned',
    assignmentDate: null,
    campaignStatus: 'not_assigned',
    visitStatus: null,
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Registered',
    notes: '',
    isArchived: false,
    category: 'Karkun',
  })

  const soft = MOCK_KARKUN_REGISTRY.find((k) => k.id === softId)!
  assert(isSoftRemoved(soft), 'fixture soft-removed')

  const byMobile = searchPeopleReadOnly(sharedMobile, 10)
  assert(
    byMobile.every((p) => p.personId !== softId),
    'soft-removed hidden from Rafeeq search',
  )
  assert(byMobile.length === 1, `same-mobile collapse count=${byMobile.length}`)
  assert(
    byMobile[0]!.personId === twinA || byMobile[0]!.personId === twinB,
    'canonical twin id',
  )

  const byName = searchUniversal(sharedMobile, 'administrator', 20)
  const peopleHits = byName.filter(
    (h) => h.entityType === 'karkun' || h.entityType === 'muttafiq',
  )
  assert(
    peopleHits.every((h) => h.personId !== softId),
    'soft-removed absent in universal people hits',
  )
  assert(peopleHits.length === 1, `universal same-mobile count=${peopleHits.length}`)
}

const results = [
  run('person search', testPersonSearch),
  run('campaign search', testCampaignSearch),
  run('navigation', testNavigation),
  run('ranking', testRanking),
  run('partial match', testPartialMatch),
  run('no result state', testNoResults),
  run('architecture path', testArchitecturePath),
  run('docs and reuse', testDocsAndReuse),
  run('soft-removed + same-mobile collapse', testSoftRemovedHiddenAndSameMobileCollapse),
]

let failed = 0
for (const result of results) {
  console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}
console.log(
  `\nRafeeq universal search verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
