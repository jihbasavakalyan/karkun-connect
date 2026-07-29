/**
 * KC-0131.9 — Execution Pipeline Foundation verification.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  PIPELINE_STAGES,
  PIPELINE_CHECKPOINT_KINDS,
  PIPELINE_ERROR_CODES,
  PIPELINE_STAGE_TRANSITIONS,
  assertCheckpointKindCoverage,
  createExecutionPipelineFoundation,
  createInvalidTransitionError,
  createMissingCheckpointError,
  createPipelineConfigurationError,
  createPipelineCancelledError,
  isLegalPipelineTransition,
  isTerminalPipelineStage,
  validateExecutionPipeline,
} from '../src/conversation/executionPipeline'

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

function testContractIntegrity(): void {
  const { coordinator } = createExecutionPipelineFoundation()
  let pipeline = coordinator.initialize({
    planId: 'plan-1',
    confirmationDecisionId: 'dec-1',
    confirmationEligible: true,
    sessionId: 'sess-1',
  })
  assert(pipeline.stage === 'INITIALIZED', 'initialized')
  assert(pipeline.immutable === true, 'immutable')
  assert(pipeline.performedExecution === false, 'no exec')
  assert(pipeline.invokedAdapter === false, 'no adapter')
  assert(pipeline.invokedService === false, 'no service')
  assert(validateExecutionPipeline(pipeline).valid, 'valid')

  pipeline = coordinator.transition(pipeline, 'CONFIRMED')
  assert(pipeline.stage === 'CONFIRMED', 'confirmed')
  const result = coordinator.getResult(pipeline)
  assert(result.isPlaceholder === true, 'placeholder result')
  assert(result.performedExecution === false, 'result no exec')
}

function testStageModel(): void {
  for (const stage of [
    'INITIALIZED',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'ROUTING',
    'WAITING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ] as const) {
    assert(PIPELINE_STAGES.includes(stage), stage)
  }
  assert(isTerminalPipelineStage('COMPLETED'), 'completed terminal')
  assert(isTerminalPipelineStage('FAILED'), 'failed terminal')
  assert(isTerminalPipelineStage('CANCELLED'), 'cancelled terminal')
  assert(!isTerminalPipelineStage('ROUTING'), 'routing not terminal')
}

function testTransitionModel(): void {
  assert(isLegalPipelineTransition('INITIALIZED', 'CONFIRMED'), 'init→confirmed')
  assert(isLegalPipelineTransition('CONFIRMED', 'PREPARING'), 'confirmed→preparing')
  assert(isLegalPipelineTransition('READY', 'ROUTING'), 'ready→routing')
  assert(isLegalPipelineTransition('ROUTING', 'WAITING'), 'routing→waiting')
  assert(isLegalPipelineTransition('WAITING', 'ROUTING'), 'waiting→routing')
  assert(!isLegalPipelineTransition('COMPLETED', 'ROUTING'), 'terminal sealed')
  assert(PIPELINE_STAGE_TRANSITIONS.INITIALIZED.includes('CANCELLED'), 'cancel from init')

  const { coordinator } = createExecutionPipelineFoundation()
  let pipeline = coordinator.initialize({ confirmationEligible: true, planId: 'p' })
  pipeline = coordinator.transition(pipeline, 'COMPLETED')
  assert(pipeline.stage === 'INITIALIZED', 'illegal ignored stage')
  assert(pipeline.errors.some((e) => e.code === 'invalid_transition'), 'error recorded')
}

function testCheckpoints(): void {
  assertCheckpointKindCoverage()
  for (const kind of [
    'validation',
    'confirmation',
    'routing',
    'completion',
    'audit',
  ] as const) {
    assert(PIPELINE_CHECKPOINT_KINDS.includes(kind), kind)
  }

  const { coordinator } = createExecutionPipelineFoundation()
  let pipeline = coordinator.initialize({ planId: 'p1' })
  pipeline = coordinator.checkpoint(pipeline, 'validation')
  assert(pipeline.checkpoints.length === 1, 'one checkpoint')
  assert(pipeline.checkpoints[0]!.isPlaceholder === true, 'placeholder cp')
}

function testDocumentation(): void {
  const doc = resolve(process.cwd(), 'docs/architecture/execution-pipeline-foundation.md')
  const gate = resolve(process.cwd(), 'docs/architecture/kc-0131-9-arch009-gate.md')
  assert(existsSync(doc), 'foundation doc')
  assert(existsSync(gate), 'arch009 gate')
}

function testNoPlatformServiceImports(): void {
  const root = resolve(process.cwd(), 'src/conversation/executionPipeline')
  const files = [
    'index.ts',
    'contracts/index.ts',
    'lifecycle/transition.ts',
    'services/index.ts',
    'validators/index.ts',
  ]
  const forbidden = [
    /from\s+['"]@\/services/,
    /from\s+['"]@\/repositories/,
    /from\s+['"]firebase/,
    /from\s+['"]react/,
    /from\s+['"][^'"]*firestore[^'"]*['"]/,
  ]
  for (const rel of files) {
    const text = readFileSync(resolve(root, rel), 'utf8')
    for (const pattern of forbidden) {
      assert(!pattern.test(text), `forbidden in ${rel}: ${pattern}`)
    }
  }
  for (const code of PIPELINE_ERROR_CODES) {
    assert(typeof code === 'string', code)
  }
  assert(createInvalidTransitionError('READY', 'INITIALIZED').code === 'invalid_transition', 't')
  assert(createMissingCheckpointError('x').code === 'missing_checkpoint', 'm')
  assert(createPipelineConfigurationError('x').code === 'pipeline_configuration_error', 'c')
  assert(createPipelineCancelledError('x').code === 'pipeline_cancelled', 'cancel')
}

function testNoExecution(): void {
  const { coordinator } = createExecutionPipelineFoundation()
  const result = coordinator.simulateCoordination({
    planId: 'plan-sim',
    confirmationDecisionId: 'dec-sim',
    confirmationEligible: true,
    requestedCapability: 'VISIT',
  })
  assert(result.success === true, 'sim success')
  assert(result.stage === 'COMPLETED', 'completed')
  assert(result.performedExecution === false, 'no exec')
  assert(result.invokedAdapter === false, 'no adapter')
  assert(result.invokedService === false, 'no service')
  assert(result.checkpoints.length >= 4, 'checkpoints present')
}

const results = [
  run('contract integrity', testContractIntegrity),
  run('stage model', testStageModel),
  run('transition model', testTransitionModel),
  run('checkpoints', testCheckpoints),
  run('documentation', testDocumentation),
  run('no platform service imports', testNoPlatformServiceImports),
  run('no execution', testNoExecution),
]

let failed = 0
for (const result of results) {
  const mark = result.passed ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}

console.log(
  `\nKC-0131.9 execution pipeline foundation verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
