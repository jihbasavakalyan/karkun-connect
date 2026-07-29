/**
 * KC-0131.5 — Execution Orchestrator Foundation verification.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createIntentEngineFoundation,
  createIntentPipelineInput,
} from '../src/conversation/intent'
import { createSecretaryEngineFoundation } from '../src/conversation/secretary'
import {
  EXECUTION_ERROR_CATEGORIES,
  EXECUTION_EVENT_TYPES,
  EXECUTION_STATES,
  createExecutionObserverBus,
  createExecutionOrchestratorFoundation,
  createExecutionOrchestratorService,
  createNonRecoverableIssue,
  createRecoverableIssue,
  createValidationIssue,
  isLegalExecutionTransition,
  isRetryCandidate,
  isTerminalExecutionState,
} from '../src/conversation/orchestrator'

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

function samplePlan() {
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine: secretary } = createSecretaryEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({ domainIntentCodes: ['SEARCH', 'REPORT'] }),
  ).batch
  return secretary.planFromIntentBatch(batch, { locale: 'ur' }).plan
}

function testLifecycleIntegrity(): void {
  assert(EXECUTION_STATES.includes('initialized'), 'states')
  assert(isLegalExecutionTransition('initialized', 'ready'), 'init→ready')
  assert(isLegalExecutionTransition('ready', 'running'), 'ready→running')
  assert(isLegalExecutionTransition('running', 'paused'), 'running→paused')
  assert(isLegalExecutionTransition('paused', 'running'), 'paused→running')
  assert(isLegalExecutionTransition('running', 'completed'), 'running→completed')
  assert(!isLegalExecutionTransition('completed', 'running'), 'terminal sealed')
  assert(isTerminalExecutionState('failed'), 'failed terminal')
}

function testStateTransitions(): void {
  const { runtime } = createExecutionOrchestratorFoundation()
  const plan = samplePlan()
  let session = runtime.initialize(plan, { locale: 'ur' })
  assert(session.state === 'initialized', 'initialized')
  assert(session.coordinationOnly === true, 'coordination only')
  session = runtime.markReady(session)
  assert(session.state === 'ready', 'ready')
  session = runtime.start(session)
  assert(session.state === 'running', 'running')
  session = runtime.pause(session)
  assert(session.state === 'paused', 'paused')
  session = runtime.resume(session)
  assert(session.state === 'running', 'resumed')
  session = runtime.cancel(session, 'test cancel')
  assert(session.state === 'cancelled', 'cancelled')
}

function testEventDefinitions(): void {
  for (const type of [
    'ExecutionStarted',
    'StepStarted',
    'StepCompleted',
    'ExecutionPaused',
    'ExecutionResumed',
    'ExecutionFailed',
    'ExecutionCancelled',
    'ExecutionCompleted',
  ] as const) {
    assert(EXECUTION_EVENT_TYPES.includes(type), type)
  }

  const bus = createExecutionObserverBus()
  const seen: string[] = []
  bus.subscribe({
    name: 'test-observer',
    onEvent(event) {
      seen.push(event.type)
    },
  })

  const service = createExecutionOrchestratorService({ observers: bus })
  const result = service.simulateCoordination(samplePlan())
  assert(result.success, 'simulation success')
  assert(seen.includes('ExecutionStarted'), 'started observed')
  assert(seen.includes('StepStarted'), 'step started observed')
  assert(seen.includes('StepCompleted'), 'step completed observed')
  assert(seen.includes('ExecutionCompleted'), 'completed observed')
}

function testProgressModel(): void {
  const { engine } = createExecutionOrchestratorFoundation()
  const result = engine.simulateCoordination(samplePlan())
  assert(result.summary.progress.totalSteps === 2, 'total steps')
  assert(result.summary.progress.completedSteps === 2, 'completed')
  assert(result.summary.progress.remainingSteps === 0, 'remaining')
  assert(result.summary.progress.percentComplete === 100, 'percent')
}

function testErrorModel(): void {
  assert(EXECUTION_ERROR_CATEGORIES.includes('recoverable'), 'categories')
  const recoverable = createRecoverableIssue('temp')
  assert(recoverable.recoverable, 'recoverable flag')
  assert(isRetryCandidate(recoverable), 'retry candidate hint')
  const fatal = createNonRecoverableIssue('fatal')
  assert(!fatal.recoverable, 'non-recoverable')
  assert(!isRetryCandidate(fatal), 'not retry')
  const validation = createValidationIssue('bad')
  assert(validation.category === 'validation', 'validation')

  const { runtime } = createExecutionOrchestratorFoundation()
  let session = runtime.start(runtime.markReady(runtime.initialize(samplePlan())))
  session = runtime.fail(session, 'forced failure')
  assert(session.state === 'failed', 'failed state')
  assert(session.issues.length >= 1, 'issue recorded')
}

function testDocumentation(): void {
  assert(
    existsSync(resolve(process.cwd(), 'docs/architecture/execution-orchestrator-foundation.md')),
    'doc missing',
  )
  assert(
    existsSync(resolve(process.cwd(), 'docs/architecture/kc-0131-5-arch009-gate.md')),
    'gate missing',
  )
}

function testNoWorkPerformed(): void {
  const { engine } = createExecutionOrchestratorFoundation()
  const plan = samplePlan()
  assert(plan.isPlaceholder, 'plan still placeholder')
  const result = engine.simulateCoordination(plan)
  assert(result.success, 'coordination ok')
  // Plan object identity/immutability preserved
  assert(Object.isFrozen(plan), 'plan frozen from secretary')
  assert(result.events.every((e) => e.sessionId), 'events bound to session')
}

async function main(): Promise<void> {
  const results = [
    run('lifecycle integrity', testLifecycleIntegrity),
    run('state transitions', testStateTransitions),
    run('event definitions', testEventDefinitions),
    run('progress model', testProgressModel),
    run('error model', testErrorModel),
    run('documentation', testDocumentation),
    run('no work performed', testNoWorkPerformed),
  ]

  const failed = results.filter((r) => !r.passed)
  for (const result of results) {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  }
  if (failed.length > 0) {
    console.error(`\nKC-0131.5 orchestrator verify failed: ${failed.length}/${results.length}`)
    process.exit(1)
  }
  console.log(
    `\nKC-0131.5 execution orchestrator foundation verify: ${results.length}/${results.length} passed`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
