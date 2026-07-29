/**
 * KC-0131.7 — Service Integration Contracts verification.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  SERVICE_CAPABILITIES,
  SERVICE_DISCOVERY_STATUSES,
  SERVICE_ERROR_CODES,
  SERVICE_TRANSACTION_SCOPES,
  SERVICE_TRANSACTION_BOUNDARIES,
  assertCanonicalServiceCapabilityCoverage,
  createServiceDiscovery,
  createServiceIntegrationContractsFoundation,
  createServiceRegistry,
  createUnavailableServiceError,
  createCapabilityMismatchError,
  createConfigurationServiceError,
  createValidationServiceError,
  createInfrastructureServiceError,
  getTransactionBoundary,
  validateServiceInvocationRequest,
} from '../src/conversation/serviceContracts'

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
  const { engine } = createServiceIntegrationContractsFoundation()
  const contracts = engine.listContracts()
  assert(contracts.length > 0, 'contracts seeded')
  for (const contract of contracts) {
    assert(!!contract.serviceId, 'serviceId')
    assert(SERVICE_CAPABILITIES.includes(contract.capability), contract.capability)
    assert(contract.transactionScopes.length > 0, 'scopes')
    assert(contract.metadata.contractVersion === 'kc-0131.7', 'version')
  }
}

function testRegistryIntegrity(): void {
  assertCanonicalServiceCapabilityCoverage()
  assert(SERVICE_CAPABILITIES.includes('VISIT'), 'VISIT')
  assert(SERVICE_CAPABILITIES.includes('CAMPAIGN'), 'CAMPAIGN')
  assert(SERVICE_CAPABILITIES.includes('SETTINGS'), 'SETTINGS')
  const { registry } = createServiceIntegrationContractsFoundation()
  assert(registry.listCapabilities().length === SERVICE_CAPABILITIES.length, 'defs')
  assert(registry.listByCapability('COMMUNICATION').length >= 1, 'comm services')
  assert(registry.getById('assignmentService') != null, 'assignment descriptor')
}

function testDiscoveryModel(): void {
  for (const status of [
    'registered',
    'unavailable',
    'unsupported',
    'deprecated',
  ] as const) {
    assert(SERVICE_DISCOVERY_STATUSES.includes(status), status)
  }

  const { discovery } = createServiceIntegrationContractsFoundation()
  const registered = discovery.discoverByCapability('VISIT')
  assert(registered.status === 'registered', 'visit registered')
  assert(!!registered.serviceId, 'visit service')

  const unsupported = discovery.discoverByCapability('UNKNOWN')
  assert(unsupported.status === 'unsupported', 'unknown unsupported')

  const bare = createServiceDiscovery(createServiceRegistry([]))
  const unavailable = bare.discoverByCapability('SEARCH')
  assert(unavailable.status === 'unavailable', 'search unavailable')
}

function testInvocationContracts(): void {
  const { engine, invocation } = createServiceIntegrationContractsFoundation()
  const request = invocation.createRequest({
    capability: 'REPORTING',
    operation: 'default',
    transactionScope: 'single_action',
    payload: { sample: true },
  })
  assert(request.immutable === true, 'immutable request')
  assert(validateServiceInvocationRequest(request).valid, 'valid request')

  const result = invocation.placeholderResult(request)
  assert(result.isPlaceholder === true, 'placeholder')
  assert(result.invokedService === false, 'no invoke')
  assert(result.performedWork === false, 'no work')
  assert(result.immutable === true, 'immutable result')

  const simulated = engine.simulateInvocation('ATTENDANCE')
  assert(simulated.invokedService === false, 'simulate no invoke')
  assert(
    simulated.status === 'placeholder' || simulated.status === 'rejected',
    'status',
  )
}

function testTransactionModel(): void {
  for (const scope of [
    'single_action',
    'grouped_actions',
    'batch_execution',
    'compensating_action',
  ] as const) {
    assert(SERVICE_TRANSACTION_SCOPES.includes(scope), scope)
    assert(getTransactionBoundary(scope) != null, `boundary ${scope}`)
  }
  assert(SERVICE_TRANSACTION_BOUNDARIES.length === 4, 'four boundaries')
  assert(
    getTransactionBoundary('compensating_action')?.allowsCompensation === true,
    'compensation',
  )
}

function testDocumentation(): void {
  const doc = resolve(
    process.cwd(),
    'docs/architecture/service-integration-contracts.md',
  )
  const gate = resolve(process.cwd(), 'docs/architecture/kc-0131-7-arch009-gate.md')
  assert(existsSync(doc), 'foundation doc')
  assert(existsSync(gate), 'arch009 gate')
}

function testNoPlatformServiceImports(): void {
  const root = resolve(process.cwd(), 'src/conversation/serviceContracts')
  const files = [
    'index.ts',
    'contracts/index.ts',
    'registry/index.ts',
    'capabilities/definitions.ts',
    'discovery/index.ts',
    'invocation/index.ts',
    'services/index.ts',
  ]
  const forbidden = [
    /from\s+['"]@\/services/,
    /from\s+['"]\.\.\/\.\.\/\.\.\/services/,
    /from\s+['"]@\/repositories/,
    /from\s+['"]firebase/,
    /from\s+['"]react/,
    /firestore/i,
  ]
  for (const rel of files) {
    const text = readFileSync(resolve(root, rel), 'utf8')
    for (const pattern of forbidden) {
      assert(!pattern.test(text), `forbidden import in ${rel}: ${pattern}`)
    }
  }

  for (const code of SERVICE_ERROR_CODES) {
    assert(typeof code === 'string', code)
  }
  assert(createUnavailableServiceError('x').code === 'unavailable_service', 'unavail')
  assert(createCapabilityMismatchError('VISIT').code === 'capability_mismatch', 'mismatch')
  assert(createConfigurationServiceError('c').code === 'configuration_error', 'cfg')
  assert(createValidationServiceError('v').code === 'validation_error', 'val')
  assert(createInfrastructureServiceError('i').code === 'infrastructure_error', 'infra')
}

const results = [
  run('contract integrity', testContractIntegrity),
  run('registry integrity', testRegistryIntegrity),
  run('discovery model', testDiscoveryModel),
  run('invocation contracts', testInvocationContracts),
  run('transaction model', testTransactionModel),
  run('documentation', testDocumentation),
  run('no platform service imports', testNoPlatformServiceImports),
]

let failed = 0
for (const result of results) {
  const mark = result.passed ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}

console.log(
  `\nKC-0131.7 service integration contracts verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
