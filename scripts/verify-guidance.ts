/**
 * M5 — Campaign Guidance Engine verification.
 * Run: npx vite-node scripts/verify-guidance.ts
 */
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  assignKarkun,
  getAssignedKarkunanForRukn,
  getAvailableKarkunan,
} from '@/lib/assignmentEngine'
import { getKarkunGuidance, getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { buildMorningBrief } from '@/lib/guidance/morningBriefEngine'
import { buildAdminCoachingSnapshot } from '@/lib/guidance/adminCoachingEngine'
import { JOURNEY_STAGE_ORDER } from '@/types/guidance'
import { createCommitment, completeCommitment } from '@/services/guidanceService'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import { getAllRukns } from '@/lib/peopleStore'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

runProductionDataMigration()

const maleRukns = getAllRukns().filter((record) => record.gender === 'Male')
assert(maleRukns.length > 0, 'Need at least one male Rukn')

let karkunId: string | undefined
let ruknId: string | undefined

for (const rukn of maleRukns) {
  const assigned = getAssignedKarkunanForRukn(rukn.id)
  if (assigned.length > 0) {
    karkunId = assigned[0].id
    ruknId = rukn.id
    break
  }
}

if (!karkunId || !ruknId) {
  const rukn = maleRukns[0]
  const pool = getAvailableKarkunan().filter((karkun) => karkun.gender === 'Male')
  assert(pool.length > 0, 'Need an available male Karkun for guidance verification')
  const result = assignKarkun(pool[0].id, rukn.id, 'Administrator')
  assert(result.success, `Assignment for guidance test must succeed: ${result.error ?? ''}`)
  karkunId = pool[0].id
  ruknId = rukn.id
}

const guidance = getKarkunGuidance(karkunId, ruknId)
assert(guidance !== null, 'Guidance must exist for connected Karkun')
assert(JOURNEY_STAGE_ORDER.includes(guidance!.currentStage), 'Valid journey stage')
assert(Boolean(guidance!.nextAction.label), 'Next action label required')
assert(Boolean(guidance!.nextAction.route), 'Next action route required')
assert(guidance!.health.reasons.length > 0, 'Health must include reasons')
assert(Array.isArray(guidance!.timeline), 'Timeline must be an array')
assert(Array.isArray(guidance!.suggestions), 'Suggestions must be an array')

const commitment = createCommitment({
  karkunId,
  ruknId,
  text: 'Meet Sunday',
  targetDate: new Date().toISOString().slice(0, 10),
  createdBy: 'Verification',
})
assert(commitment.status === 'pending', 'Commitment must start pending')

const refreshed = getKarkunGuidance(karkunId, ruknId)!
assert(
  refreshed.pendingCommitments.some((record) => record.id === commitment.id),
  'Commitment must appear in guidance',
)

completeCommitment(commitment.id)
const afterComplete = getKarkunGuidance(karkunId, ruknId)!
assert(
  !afterComplete.pendingCommitments.some((record) => record.id === commitment.id),
  'Completed commitment must leave pending list',
)

const brief = buildMorningBrief(ruknId)
assert(Boolean(brief.greeting), 'Morning brief needs greeting')
assert(Boolean(brief.mission), 'Morning brief needs mission')
assert(Boolean(brief.dailyGoal), 'Morning brief needs daily goal')

const coaching = buildAdminCoachingSnapshot()
assert(coaching.insights.length > 0, 'Admin coaching must have insights')

const ruknGuidance = getGuidanceForRuknKarkuns(ruknId)
assert(ruknGuidance.length > 0, 'Rukn must have guidance for connected Karkuns')
for (const item of ruknGuidance) {
  assert(Boolean(item.nextAction.label), `Next action required for ${item.karkunName}`)
}

const karkun = getKarkunById(karkunId)
assert(karkun !== undefined, 'Karkun must exist')

console.log('Campaign Guidance Engine verification passed.')
