/**
 * KC-0131.11 — Reference Execution Flow verification.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  REFERENCE_FLOW_ERROR_CODES,
  createReferenceExecutionFlowFoundation,
  runReportingReferenceFlow,
} from '../src/conversation/referenceFlow'

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

const REQUIRED_LAYERS = [
  'conversation',
  'intent',
  'secretary',
  'execution_orchestrator',
  'confirmation_orchestrator',
  'execution_pipeline',
  'execution_adapter',
  'service_integration_contract',
  'metrics_service',
  'read_only_result',
] as const

function testCompleteLayerTraversal(): void {
  const result = runReportingReferenceFlow()
  assert(result.success === true, 'success')
  for (const layer of REQUIRED_LAYERS) {
    assert(result.layersVisited.includes(layer), `layer ${layer}`)
  }
  assert(result.observability.traces.length >= REQUIRED_LAYERS.length - 1, 'traces')
}

function testAdapterResolution(): void {
  const result = runReportingReferenceFlow()
  assert(result.adapterResult != null, 'adapter result')
  assert(result.adapterResult!.adapterId === 'reference-reporting-metrics', 'adapter id')
  assert(result.adapterResult!.capability === 'REPORTING', 'capability')
  assert(result.adapterResult!.status === 'success', 'status')

  const fail = runReportingReferenceFlow({ omitReportingAdapter: true })
  assert(fail.success === false, 'omit fail')
  assert(fail.error?.code === 'adapter_resolution_failure', 'resolution failure')
}

function testConfirmationGate(): void {
  const ok = runReportingReferenceFlow()
  assert(ok.confirmation?.decision.state === 'AUTO_APPROVED', 'auto approved')
  assert(ok.confirmation?.decision.eligibleForExecution === true, 'eligible')

  const denied = runReportingReferenceFlow({ forceConfirmationDenied: true })
  assert(denied.success === false, 'denied fail')
  assert(denied.error?.code === 'confirmation_denied', 'denied code')
  assert(!denied.layersVisited.includes('metrics_service'), 'no service on deny')
}

function testPipelineLifecycle(): void {
  const ok = runReportingReferenceFlow()
  assert(ok.pipeline?.stage === 'COMPLETED', 'pipeline completed')
  assert(ok.pipeline?.success === true, 'pipeline success')
  assert(ok.pipeline?.performedExecution === false, 'pipeline no exec')

  const cancelled = runReportingReferenceFlow({ cancelPipeline: true })
  assert(cancelled.success === false, 'cancel fail')
  assert(cancelled.error?.code === 'pipeline_cancelled', 'cancel code')
  assert(!cancelled.layersVisited.includes('metrics_service'), 'no service on cancel')
}

function testExistingServiceInvocation(): void {
  const result = runReportingReferenceFlow()
  assert(result.adapterResult!.invokedService === true, 'invoked')
  assert(result.metrics != null, 'metrics')
  assert(result.metrics!.sourceOfTruth === 'MetricsService', 'source')
  assert(result.serviceRequest?.serviceId === 'metricsService', 'contract service')
  assert(result.serviceRequest?.immutable === true, 'immutable request')

  const unavailable = runReportingReferenceFlow({
    invokeMetrics: () => {
      throw new Error('boom')
    },
  })
  assert(unavailable.success === false, 'unavailable fail')
  assert(unavailable.error?.code === 'service_unavailable', 'unavailable code')
}

function testReadOnlyBehaviour(): void {
  const result = runReportingReferenceFlow()
  assert(result.readOnly === true, 'readOnly')
  assert(result.wroteData === false, 'no write')
  assert(result.mutatedFirestore === false, 'no firestore')
  assert(result.adapterResult!.performedWork === false, 'no work')
  assert(typeof result.metrics!.connected === 'number', 'connected number')

  const unsupported = runReportingReferenceFlow({ unsupportedIntent: true })
  assert(unsupported.error?.code === 'unsupported_capability', 'unsupported')
}

function testNoRepositoryModifications(): void {
  const root = resolve(process.cwd(), 'src/conversation/referenceFlow')
  const files = [
    'index.ts',
    'runReferenceFlow.ts',
    'reportingAdapter.ts',
    'types.ts',
  ]
  const forbidden = [
    /from\s+['"]@\/repositories/,
    /\.setDoc\(/,
    /\.updateDoc\(/,
    /\.deleteDoc\(/,
    /\.writeBatch\(/,
    /firestore\.ts/,
  ]
  for (const rel of files) {
    const text = readFileSync(resolve(root, rel), 'utf8')
    for (const pattern of forbidden) {
      assert(!pattern.test(text), `forbidden in ${rel}: ${pattern}`)
    }
  }
  for (const code of REFERENCE_FLOW_ERROR_CODES) {
    assert(typeof code === 'string', code)
  }
}

function testDocumentation(): void {
  const doc = resolve(process.cwd(), 'docs/architecture/reference-execution-flow.md')
  const gate = resolve(process.cwd(), 'docs/architecture/kc-0131-11-arch009-gate.md')
  assert(existsSync(doc), 'foundation doc')
  assert(existsSync(gate), 'arch009 gate')
}

function testFoundationFacade(): void {
  const foundation = createReferenceExecutionFlowFoundation()
  const result = foundation.runReporting()
  assert(result.success === true, 'facade success')
}

const results = [
  run('complete layer traversal', testCompleteLayerTraversal),
  run('adapter resolution', testAdapterResolution),
  run('confirmation gate', testConfirmationGate),
  run('pipeline lifecycle', testPipelineLifecycle),
  run('existing service invocation', testExistingServiceInvocation),
  run('read-only behaviour', testReadOnlyBehaviour),
  run('no repository modifications', testNoRepositoryModifications),
  run('documentation', testDocumentation),
  run('foundation facade', testFoundationFacade),
]

let failed = 0
for (const result of results) {
  const mark = result.passed ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}

console.log(
  `\nKC-0131.11 reference execution flow verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
