/**
 * KC-0055 — In-place Transfer preserves assignmentId + ASN (no allocate).
 * Run: npx vite-node scripts/verify-kc0055-inplace-transfer.ts
 */

import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { changeKarkunRuknAssignment } from '../src/lib/assignmentEngine'
import { resetRepositoryProviderForTests } from '../src/repositories/provider'
import {
  assignRukn,
  removeAssignment,
  transferAssignment,
} from '../src/services/assignmentService'
import {
  clearAssignmentStore,
  getActiveAssignmentsForKarkun,
  getAllAssignments,
  getAssignmentById,
  replaceAllAssignments,
} from '../src/stores/assignmentStore'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const now = new Date().toISOString()
const today = now.slice(0, 10)

resetRepositoryProviderForTests()
clearAssignmentStore()

const maleRukns = ruknMaster.filter((r) => r.status === 'active' && r.gender === 'Male')
assert(maleRukns.length >= 3, 'need at least 3 active Male Rukns')
const [ruknA, ruknB, ruknC] = maleRukns

MOCK_KARKUN_REGISTRY.length = 0
MOCK_KARKUN_REGISTRY.push({
  id: 'kr-kc0055',
  name: 'KC0055 Transfer Probe',
  gender: 'Male',
  mobile: '9876543210',
  place: 'Karachi',
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

replaceAllAssignments([], 1)

// --- Assign ---
const assign = await assignRukn({
  ruknId: ruknA!.id,
  karkunId: 'kr-kc0055',
  effectiveFrom: today,
  assignedBy: 'Administrator',
})
assert(assign.success, `assign failed: ${assign.error}`)
const originalId = assign.assignment!.assignmentId
const originalAsn = assign.assignment!.assignmentNumber
const asnsBeforeTransfer = new Set(
  getAllAssignments().map((r) => r.assignmentNumber.trim().toUpperCase()).filter(Boolean),
)

const activeBefore = getActiveAssignmentsForKarkun('kr-kc0055')
assert(activeBefore.length === 1, 'one active after assign')
assert(activeBefore[0]!.assignmentNumber === originalAsn, 'ASN present after assign')

// --- Transfer A → B ---
const t1 = await transferAssignment({
  karkunId: 'kr-kc0055',
  targetRuknId: ruknB!.id,
  effectiveFrom: today,
  assignedBy: 'Administrator',
  removalReason: 'Transferred',
  remarks: 'KC-0055 verify A→B',
})
assert(t1.success, `transfer A→B failed: ${t1.error}`)
assert(t1.assignment!.assignmentId === originalId, 'assignmentId must be preserved')
assert(t1.assignment!.assignmentNumber === originalAsn, 'ASN must be preserved')
assert(t1.assignment!.ruknId === ruknB!.id, 'ownership moved to B')
assert(t1.assignment!.status === 'Active', 'remains Active')
assert((t1.assignment!.transferHistory?.length ?? 0) >= 1, 'transferHistory appended')

const activesAfterT1 = getActiveAssignmentsForKarkun('kr-kc0055')
assert(activesAfterT1.length === 1, 'still exactly one Active')
assert(
  getAllAssignments().filter((r) => r.assignmentNumber === originalAsn && r.status === 'Active')
    .length === 1,
  'exactly one Active holder of original ASN',
)
assert(
  getAllAssignments().some(
    (r) =>
      r.status === 'Unassigned' &&
      r.removalReason === 'Transferred' &&
      r.ruknId === ruknA!.id &&
      !r.assignmentNumber,
  ),
  'source history marker present without ASN',
)

// --- Transfer B → C via engine (Transfer UI options path) ---
const t2 = await changeKarkunRuknAssignment('kr-kc0055', ruknC!.id, 'Administrator', {
  removalReason: 'Transferred',
  remarks: 'KC-0055 verify B→C',
  effectiveFrom: today,
})
assert(t2.success, `transfer B→C failed: ${t2.error}`)
assert(t2.assignment!.assignmentId === originalId, 'assignmentId preserved on second transfer')
assert(t2.assignment!.assignmentNumber === originalAsn, 'ASN preserved on second transfer')
assert(t2.assignment!.ruknId === ruknC!.id, 'ownership moved to C')
assert((t2.assignment!.transferHistory?.length ?? 0) >= 2, 'two transfer history entries')

// --- Disconnect after transfer ---
const disconnect = removeAssignment({
  ruknId: ruknC!.id,
  karkunId: 'kr-kc0055',
  effectiveFrom: today,
  removalReason: 'Other',
  assignedBy: 'Administrator',
})
assert(disconnect.success, `disconnect failed: ${disconnect.error}`)
assert(getActiveAssignmentsForKarkun('kr-kc0055').length === 0, 'no active after disconnect')
const ended = getAssignmentById(originalId)
assert(ended?.status === 'Unassigned', 'same assignment ended')
assert(ended?.assignmentNumber === originalAsn, 'ASN survives disconnect')

const asnsAfter = new Set(
  getAllAssignments().map((r) => r.assignmentNumber.trim().toUpperCase()).filter(Boolean),
)
for (const asn of asnsAfter) {
  if (!asnsBeforeTransfer.has(asn) && asn !== originalAsn.toUpperCase()) {
    throw new Error(`Transfer introduced unexpected ASN ${asn}`)
  }
}
assert(asnsAfter.has(originalAsn.toUpperCase()), 'original ASN still present')
assert(
  [...asnsAfter].every((asn) => asnsBeforeTransfer.has(asn)),
  'no new ASN values introduced by transfers',
)

console.log(
  JSON.stringify(
    {
      ok: true,
      originalId,
      originalAsn,
      transfers: 2,
      historyMarkers: getAllAssignments().filter(
        (r) => r.removalReason === 'Transferred' && !r.assignmentNumber,
      ).length,
      finalStatus: ended?.status,
      asnSetUnchanged: true,
    },
    null,
    2,
  ),
)
