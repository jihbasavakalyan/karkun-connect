/**
 * KC-0058.1 — Dashboard metrics align with MetricsService / IntegrityScanner.
 * Run: npm run verify:kc0058.1
 */

import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { allowDangerousRepositoryClear } from '../src/lib/preservation/dangerousClearGate'
import { buildAdminMissionControl } from '../src/lib/missionControl/buildAdminMissionControl'
import { buildAdminCampaignHealthKpis } from '../src/lib/missionControl/adminMissionControlPresentation'
import { resetRepositoryProviderForTests } from '../src/repositories/provider'
import { IntegrityScanner } from '../src/services/integrityScanner'
import { getCampaignConnectionMetrics } from '../src/services/metricsService'
import { assignRukn } from '../src/services/assignmentService'
import { getAdminCommandCenterSnapshot } from '../src/services/campaignAutomationEngine'
import {
  clearAssignmentStore,
  replaceAllAssignments,
} from '../src/stores/assignmentStore'
import { DEFAULT_PLACE } from '../src/types/people.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

resetRepositoryProviderForTests()
allowDangerousRepositoryClear(true)
clearAssignmentStore()
allowDangerousRepositoryClear(false)

const now = new Date().toISOString()
MOCK_KARKUN_REGISTRY.length = 0
for (let i = 1; i <= 5; i += 1) {
  MOCK_KARKUN_REGISTRY.push({
    id: `kr-91${i}`,
    name: `KC00581 Probe ${i}`,
    gender: 'Male',
    mobile: `900000910${i}`,
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    isArchived: false,
  })
}

const maleRukns = ruknMaster.filter((r) => r.status === 'active' && r.gender === 'Male')
assert(maleRukns.length >= 3, 'need at least 3 active male Rukns')
replaceAllAssignments([], 1)

const pairs = [
  { ruknId: maleRukns[0]!.id, karkunId: 'kr-911' },
  { ruknId: maleRukns[1]!.id, karkunId: 'kr-912' },
  { ruknId: maleRukns[2]!.id, karkunId: 'kr-913' },
]
for (const pair of pairs) {
  const result = await assignRukn({
    ruknId: pair.ruknId,
    karkunId: pair.karkunId,
    effectiveFrom: now.slice(0, 10),
    assignedBy: 'Administrator',
  })
  assert(result.success, `assign ${pair.karkunId} failed: ${result.error}`)
}

const metrics = getCampaignConnectionMetrics()
assert(metrics.connected === 3, `expected connected=3, got ${metrics.connected}`)
assert(metrics.connectionDocumentCount >= 3, 'document count should include actives')
assert(metrics.remaining === 2, `expected remaining=2 Available, got ${metrics.remaining}`)
assert(metrics.total === 5, `expected total=5, got ${metrics.total}`)
assert(metrics.progressPct === 60, `expected 60%, got ${metrics.progressPct}`)

const snapshot = getAdminCommandCenterSnapshot()
const model = buildAdminMissionControl(snapshot)
assert(model.connectionProgress.connected === metrics.connected, 'model connected drift')
assert(model.connectionProgress.total === metrics.total, 'model total drift')
assert(model.connectionProgress.pct === metrics.progressPct, 'model pct drift')

const health = buildAdminCampaignHealthKpis(model)
const connectionsKpi = health.find((k) => k.id === 'connections')
assert(Boolean(connectionsKpi), 'connections KPI missing')
assert(
  connectionsKpi!.value === `${metrics.connected}/${metrics.total}`,
  `health KPI ${connectionsKpi!.value} != ${metrics.connected}/${metrics.total}`,
)

const report = IntegrityScanner.run()
assert(report.summary.connected === metrics.connected, 'scanner connected drift')
assert(report.summary.total === metrics.total, 'scanner total drift')
assert(report.summary.progressPct === metrics.progressPct, 'scanner pct drift')
assert(report.metrics.sourceOfTruth === 'MetricsService', 'scanner must embed MetricsService')

console.log('KC-0058.1 verify: OK')
console.log(JSON.stringify({ metrics, healthConnections: connectionsKpi!.value, scanner: report.summary }, null, 2))
