/**
 * KC-0131.6 — Execution Adapter Foundation verification.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createIntentEngineFoundation,
  createIntentPipelineInput,
} from '../src/conversation/intent'
import { createSecretaryEngineFoundation } from '../src/conversation/secretary'
import {
  ADAPTER_CAPABILITIES,
  ADAPTER_ERROR_CODES,
  ADAPTER_RESOLUTION_KINDS,
  assertCanonicalCapabilityCoverage,
  createAdapterMetadata,
  createAdapterRegistry,
  createExecutionAdapterFoundation,
  createUnavailableAdapterError,
  createUnsupportedCapabilityError,
  createInvalidMappingError,
  createConfigurationAdapterError,
  mapIntentCodeToCapability,
  resolveAdapterCapability,
  routeExecutionStep,
  validateExecutionStepMapping,
} from '../src/conversation/executionAdapters'

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

function sampleSteps() {
  const { engine: intentEngine } = createIntentEngineFoundation()
  const { engine: secretary } = createSecretaryEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({
      domainIntentCodes: ['VISIT_UPDATE', 'CALL', 'WHATSAPP', 'SEARCH', 'REPORT'],
    }),
  ).batch
  return secretary.planFromIntentBatch(batch, { locale: 'ur' }).plan.steps
}

function testRegistryIntegrity(): void {
  assertCanonicalCapabilityCoverage()
  assert(ADAPTER_CAPABILITIES.includes('VISIT'), 'VISIT')
  assert(ADAPTER_CAPABILITIES.includes('WHATSAPP'), 'WHATSAPP')
  assert(ADAPTER_CAPABILITIES.includes('UNKNOWN'), 'UNKNOWN')
  assert(mapIntentCodeToCapability('VISIT_UPDATE') === 'VISIT', 'visit map')
  assert(mapIntentCodeToCapability('CALL') === 'CALL', 'call map')
  assert(mapIntentCodeToCapability('REPORT') === 'REPORTING', 'report map')
  assert(mapIntentCodeToCapability('NOPE') === 'UNKNOWN', 'unknown map')

  const { registry } = createExecutionAdapterFoundation()
  assert(registry.listCapabilities().length === ADAPTER_CAPABILITIES.length, 'defs')
  assert(registry.listByCapability('SEARCH').length >= 1, 'search adapter seeded')
}

function testAdapterContracts(): void {
  const { engine } = createExecutionAdapterFoundation()
  const steps = sampleSteps()
  const visit = steps.find((s) => s.intentCode === 'VISIT_UPDATE')
  assert(!!visit, 'visit step')
  const result = engine.adaptStep(visit!)
  assert(result.isPlaceholder === true, 'placeholder')
  assert(result.invokedService === false, 'no service')
  assert(result.performedWork === false, 'no work')
  assert(result.status === 'placeholder', 'status')
  assert(result.capability === 'VISIT', 'capability')
}

function testRouting(): void {
  const steps = sampleSteps()
  const call = steps.find((s) => s.intentCode === 'CALL')
  assert(!!call, 'call step')
  assert(routeExecutionStep(call!) === 'CALL', 'route call')
  assert(routeExecutionStep(steps.find((s) => s.intentCode === 'REPORT')!) === 'REPORTING', 'route report')
}

function testResolution(): void {
  assert(ADAPTER_RESOLUTION_KINDS.includes('exact'), 'exact')
  assert(ADAPTER_RESOLUTION_KINDS.includes('fallback'), 'fallback')
  assert(ADAPTER_RESOLUTION_KINDS.includes('unsupported'), 'unsupported')
  assert(ADAPTER_RESOLUTION_KINDS.includes('unavailable'), 'unavailable')
  assert(ADAPTER_RESOLUTION_KINDS.includes('conflict'), 'conflict')

  const empty = createAdapterRegistry([])
  const unavailable = resolveAdapterCapability('SEARCH', empty)
  assert(unavailable.kind === 'unavailable', 'unavailable kind')

  const withConflict = createAdapterRegistry([
    createAdapterMetadata({
      adapterId: 'a1',
      capability: 'SEARCH',
      name: 'A1',
      description: 'd',
      priority: 5,
      available: true,
    }),
    createAdapterMetadata({
      adapterId: 'a2',
      capability: 'SEARCH',
      name: 'A2',
      description: 'd',
      priority: 5,
      available: true,
    }),
  ])
  const conflict = resolveAdapterCapability('SEARCH', withConflict)
  assert(conflict.kind === 'conflict', 'conflict kind')

  const unsupported = resolveAdapterCapability('UNKNOWN', createAdapterRegistry([]))
  assert(unsupported.kind === 'unsupported', 'unsupported kind')

  // Fallback: CALL → COMMUNICATION when CALL adapter missing but COMMUNICATION present
  const fallbackRegistry = createAdapterRegistry([
    createAdapterMetadata({
      adapterId: 'comm-only',
      capability: 'COMMUNICATION',
      name: 'Comm',
      description: 'd',
      priority: 1,
      available: true,
    }),
  ])
  const fallback = resolveAdapterCapability('CALL', fallbackRegistry)
  assert(fallback.kind === 'fallback', 'fallback kind')
  assert(fallback.capability === 'COMMUNICATION', 'fallback target')
}

function testErrorModels(): void {
  for (const code of [
    'adapter_unavailable',
    'capability_unsupported',
    'invalid_mapping',
    'configuration_error',
  ] as const) {
    assert(ADAPTER_ERROR_CODES.includes(code), code)
  }
  assert(createUnavailableAdapterError('SEARCH').code === 'adapter_unavailable', 'unavail')
  assert(createUnsupportedCapabilityError('UNKNOWN').code === 'capability_unsupported', 'unsup')
  assert(createInvalidMappingError('bad').code === 'invalid_mapping', 'invalid')
  assert(createConfigurationAdapterError('cfg').code === 'configuration_error', 'cfg')
}

function testDocumentation(): void {
  const doc = resolve(
    process.cwd(),
    'docs/architecture/execution-adapter-foundation.md',
  )
  const gate = resolve(process.cwd(), 'docs/architecture/kc-0131-6-arch009-gate.md')
  assert(existsSync(doc), 'foundation doc')
  assert(existsSync(gate), 'arch009 gate')
}

function testNoExecution(): void {
  const { engine } = createExecutionAdapterFoundation()
  const steps = sampleSteps()
  for (const step of steps) {
    const mapping = validateExecutionStepMapping(step)
    assert(mapping.valid, `valid mapping ${step.id}`)
    const result = engine.adaptStep(step)
    assert(result.invokedService === false, `no invoke ${step.id}`)
    assert(result.performedWork === false, `no work ${step.id}`)
    assert(result.isPlaceholder === true, `placeholder ${step.id}`)
  }
}

const results = [
  run('registry integrity', testRegistryIntegrity),
  run('adapter contracts', testAdapterContracts),
  run('routing', testRouting),
  run('resolution', testResolution),
  run('error models', testErrorModels),
  run('documentation', testDocumentation),
  run('no execution', testNoExecution),
]

let failed = 0
for (const result of results) {
  const mark = result.passed ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}

console.log(
  `\nKC-0131.6 execution adapter foundation verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
