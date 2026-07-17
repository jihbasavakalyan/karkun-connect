/**
 * KC-009 — Execution plan / لائحۂ عمل automation foundation.
 */

import assert from 'node:assert/strict'
import {
  approveExecutionPlan,
  buildPlanSummaryUrdu,
} from '../src/services/executionPlanService'
import {
  clearExecutionPlanStore,
  getActivePlanForKarkun,
} from '../src/stores/executionPlanStore'

clearExecutionPlanStore()

const summary = buildPlanSummaryUrdu({
  karkunId: 'k1',
  karkunName: 'عبدالرحمن',
  ruknId: 'r1',
  firstContactWhen: 'today',
  channel: 'visit',
  preferredTime: 'evening',
})

assert.match(summary, /عبدالرحمن/)
assert.match(summary, /بالمشافہ ملاقات/)
assert.doesNotMatch(summary, /منصوبۂ رابطہ/)

const plan = approveExecutionPlan({
  karkunId: 'k1',
  karkunName: 'عبدالرحمن',
  ruknId: 'r1',
  firstContactWhen: 'tomorrow',
  channel: 'call',
})

assert.equal(plan.status, 'active')
assert.ok(plan.approvedAt)
assert.equal(getActivePlanForKarkun('k1')?.id, plan.id)

console.log('verify-kc009-execution-plan: ok')
