/**
 * KC-0058.2 — Rukn portal persistence, authorization messaging, metrics alignment.
 * Run: npm run verify:kc0058.2
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isKarkunProfileComplete,
  getMissingMandatoryProfileFields,
} from '../src/lib/karkunProfileCompletion'
import { toOperatorAssignmentError, FRIENDLY_ASSIGNMENT_ERROR } from '../src/lib/assignment/operatorFacingError'
import { FRIENDLY_DATA_ACCESS_ERROR } from '../src/repositories/errors'
import { getCampaignConnectionMetrics } from '../src/services/metricsService'
import { IntegrityScanner } from '../src/services/integrityScanner'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { DEFAULT_PLACE } from '../src/types/people.types'
import { resetRepositoryProviderForTests } from '../src/repositories/provider'
import { allowDangerousRepositoryClear } from '../src/lib/preservation/dangerousClearGate'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { assignRukn } from '../src/services/assignmentService'
import { ruknMaster } from '../src/data/ruknMaster'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const rules = readFileSync(resolve('firestore.rules'), 'utf8')
assert(rules.includes('ruknMayUpdateKarkun'), 'rules must allow Rukn karkun updates')
assert(rules.includes("docId == 'connectionMeta'"), 'rules must allow Rukn connectionMeta read/update')
assert(rules.includes('isAvailableKarkunData'), 'rules must allow Available karkun reads')

assert(
  !FRIENDLY_DATA_ACCESS_ERROR.toLowerCase().includes('permission'),
  'friendly error must not mention permission',
)
assert(
  toOperatorAssignmentError('You do not have permission to access this data.') ===
    FRIENDLY_ASSIGNMENT_ERROR,
  'legacy permission copy must remap to assignment error (KC-0060.2)',
)
assert(
  toOperatorAssignmentError('permission-denied') === FRIENDLY_ASSIGNMENT_ERROR,
  'permission-denied must remap to assignment error (KC-0060.2)',
)

const now = new Date().toISOString()
const incomplete = {
  id: 'kr-verify-incomplete',
  name: 'Verify Incomplete',
  gender: 'Male' as const,
  mobile: '9000000099',
  place: '',
  status: 'active' as const,
  createdAt: now,
  updatedAt: now,
  updatedBy: 'Verification',
  address: '',
  area: '',
  assignedRukn: '',
  assignedRuknId: '',
  assignmentStatus: 'Assigned' as const,
  campaignStatus: 'active' as const,
  visitStatus: 'none' as const,
  isArchived: false,
}
assert(!isKarkunProfileComplete(incomplete), 'incomplete profile must fail completeness')
assert(getMissingMandatoryProfileFields(incomplete).length >= 3, 'must report missing fields')

const complete = {
  ...incomplete,
  id: 'kr-verify-complete',
  fatherHusbandName: 'Father',
  address: 'Street 1',
  area: 'Area A',
  place: DEFAULT_PLACE,
}
assert(isKarkunProfileComplete(complete), 'complete profile must pass shared completeness')

resetRepositoryProviderForTests()
allowDangerousRepositoryClear(true)
clearAssignmentStore()
allowDangerousRepositoryClear(false)

MOCK_KARKUN_REGISTRY.length = 0
MOCK_KARKUN_REGISTRY.push(
  {
    ...complete,
    id: 'kr-95821',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
  },
  {
    ...complete,
    id: 'kr-95822',
    mobile: '9000000098',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
  },
)

const rukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
assert(Boolean(rukn), 'need an active male Rukn')
replaceAllAssignments([], 1)
const assigned = await assignRukn({
  ruknId: rukn!.id,
  karkunId: 'kr-95821',
  effectiveFrom: now.slice(0, 10),
  assignedBy: 'Administrator',
})
assert(assigned.success, `assign failed: ${assigned.error}`)

const metrics = getCampaignConnectionMetrics()
const scan = IntegrityScanner.run()
assert(metrics.connected === scan.metrics.connected, 'MetricsService must match IntegrityScanner')
assert(metrics.progressPct === scan.metrics.progressPct, 'progress must match IntegrityScanner')
assert(metrics.sourceOfTruth === 'MetricsService', 'metrics source must be MetricsService')

console.log('KC-0058.2 verify OK', {
  connected: metrics.connected,
  progressPct: metrics.progressPct,
  friendlyErrorPreview: FRIENDLY_ASSIGNMENT_ERROR.split('.')[0],
  dataAccessErrorPreview: FRIENDLY_DATA_ACCESS_ERROR.split('\n')[0],
})
