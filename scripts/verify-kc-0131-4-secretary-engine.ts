/**
 * KC-0131.4 — Secretary Engine Foundation verification.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createConversationFoundation, createEmptyConversationContext } from '../src/conversation/foundation'
import {
  createIntentEngineFoundation,
  createIntentParameter,
  createIntentPipelineInput,
  createIntentTarget,
  intentBatchToFoundationCollection,
} from '../src/conversation/intent'
import {
  CONFIRMATION_REQUIREMENT_KINDS,
  DEPENDENCY_KINDS,
  createPlanningContext,
  createSecretaryEngineFoundation,
  secretaryPlanToFoundationPlan,
  validateExecutionPlan,
  validatePlanningResult,
} from '../src/conversation/secretary'

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

function testPlanCreation(): void {
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine } = createSecretaryEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({
      domainIntentCodes: ['SEARCH', 'CALL'],
      locale: 'ur',
    }),
  ).batch

  const result = engine.planFromIntentBatch(batch, { locale: 'ur', role: 'rukn' })
  assert(result.plan.isPlaceholder === true, 'placeholder plan')
  assert(Object.isFrozen(result.plan), 'plan frozen')
  assert(result.plan.steps.length === 2, 'two steps')
  assert(result.plan.steps[0]?.intentCode === 'SEARCH', 'search sequenced first')
  assert(result.plan.steps[1]?.intentCode === 'CALL', 'call after search')
  assert(validateExecutionPlan(result.plan).valid, 'plan structurally valid')
  assert(validatePlanningResult(result).valid, 'result valid')
}

function testPolicyIntegrity(): void {
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine } = createSecretaryEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({ domainIntentCodes: ['UNKNOWN', 'REPORT'] }),
  ).batch
  const result = engine.planFromIntentBatch(batch)
  const unknown = result.plan.steps.find((s) => s.intentCode === 'UNKNOWN')
  const report = result.plan.steps.find((s) => s.intentCode === 'REPORT')
  assert(unknown?.status === 'blocked', 'unknown blocked')
  assert(unknown?.confirmation.kind === 'blocked', 'unknown confirmation blocked')
  assert(report?.confirmation.kind === 'not_required', 'report no confirm')
  assert(report?.status === 'ready', 'report ready')
}

function testDependencyGraph(): void {
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine } = createSecretaryEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({
      domainIntentCodes: ['FOLLOW_UP', 'VISIT_UPDATE', 'BAITUL_MAAL'],
    }),
  ).batch
  const result = engine.planFromIntentBatch(batch)
  assert(result.plan.dependencies.length > 0, 'dependencies present')
  assert(
    result.plan.dependencies.some((d) => d.reason === 'Visit before Follow-up'),
    'visit→follow-up',
  )
  assert(
    result.plan.dependencies.some((d) => d.kind === 'requires_confirmation'),
    'bm confirmation dependency',
  )
  for (const kind of result.plan.dependencies.map((d) => d.kind)) {
    assert(DEPENDENCY_KINDS.includes(kind), `known dependency kind ${kind}`)
  }
}

function testSequencing(): void {
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine } = createSecretaryEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({
      domainIntentCodes: ['REMINDER', 'NAVIGATION', 'CALL'],
    }),
  ).batch
  const codes = engine.planFromIntentBatch(batch).plan.steps.map((s) => s.intentCode)
  assert(codes.indexOf('NAVIGATION') < codes.indexOf('CALL'), 'nav before call')
  assert(codes.indexOf('CALL') < codes.indexOf('REMINDER'), 'call before reminder')
}

function testConfirmationModel(): void {
  assert(CONFIRMATION_REQUIREMENT_KINDS.includes('required'), 'kinds')
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine } = createSecretaryEngineFoundation()

  const incompleteBatch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({ domainIntentCodes: ['VISIT_UPDATE'] }),
  ).batch
  const withParams = {
    ...incompleteBatch,
    intents: incompleteBatch.intents.map((intent) => ({
      ...intent,
      parameters: [
        createIntentParameter({ name: 'personId', required: true, present: false }),
      ],
      targets: [createIntentTarget({ kind: 'person', ambiguous: true })],
    })),
  }
  const incomplete = engine.planFromIntentBatch(withParams)
  assert(
    incomplete.plan.steps[0]?.confirmation.kind === 'incomplete' ||
      incomplete.plan.steps[0]?.status === 'incomplete',
    'incomplete confirmation path',
  )

  const callBatch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({ domainIntentCodes: ['CALL'] }),
  ).batch
  const callPlan = engine.planFromIntentBatch(callBatch)
  assert(callPlan.plan.requiresAnyConfirmation, 'call requires confirmation')
  assert(callPlan.plan.steps[0]?.confirmation.kind === 'required', 'call required')
}

function testDocumentation(): void {
  assert(
    existsSync(resolve(process.cwd(), 'docs/architecture/secretary-engine-foundation.md')),
    'doc missing',
  )
  assert(
    existsSync(resolve(process.cwd(), 'docs/architecture/kc-0131-4-arch009-gate.md')),
    'gate missing',
  )
}

function testNoExecutionBridge(): void {
  const foundation = createConversationFoundation()
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine } = createSecretaryEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({ domainIntentCodes: ['REPORT'] }),
  ).batch
  const result = engine.planFromIntentBatch(batch, createPlanningContext({ locale: 'ur' }))
  const foundationPlan = secretaryPlanToFoundationPlan(result.plan)
  assert(foundationPlan.isPlaceholder, 'foundation bridge placeholder')

  const collection = intentBatchToFoundationCollection(batch)
  const planned = foundation.planner.plan(
    collection,
    createEmptyConversationContext({ locale: 'ur' }),
  )
  assert(planned.isPlaceholder, 'still no execution via foundation planner')
}

async function main(): Promise<void> {
  const results = [
    run('plan creation', testPlanCreation),
    run('policy integrity', testPolicyIntegrity),
    run('dependency graph', testDependencyGraph),
    run('sequencing', testSequencing),
    run('confirmation model', testConfirmationModel),
    run('documentation', testDocumentation),
    run('no execution bridge', testNoExecutionBridge),
  ]

  const failed = results.filter((r) => !r.passed)
  for (const result of results) {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  }
  if (failed.length > 0) {
    console.error(`\nKC-0131.4 secretary verify failed: ${failed.length}/${results.length}`)
    process.exit(1)
  }
  console.log(
    `\nKC-0131.4 secretary engine foundation verify: ${results.length}/${results.length} passed`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
